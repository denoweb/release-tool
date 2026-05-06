import { type LucideIcon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const accents = {
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-violet-500",
  teal: "bg-teal-500",
  amber: "bg-amber-500",
} as const;

export type StatAccent = keyof typeof accents;

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent: StatAccent;
  delta?: { value: string; positive?: boolean; suffix?: string };
}

export function StatCard({ label, value, icon: Icon, accent, delta }: StatCardProps) {
  return (
    <div className="rounded-md bg-card p-4 shadow-md border-2 border-border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold mt-0.5 tabular-nums">{value}</p>
        </div>
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0",
            accents[accent],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {delta && (
        <p className="mt-4 text-xs flex items-center gap-1">
          <TrendingUp
            className={cn(
              "h-3 w-3",
              delta.positive === false
                ? "text-rose-500 rotate-180"
                : "text-emerald-500",
            )}
          />
          <span
            className={cn(
              "font-medium",
              delta.positive === false ? "text-rose-500" : "text-emerald-500",
            )}
          >
            {delta.value}
          </span>
          {delta.suffix && (
            <span className="text-muted-foreground">{delta.suffix}</span>
          )}
        </p>
      )}
    </div>
  );
}
