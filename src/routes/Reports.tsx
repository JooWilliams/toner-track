import type * as React from "react";
import { DatabaseBackup, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePrinterStats } from "@/hooks/queries";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, backupUrl, reportUrl } from "@/lib/api";
import { formatNumber, formatTimestampBR } from "@/lib/format";

function download(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface ExportCardProps {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}

function ExportCard({ icon: Icon, tone, title, description, cta, onClick }: ExportCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Icon className={`h-5 w-5 ${tone}`} />
        <h3 className="font-semibold">{title}</h3>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button variant="outline" onClick={onClick} className="mt-auto">
          <Download className="h-4 w-4" />
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const { data: stats = [], isLoading } = usePrinterStats();
  const { data: backupStatus, refetch: refreshBackupStatus } = useQuery({
    queryKey: ["backupStatus"],
    queryFn: api.backupStatus,
  });

  async function downloadBackup() {
    try {
      const response = await fetch(backupUrl());
      if (!response.ok) {
        let message = `Erro ${response.status}`;
        try {
          const body = await response.json();
          if (body?.error) message = body.error;
        } catch {
          // A resposta pode não ser JSON quando o servidor falha.
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `tonertrack-backup-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.db`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      await refreshBackupStatus();
      toast.success("Backup do banco gerado.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader title="Relatórios" description="Exporte o histórico e as estatísticas para PDF ou Excel." />

      <div className="grid gap-4 md:grid-cols-3">
        <ExportCard
          icon={FileSpreadsheet}
          tone="text-emerald-600 dark:text-emerald-400"
          title="Exportar Excel"
          description="Planilha .xlsx com resumo, histórico completo de trocas e estatísticas por impressora."
          cta="Baixar .xlsx"
          onClick={() => download(reportUrl("excel"))}
        />
        <ExportCard
          icon={FileText}
          tone="text-rose-600 dark:text-rose-400"
          title="Exportar PDF"
          description="Relatório impresso com resumo geral, estatísticas por impressora e todas as trocas."
          cta="Baixar .pdf"
          onClick={() => download(reportUrl("pdf"))}
        />
        <ExportCard
          icon={DatabaseBackup}
          tone="text-indigo-600 dark:text-indigo-400"
          title="Backup do banco"
          description={`Baixe uma cópia consistente do banco (.db). Último backup: ${backupStatus?.last_backup_at ? formatTimestampBR(backupStatus.last_backup_at) : "nunca"}.`}
          cta="Baixar backup"
          onClick={() => void downloadBackup()}
        />
      </div>

      <Card className="mt-5">
        <div className="border-b border-border p-4">
          <p className="text-sm font-semibold">Prévia — Estatísticas por impressora</p>
        </div>
        {isLoading ? (
          <LoadingBlock />
        ) : stats.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title="Sem dados para exibir." description="Cadastre impressoras e registre trocas para gerar estatísticas." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Impressora</TableHead>
                <TableHead className="text-right">Toners</TableHead>
                <TableHead className="text-right">Cilindros</TableHead>
                <TableHead className="text-right">Páginas</TableHead>
                <TableHead className="text-right">Média toner</TableHead>
                <TableHead className="text-right">Média cilindro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s) => (
                <TableRow key={s.printer_id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{s.name}</div>
                    {s.location && <div className="text-xs text-muted-foreground">{s.location}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(s.toners)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(s.cilindros)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(s.pages)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(s.avg_toner)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(s.avg_drum)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
