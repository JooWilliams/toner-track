import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { FilterX, History as HistoryIcon, MessageSquareText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useChanges, useDeleteChange, usePrinters, useUpdateChange } from "@/hooks/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PageHeader } from "@/components/PageHeader";
import { ComponentTag } from "@/components/ComponentTag";
import { YieldBadge } from "@/components/YieldBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LoadingBlock, Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateBR, formatNumber, formatPercent, printerLabel } from "@/lib/format";
import type { Change, ChangeFilters, ChangeInput } from "@/lib/types";

const BLANK: ChangeFilters = { printerId: "", type: "", from: "", to: "", responsible: "" };
const PAGE_SIZE = 50;

function ChangeEditDialog({ change, onClose }: { change: Change | null; onClose: () => void }) {
  const update = useUpdateChange();
  const [form, setForm] = useState<ChangeInput>({
    printer_id: "",
    type: "toner",
    change_date: "",
    page_count: "",
    responsible: "",
    notes: "",
  });

  useEffect(() => {
    if (change) {
      setForm({
        printer_id: change.printer_id,
        type: change.type,
        change_date: change.change_date,
        page_count: change.page_count,
        responsible: change.responsible ?? "",
        notes: change.notes ?? "",
      });
    }
  }, [change]);

  const set =
    (key: keyof ChangeInput) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!change) return;
    try {
      await update.mutateAsync({ id: change.id, data: form });
      toast.success("Troca atualizada. O rendimento dos registros seguintes foi recalculado.");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Dialog
      open={!!change}
      onClose={onClose}
      title="Editar troca"
      description="A alteração fica registrada na auditoria e pode recalcular os rendimentos posteriores."
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button form="change-edit-form" type="submit" disabled={update.isPending}>
            {update.isPending && <Spinner />}
            Salvar alterações
          </Button>
        </>
      }
    >
      <form id="change-edit-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-type">Componente</Label>
            <Select id="edit-type" value={form.type} onChange={set("type")}>
              <option value="toner">Toner</option>
              <option value="cilindro">Cilindro</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-date">Data</Label>
            <Input id="edit-date" type="date" value={form.change_date} onChange={set("change_date")} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-count">Contador de páginas</Label>
            <Input id="edit-count" type="number" min={0} value={form.page_count} onChange={set("page_count")} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-responsible">Responsável</Label>
            <Input id="edit-responsible" value={form.responsible ?? ""} onChange={set("responsible")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-notes">Observações</Label>
          <Input id="edit-notes" value={form.notes ?? ""} onChange={set("notes")} />
        </div>
      </form>
    </Dialog>
  );
}

export default function History() {
  const [filters, setFilters] = useState<ChangeFilters>(BLANK);
  const [offset, setOffset] = useState(0);
  const { data: printers = [] } = usePrinters();
  const del = useDeleteChange();
  const [toDelete, setToDelete] = useState<Change | null>(null);
  const [toEdit, setToEdit] = useState<Change | null>(null);

  const debouncedResp = useDebouncedValue(filters.responsible ?? "");
  const effective: ChangeFilters = useMemo(
    () => ({
      printerId: filters.printerId || undefined,
      type: filters.type || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      responsible: debouncedResp || undefined,
    }),
    [filters.printerId, filters.type, filters.from, filters.to, debouncedResp]
  );

  const { data, isLoading } = useChanges(effective, PAGE_SIZE, offset);
  const changes = data?.items ?? [];
  const hasFilters = Object.values(effective).some(Boolean);

  const set = (k: keyof ChangeFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setOffset(0);
    setFilters((f) => ({ ...f, [k]: e.target.value }));
  };

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success("Troca removida.");
      setToDelete(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Histórico"
        description="Páginas rodadas mede o rendimento do componente; páginas impressas conta cada avanço do contador uma única vez."
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Impressora</Label>
            <Select value={filters.printerId} onChange={set("printerId")}>
              <option value="">Todas</option>
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {printerLabel(p)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Componente</Label>
            <Select value={filters.type} onChange={set("type")}>
              <option value="">Todos</option>
              <option value="toner">Toner</option>
              <option value="cilindro">Cilindro</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>De</Label>
            <Input type="date" value={filters.from} onChange={set("from")} />
          </div>
          <div className="space-y-1.5">
            <Label>Até</Label>
            <Input type="date" value={filters.to} onChange={set("to")} />
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Input value={filters.responsible} onChange={set("responsible")} placeholder="Buscar…" />
          </div>
        </div>
        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setFilters(BLANK); setOffset(0); }}>
              <FilterX className="h-4 w-4" />
              Limpar filtros
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <div className="border-b border-border p-4">
          <p className="text-sm font-semibold">{data?.total ?? changes.length} registro(s)</p>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : changes.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title="Nenhum registro encontrado."
            description={hasFilters ? "Ajuste os filtros para ver outras trocas." : "Registre trocas para começar a acompanhar o rendimento."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Impressora</TableHead>
                <TableHead>Componente</TableHead>
                <TableHead className="text-right">Contador</TableHead>
                <TableHead className="text-right">Páginas rodadas</TableHead>
                <TableHead className="text-right" title="Avanço desde a leitura anterior do contador desta impressora">
                  Páginas impressas
                </TableHead>
                <TableHead>Rendimento</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDateBR(c.change_date)}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{c.printer_name}</div>
                    {c.printer_location && <div className="text-xs text-muted-foreground">{c.printer_location}</div>}
                  </TableCell>
                  <TableCell>
                    <ComponentTag type={c.type} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(c.page_count)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.pages_used != null ? formatNumber(c.pages_used) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.pages_printed != null ? formatNumber(c.pages_printed) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <YieldBadge status={c.status} />
                      {c.status.ratio != null && (
                        <span className="text-xs tabular-nums text-muted-foreground">{formatPercent(c.status.ratio)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{c.responsible || "—"}</span>
                      {c.notes && <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground/70" aria-label={c.notes} />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToEdit(c)}
                        aria-label="Editar troca"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(c)}
                        aria-label="Remover troca"
                        className="text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!isLoading && changes.length > 0 && (
          <div className="flex items-center justify-between border-t border-border p-4 text-sm">
            <span className="text-muted-foreground">
              Exibindo {offset + 1}–{Math.min(offset + changes.length, data?.total ?? 0)} de {data?.total ?? 0}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= (data?.total ?? 0)}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ChangeEditDialog change={toEdit} onClose={() => setToEdit(null)} />
      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Remover troca"
        description={
          toDelete
            ? `Remover a troca de ${toDelete.type} de ${toDelete.printer_name} em ${formatDateBR(toDelete.change_date)}? O rendimento das trocas seguintes será recalculado.`
            : ""
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={del.isPending}>
              {del.isPending && <Spinner />}
              Remover
            </Button>
          </>
        }
      />
    </div>
  );
}
