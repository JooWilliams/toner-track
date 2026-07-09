import type {
  Change,
  ChangeFilters,
  ChangeInput,
  DashboardData,
  Printer,
  PrinterInput,
  PrinterStat,
} from "./types";

export function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== "");
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`).join("&");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  printers: {
    list: (q?: string) => request<Printer[]>(`/printers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    create: (data: PrinterInput) =>
      request<Printer>("/printers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: PrinterInput) =>
      request<Printer>(`/printers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/printers/${id}`, { method: "DELETE" }),
  },
  changes: {
    list: (filters: ChangeFilters = {}) => request<Change[]>(`/changes${qs(filters)}`),
    recent: (limit = 8) => request<Change[]>(`/changes/recent?limit=${limit}`),
    create: (data: ChangeInput) =>
      request<Change>("/changes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: ChangeInput) =>
      request<Change>(`/changes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/changes/${id}`, { method: "DELETE" }),
  },
  dashboard: () => request<DashboardData>("/dashboard"),
  printerStats: () => request<PrinterStat[]>("/stats/printers"),
};

export const reportUrl = (kind: "excel" | "pdf", filters?: ChangeFilters) =>
  `/api/reports/${kind}${filters ? qs(filters) : ""}`;

export const backupUrl = () => "/api/backup";
