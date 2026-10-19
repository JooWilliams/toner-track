import { NavLink } from "react-router-dom";
import { FileText, History, LayoutGrid, LogOut, Printer, Replace, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "./AuthGate";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/impressoras", label: "Impressoras", icon: Printer },
  { to: "/registrar", label: "Registrar troca", icon: Replace },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/auditoria", label: "Auditoria", icon: ScrollText },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
];

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-900/40">
        <Printer className="h-5 w-5 text-white" />
      </div>
      <div className="leading-tight">
        <p className="font-bold">TonerTrack</p>
        <p className="text-xs text-sidebar-muted">Controle de suprimentos</p>
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { username, logout } = useAuth();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarBrand />

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-white shadow-sm shadow-indigo-900/30"
                    : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground"
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-sidebar-border p-4">
          <ThemeToggle />
          <div className="flex items-center justify-between gap-2 px-1 text-xs text-sidebar-muted">
            <span className="truncate">Conectado como {username}</span>
            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Sair"
              className="rounded p-1 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 px-1 text-xs text-sidebar-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
            </span>
            Rendimento monitorado em tempo real.
          </div>
        </div>
      </aside>
    </>
  );
}
