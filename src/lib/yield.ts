import type { YieldLevel } from "./types";

// Tailwind classes for the coloured yield indicators (🟢 🟡 🔴 / neutral).
export const yieldBadgeClass: Record<YieldLevel, string> = {
  green: "bg-success-soft text-success border border-success/30",
  yellow: "bg-warning-soft text-warning border border-warning/30",
  red: "bg-danger-soft text-danger border border-danger/30",
  neutral: "bg-muted text-muted-foreground border border-border",
};

export const yieldDotClass: Record<YieldLevel, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-danger",
  neutral: "bg-muted-foreground/40",
};

// Hex values mirrored for Recharts (which needs concrete colours, not classes).
export const LEVEL_HEX: Record<YieldLevel, string> = {
  green: "#059669",
  yellow: "#d97706",
  red: "#dc2626",
  neutral: "#9ca3af",
};

export const CHART_COLORS = {
  paginas: "#4f46e5", // indigo
  toners: "#0d9488", // teal
  cilindros: "#f59e0b", // amber
};
