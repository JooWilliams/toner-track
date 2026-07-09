import type * as React from "react";
import { useEffect, useState } from "react";
import { Pencil, Plus, Printer as PrinterIcon, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCreatePrinter,
  useDeletePrinter,
  usePrinters,
  useUpdatePrinter,
} from "@/hooks/queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock, Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import type { Printer, PrinterInput } from "@/lib/types";

const EMPTY: PrinterInput = {
  name: "",
  location: "",
  model: "",
  expected_toner_yield: "",
  expected_drum_yield: "",
};

function PrinterFormDialog({
  open,
  onClose,
  printer,
}: {
  open: boolean;
  onClose: () => void;
  printer: Printer | null;
}) {
  const editing = !!printer;
  const create = useCreatePrinter();
  const update = useUpdatePrinter();
  const [form, setForm] = useState<PrinterInput>(EMPTY);

  useEffect(() => {
    if (open) {
      setForm(
        printer
          ? {
              name: printer.name,
              location: printer.location ?? "",
              model: printer.model ?? "",
              expected_toner_yield: printer.expected_toner_yield ?? "",
              expected_drum_yield: printer.expected_drum_yield ?? "",
            }
          : EMPTY
      );
    }
  }, [open, printer]);

  const saving = create.isPending || update.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) await update.mutateAsync({ id: printer!.id, data: form });
      else await create.mutateAsync(form);
      toast.success(editing ? "Impressora atualizada." : "Impressora cadastrada.");
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const set = (k: keyof PrinterInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Editar impressora" : "Nova impressora"}
      description="Defina os dados e o rendimento esperado (em páginas) de cada componente."
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button form="printer-form" type="submit" disabled={saving}>
            {saving && <Spinner />}
            {editing ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </>
      }
    >
      <form id="printer-form" onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Nome / identificação <span className="text-danger">*</span>
          </Label>
          <Input id="name" value={form.name} onChange={set("name")} placeholder="Ex: HP LaserJet — Recepção" required autoFocus />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="location">Localização</Label>
            <Input id="location" value={form.location ?? ""} onChange={set("location")} placeholder="Ex: Recepção" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">Modelo</Label>
            <Input id="model" value={form.model ?? ""} onChange={set("model")} placeholder="Ex: HP M428fdw" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="et">Rendimento esperado do toner</Label>
            <Input id="et" type="number" min={0} value={form.expected_toner_yield ?? ""} onChange={set("expected_toner_yield")} placeholder="Ex: 3000" />
            <p className="text-xs text-muted-foreground">páginas (opcional)</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed">Rendimento esperado do cilindro</Label>
            <Input id="ed" type="number" min={0} value={form.expected_drum_yield ?? ""} onChange={set("expected_drum_yield")} placeholder="Ex: 12000" />
            <p className="text-xs text-muted-foreground">páginas (opcional)</p>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

export default function Printers() {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const { data: printers = [], isLoading } = usePrinters(debounced || undefined);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Printer | null>(null);
  const [toDelete, setToDelete] = useState<Printer | null>(null);
  const del = useDeletePrinter();

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(p: Printer) {
    setEditing(p);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success("Impressora removida.");
      setToDelete(null);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Impressoras"
        description="Cadastre impressoras e defina o rendimento esperado de toner e cilindro."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Nova impressora
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">Todas as impressoras ({printers.length})</p>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, local ou modelo…"
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingBlock />
        ) : printers.length === 0 ? (
          <EmptyState
            icon={PrinterIcon}
            title={debounced ? "Nenhuma impressora encontrada." : "Nenhuma impressora cadastrada."}
            description={debounced ? `Nada corresponde a “${debounced}”.` : "Cadastre a primeira impressora para começar a registrar trocas."}
            action={
              !debounced ? (
                <Button onClick={openNew} variant="outline">
                  <Plus className="h-4 w-4" />
                  Cadastrar impressora
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Toner esperado</TableHead>
                <TableHead className="text-right">Cilindro esperado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {printers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(p.toner_changes ?? 0) + (p.drum_changes ?? 0)} trocas registradas
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.location || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.model || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.expected_toner_yield ? formatNumber(p.expected_toner_yield) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.expected_drum_yield ? formatNumber(p.expected_drum_yield) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(p)}
                        aria-label="Remover"
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
      </Card>

      <PrinterFormDialog open={formOpen} onClose={() => setFormOpen(false)} printer={editing} />

      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Remover impressora"
        description={`Isso apaga “${toDelete?.name}” e todas as suas trocas registradas. Esta ação não pode ser desfeita.`}
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
