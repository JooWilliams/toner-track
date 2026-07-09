import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ChangeFilters, ChangeInput, PrinterInput } from "@/lib/types";

export const qk = {
  printers: (q?: string) => ["printers", q ?? ""] as const,
  dashboard: ["dashboard"] as const,
  printerStats: ["printerStats"] as const,
  changes: (f: ChangeFilters) => ["changes", f] as const,
  recent: (limit: number) => ["recentChanges", limit] as const,
};

export function usePrinters(q?: string) {
  return useQuery({ queryKey: qk.printers(q), queryFn: () => api.printers.list(q) });
}

export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard, queryFn: api.dashboard });
}

export function usePrinterStats() {
  return useQuery({ queryKey: qk.printerStats, queryFn: api.printerStats });
}

export function useChanges(filters: ChangeFilters) {
  return useQuery({ queryKey: qk.changes(filters), queryFn: () => api.changes.list(filters) });
}

export function useRecentChanges(limit = 8) {
  return useQuery({ queryKey: qk.recent(limit), queryFn: () => api.changes.recent(limit) });
}

// Any mutation touches derived aggregates, so we refresh everything relevant.
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    for (const key of ["printers", "dashboard", "printerStats", "changes", "recentChanges"]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useCreatePrinter() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (data: PrinterInput) => api.printers.create(data), onSuccess: invalidate });
}

export function useUpdatePrinter() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PrinterInput }) => api.printers.update(id, data),
    onSuccess: invalidate,
  });
}

export function useDeletePrinter() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: number) => api.printers.remove(id), onSuccess: invalidate });
}

export function useCreateChange() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (data: ChangeInput) => api.changes.create(data), onSuccess: invalidate });
}

export function useUpdateChange() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ChangeInput }) => api.changes.update(id, data),
    onSuccess: invalidate,
  });
}

export function useDeleteChange() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: number) => api.changes.remove(id), onSuccess: invalidate });
}
