import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { h } from "../lib/http.js";
import { fetchEnrichedChanges } from "../lib/enriched.js";
import { computePrinterStats, computeSummary } from "../lib/stats.js";

const router = Router();

const COMPONENT = { toner: "Toner", cilindro: "Cilindro" };
const LEVEL_HEX = { green: "#059669", yellow: "#D97706", red: "#DC2626", neutral: "#6B7280" };

function formatBR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
function nowBR() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function filtersFromQuery(q) {
  return { printerId: q.printerId, type: q.type, from: q.from, to: q.to, responsible: q.responsible };
}

/* ----------------------------------- Excel ---------------------------------- */

router.get(
  "/excel",
  h(async (req, res) => {
    const changes = fetchEnrichedChanges(filtersFromQuery(req.query));
    const printerStats = computePrinterStats();
    const summary = computeSummary();

    const wb = new ExcelJS.Workbook();
    wb.creator = "TonerTrack";
    wb.created = new Date();

    const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    const styleHeader = (row) => {
      row.font = { bold: true, color: { argb: "FFFFFFFF" } };
      row.eachCell((cell) => (cell.fill = headerFill));
    };

    // --- Resumo ---
    const resumo = wb.addWorksheet("Resumo");
    resumo.columns = [{ width: 34 }, { width: 26 }];
    resumo.addRow(["TonerTrack — Relatório de suprimentos"]).font = { bold: true, size: 14 };
    resumo.addRow([`Gerado em: ${nowBR()}`]).font = { italic: true, color: { argb: "FF6B7280" } };
    resumo.addRow([]);
    styleHeader(resumo.addRow(["Indicador", "Valor"]));
    resumo.addRow(["Páginas impressas (período monitorado)", summary.pages_printed]);
    resumo.addRow(["Toners substituídos", summary.toners_replaced]);
    resumo.addRow(["Cilindros substituídos", summary.drums_replaced]);
    resumo.addRow(["Média de páginas por toner", summary.avg_pages_toner]);
    resumo.addRow(["Média de páginas por cilindro", summary.avg_pages_drum]);
    resumo.addRow(["Impressoras cadastradas", summary.printers_count]);
    resumo.addRow([
      "Maior volume de impressão",
      summary.top_volume_printer ? `${summary.top_volume_printer.name} (${summary.top_volume_printer.pages} pág.)` : "—",
    ]);
    resumo.addRow([
      "Maior consumo de toner",
      summary.top_toner_printer ? `${summary.top_toner_printer.name} (${summary.top_toner_printer.count} trocas)` : "—",
    ]);

    // --- Histórico ---
    const hist = wb.addWorksheet("Histórico");
    hist.columns = [
      { header: "Data", key: "data", width: 12 },
      { header: "Impressora", key: "impressora", width: 24 },
      { header: "Localização", key: "local", width: 18 },
      { header: "Componente", key: "componente", width: 12 },
      { header: "Contador", key: "contador", width: 12 },
      { header: "Páginas rodadas", key: "paginas", width: 15 },
      { header: "Rendimento esperado", key: "esperado", width: 18 },
      { header: "Situação", key: "situacao", width: 20 },
      { header: "Responsável", key: "responsavel", width: 18 },
      { header: "Observações", key: "obs", width: 30 },
    ];
    styleHeader(hist.getRow(1));
    for (const c of changes) {
      hist.addRow({
        data: formatBR(c.change_date),
        impressora: c.printer_name,
        local: c.printer_location || "",
        componente: COMPONENT[c.type],
        contador: c.page_count,
        paginas: c.pages_used ?? "—",
        esperado: c.expected_yield ?? "—",
        situacao: c.status.label,
        responsavel: c.responsible || "",
        obs: c.notes || "",
      });
    }

    // --- Por impressora ---
    const perP = wb.addWorksheet("Por impressora");
    perP.columns = [
      { header: "Impressora", key: "name", width: 24 },
      { header: "Localização", key: "location", width: 18 },
      { header: "Modelo", key: "model", width: 18 },
      { header: "Toners", key: "toners", width: 10 },
      { header: "Cilindros", key: "cilindros", width: 10 },
      { header: "Páginas", key: "pages", width: 12 },
      { header: "Média toner", key: "avg_toner", width: 12 },
      { header: "Média cilindro", key: "avg_drum", width: 13 },
      { header: "Toner esperado", key: "et", width: 14 },
      { header: "Cilindro esperado", key: "ed", width: 15 },
    ];
    styleHeader(perP.getRow(1));
    for (const p of printerStats) {
      perP.addRow({
        name: p.name,
        location: p.location || "",
        model: p.model || "",
        toners: p.toners,
        cilindros: p.cilindros,
        pages: p.pages,
        avg_toner: p.avg_toner,
        avg_drum: p.avg_drum,
        et: p.expected_toner_yield ?? "—",
        ed: p.expected_drum_yield ?? "—",
      });
    }

    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="tonertrack-${stamp}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  })
);

/* ------------------------------------ PDF ----------------------------------- */

function drawTable(doc, { columns, rows, startY }) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const usable = right - left;
  const totalW = columns.reduce((a, c) => a + c.w, 0);
  const widths = columns.map((c) => (usable * c.w) / totalW);
  const rowH = 16;
  const pad = 4;
  let y = startY;

  const drawHeader = () => {
    doc.save().rect(left, y, usable, rowH).fill("#EEF2FF").restore();
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#3730A3");
    let x = left;
    columns.forEach((c, i) => {
      doc.text(c.label, x + pad, y + 4.5, { width: widths[i] - pad * 2, lineBreak: false, ellipsis: true });
      x += widths[i];
    });
    y += rowH;
  };

  drawHeader();
  for (const r of rows) {
    if (y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
    }
    let x = left;
    doc.font("Helvetica").fontSize(7.5);
    columns.forEach((c, i) => {
      const raw = typeof c.value === "function" ? c.value(r) : r[c.key];
      doc.fillColor(c.color ? c.color(r) : "#1F2937");
      doc.text(raw == null || raw === "" ? "—" : String(raw), x + pad, y + 4.5, {
        width: widths[i] - pad * 2,
        lineBreak: false,
        ellipsis: true,
      });
      x += widths[i];
    });
    doc.moveTo(left, y + rowH).lineTo(right, y + rowH).lineWidth(0.5).strokeColor("#E5E7EB").stroke();
    y += rowH;
  }
  return y;
}

router.get(
  "/pdf",
  h((req, res) => {
    const changes = fetchEnrichedChanges(filtersFromQuery(req.query));
    const printerStats = computePrinterStats();
    const summary = computeSummary();

    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="tonertrack-${stamp}.pdf"`);
    doc.pipe(res);

    // Header band
    doc.rect(0, 0, doc.page.width, 54).fill("#4F46E5");
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(18).text("TonerTrack", 36, 14);
    doc.font("Helvetica").fontSize(9).fillColor("#E0E7FF").text("Relatório de suprimentos", 36, 34);
    doc.fontSize(9).fillColor("#E0E7FF").text(`Gerado em ${nowBR()}`, 0, 20, {
      align: "right",
      width: doc.page.width - 36,
    });
    doc.fillColor("#1F2937");

    // KPIs
    let y = 74;
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Resumo geral", 36, y);
    y += 20;
    const kpis = [
      ["Páginas impressas", summary.pages_printed],
      ["Toners substituídos", summary.toners_replaced],
      ["Cilindros substituídos", summary.drums_replaced],
      ["Média pág./toner", summary.avg_pages_toner],
      ["Média pág./cilindro", summary.avg_pages_drum],
      ["Impressoras", summary.printers_count],
    ];
    const cardW = (doc.page.width - 72 - 5 * 10) / 6;
    kpis.forEach((k, i) => {
      const x = 36 + i * (cardW + 10);
      doc.save().roundedRect(x, y, cardW, 46, 6).fill("#F5F3FF").restore();
      doc.font("Helvetica").fontSize(7.5).fillColor("#6B7280").text(k[0], x + 8, y + 8, { width: cardW - 16 });
      doc.font("Helvetica-Bold").fontSize(15).fillColor("#4338CA").text(Number(k[1]).toLocaleString("pt-BR"), x + 8, y + 22, {
        width: cardW - 16,
      });
    });
    y += 66;

    // Per-printer table
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Estatísticas por impressora", 36, y);
    y += 16;
    y = drawTable(doc, {
      startY: y,
      columns: [
        { label: "Impressora", key: "name", w: 3 },
        { label: "Localização", key: "location", w: 2.2 },
        { label: "Modelo", key: "model", w: 2.2 },
        { label: "Toners", key: "toners", w: 1 },
        { label: "Cilindros", key: "cilindros", w: 1.1 },
        { label: "Páginas", key: "pages", w: 1.3 },
        { label: "Méd. toner", key: "avg_toner", w: 1.3 },
        { label: "Méd. cilindro", key: "avg_drum", w: 1.4 },
      ],
      rows: printerStats,
    });
    y += 18;

    // History table
    if (y + 60 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text("Histórico de trocas", 36, y);
    y += 16;
    drawTable(doc, {
      startY: y,
      columns: [
        { label: "Data", key: "change_date", w: 1.3, value: (r) => formatBR(r.change_date) },
        { label: "Impressora", key: "printer_name", w: 2.6 },
        { label: "Componente", key: "type", w: 1.4, value: (r) => COMPONENT[r.type] },
        { label: "Contador", key: "page_count", w: 1.3, value: (r) => r.page_count.toLocaleString("pt-BR") },
        { label: "Págs. rodadas", key: "pages_used", w: 1.5, value: (r) => (r.pages_used ?? "—") },
        { label: "Esperado", key: "expected_yield", w: 1.3, value: (r) => (r.expected_yield ?? "—") },
        {
          label: "Situação",
          key: "situacao",
          w: 2,
          value: (r) => r.status.label,
          color: (r) => LEVEL_HEX[r.status.level] || "#1F2937",
        },
        { label: "Responsável", key: "responsible", w: 1.8 },
      ],
      rows: changes,
    });

    doc.end();
  })
);

export default router;
