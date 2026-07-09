import { Disc3, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentType } from "@/lib/types";

const META = {
  toner: { icon: Droplet, label: "Toner", cls: "text-teal-600 dark:text-teal-400 bg-teal-500/10" },
  cilindro: { icon: Disc3, label: "Cilindro", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
} as const;

export function ComponentTag({ type }: { type: ComponentType }) {
  const meta = META[type];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium", meta.cls)}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}
