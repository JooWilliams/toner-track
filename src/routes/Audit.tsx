import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingBlock } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatTimestampBR } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

const PAGE_SIZE = 50;
const ACTIONS: Record<string, string> = {
  create: "Criou",
  update: "Editou",
  delete: "Removeu",
  login: "Entrou",
  logout: "Saiu",
  setup: "Configurou a conta",
  backup: "Gerou backup",
};
const ENTITIES: Record<string, string> = {
  printer: "impressora",
  change: "troca",
  account: "conta",
  database: "banco de dados",
};

function AuditDetails({ entry }: { entry: AuditEntry }) {
  if (!entry.before && !entry.after) return null;
  return (
    <details className="mt-1 text-xs">
      <summary className="cursor-pointer text-primary">Ver valores registrados</summary>
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        {entry.before && (
          <pre className="overflow-auto rounded bg-muted p-2">
            Antes: {JSON.stringify(entry.before, null, 2)}
          </pre>
        )}
        {entry.after && (
          <pre className="overflow-auto rounded bg-muted p-2">
            Depois: {JSON.stringify(entry.after, null, 2)}
          </pre>
        )}
      </div>
    </details>
  );
}

export default function Audit() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["audit", offset],
    queryFn: () => api.audit(PAGE_SIZE, offset),
  });
  const entries = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Registro cronológico de acessos, backups e alterações nos dados."
      />
      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <Card className="p-6 text-sm text-danger">Não foi possível carregar a auditoria: {(error as Error).message}</Card>
      ) : entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nenhuma alteração registrada." description="As próximas operações aparecerão aqui." />
      ) : (
        <Card>
          <div className="border-b border-border p-4">
            <p className="text-sm font-semibold">{data!.total} evento(s)</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data e hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">{formatTimestampBR(entry.created_at)}</TableCell>
                  <TableCell>{entry.actor}</TableCell>
                  <TableCell>{ACTIONS[entry.action] ?? entry.action}</TableCell>
                  <TableCell>
                    <span>
                      {ENTITIES[entry.entity] ?? entry.entity}
                      {entry.entity_id != null ? ` #${entry.entity_id}` : ""}
                    </span>
                    <AuditDetails entry={entry} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border p-4 text-sm">
            <span className="text-muted-foreground">
              Exibindo {offset + 1}–{Math.min(offset + entries.length, data!.total)} de {data!.total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + PAGE_SIZE >= data!.total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
