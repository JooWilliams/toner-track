import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-lg border border-sidebar-border bg-white/5 px-3 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-white/10"
      aria-label="Alternar tema"
    >
      <span className="flex items-center gap-2">
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        Tema {isDark ? "escuro" : "claro"}
      </span>
      <span className="relative inline-flex h-4 w-7 items-center rounded-full bg-sidebar-accent/40">
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            isDark ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
