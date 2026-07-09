export type ComponentType = "toner" | "cilindro";
export type YieldLevel = "green" | "yellow" | "red" | "neutral";

export interface YieldStatus {
  level: YieldLevel;
  code: string;
  label: string;
  ratio: number | null;
}

export interface Printer {
  id: number;
  name: string;
  location: string | null;
  model: string | null;
  expected_toner_yield: number | null;
  expected_drum_yield: number | null;
  created_at: string;
  updated_at: string;
  toner_changes?: number;
  drum_changes?: number;
  last_count?: number | null;
  last_change_date?: string | null;
}

export interface Change {
  id: number;
  printer_id: number;
  printer_name: string;
  printer_location: string | null;
  printer_model: string | null;
  type: ComponentType;
  change_date: string;
  page_count: number;
  prev_count: number | null;
  pages_used: number | null;
  expected_yield: number | null;
  responsible: string | null;
  notes: string | null;
  status: YieldStatus;
  created_at: string;
  updated_at: string;
}

export interface SeriesPoint {
  key: string;
  paginas: number;
  toners: number;
  cilindros: number;
}

export interface DashboardData {
  totals: {
    printers_count: number;
    toners_replaced: number;
    drums_replaced: number;
    pages_printed: number;
    avg_pages_toner: number;
    avg_pages_drum: number;
    top_volume_printer: { name: string; pages: number } | null;
    top_toner_printer: { name: string; count: number } | null;
  };
  monthly: SeriesPoint[];
  yearly: SeriesPoint[];
}

export interface PrinterStat {
  printer_id: number;
  name: string;
  location: string | null;
  model: string | null;
  expected_toner_yield: number | null;
  expected_drum_yield: number | null;
  toners: number;
  cilindros: number;
  pages: number;
  avg_toner: number;
  avg_drum: number;
}

export interface PrinterInput {
  name: string;
  location?: string | null;
  model?: string | null;
  expected_toner_yield?: number | string | null;
  expected_drum_yield?: number | string | null;
}

export interface ChangeInput {
  printer_id: number | string;
  type: ComponentType;
  change_date: string;
  page_count: number | string;
  responsible?: string | null;
  notes?: string | null;
}

export type ChangeFilters = {
  printerId?: string;
  type?: string;
  from?: string;
  to?: string;
  responsible?: string;
};
