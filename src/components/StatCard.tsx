import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";

type Tone = "indigo" | "teal" | "amber" | "emerald" | "rose" | "slate";

const tones: Record<Tone, string> = {
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
}

export function StatCard({ icon: Icon, label, value, hint, tone = "indigo" }: StatCardProps) {
  return (
    <Card className="p-4 transition-shadow hover:shadow-card-hover">
      <div className="flex min-h-[2.25rem] items-start gap-2 text-xs font-medium text-muted-foreground">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="leading-tight">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
