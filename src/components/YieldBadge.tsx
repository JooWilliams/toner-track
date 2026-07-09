import { cn } from "@/lib/utils";
import { yieldBadgeClass, yieldDotClass } from "@/lib/yield";
import type { YieldStatus } from "@/lib/types";
import { Badge } from "./ui/badge";

export function YieldBadge({ status, showDot = true }: { status: YieldStatus; showDot?: boolean }) {
  return (
    <Badge className={yieldBadgeClass[status.level]}>
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", yieldDotClass[status.level])} />}
      {status.label}
    </Badge>
  );
}
