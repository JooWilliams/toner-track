import type * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Replace } from "lucide-react";
import { toast } from "sonner";
import { useCreateChange, usePrinters, useRecentChanges } from "@/hooks/queries";
import { PageHeader } from "@/components/PageHeader";
import { ComponentTag } from "@/components/ComponentTag";
import { YieldBadge } from "@/components/YieldBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatDateBR, formatNumber, printerLabel, todayISO } from "@/lib/format";
import type { ChangeInput } from "@/lib/types";

const initialForm = (): ChangeInput => ({
  printer_id: "",
  type: "toner",
  change_date: todayISO(),
  page_count: "",
  responsible: "",
  notes: "",
});

function RecentChanges() {
  const { data: recent = [] } = useRecentChanges(8);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Últimas trocas</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          <ul className="space-y-3">
            {recent.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{c.printer_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <ComponentTag type={c.type} />
                    <span className="text-xs text-muted-foreground">{formatDateBR(c.change_date)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <YieldBadge status={c.status} />
                  {c.pages_used != null && (
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">{formatNumber(c.pages_used)} pág.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function RegisterChange() {
  const navigate = useNavigate();
  const { data: printers = [], isLoading } = usePrinters();
  const create = useCreateChange();
  const [form, setForm] = useState<ChangeInput>(initialForm);

  const hasPrinters = printers.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.printer_id) {
      toast.error("Selecione a impressora.");
      return;
    }
    try {
      const created = await create.mutateAsync(form);
      const { status, pages_used, expected_yield } = created;
      if (status.level === "red") {
        toast.warning(
          `Rendimento abaixo do esperado: ${formatNumber(pages_used)} de ${formatNumber(expected_yield)} páginas.`,
          { duration: 7000 }
        );
      } else if (status.level === "yellow") {
        toast.warning(`Rendimento próximo do limite: ${formatNumber(pages_used)} páginas.`);
      } else if (pages_used != null) {
        toast.success(`Troca registrada — ${formatNumber(pages_used)} páginas rodadas (${status.label}).`);
      } else {
        toast.success("Troca registrada. Primeira troca deste componente — servirá de base para a próxima.");
      }
      // Keep printer/type/date for quick sequential entries; clear the rest.
      setForm((f) => ({ ...f, page_count: "", notes: "" }));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const set =
    (k: keyof ChangeInput) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        title="Registrar troca"
        description="Anote toda manutenção de toner ou cilindro. O rendimento é calculado automaticamente."
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
            <Replace className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm">Nova troca</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? null : !hasPrinters ? (
              <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-12 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  Você precisa cadastrar uma impressora antes de registrar trocas.
                </p>
                <Button onClick={() => navigate("/impressoras")}>Ir para impressoras</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="printer">
                      Impressora <span className="text-danger">*</span>
                    </Label>
                    <Select id="printer" value={form.printer_id} onChange={set("printer_id")} required>
                      <option value="" disabled>
                        Selecione
                      </option>
                      {printers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {printerLabel(p)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="type">
                      Tipo de troca <span className="text-danger">*</span>
                    </Label>
                    <Select id="type" value={form.type} onChange={set("type")}>
                      <option value="toner">Toner</option>
                      <option value="cilindro">Cilindro</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="date">
                      Data da troca <span className="text-danger">*</span>
                    </Label>
                    <Input id="date" type="date" value={form.change_date} onChange={set("change_date")} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="count">
                      Contador de páginas <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="count"
                      type="number"
                      min={0}
                      value={form.page_count}
                      onChange={set("page_count")}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="resp">Responsável</Label>
                  <Input id="resp" value={form.responsible ?? ""} onChange={set("responsible")} placeholder="Ex: João Silva" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" value={form.notes ?? ""} onChange={set("notes")} placeholder="Opcional" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending && <Spinner />}
                    Registrar troca
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <RecentChanges />
      </div>
    </div>
  );
}
