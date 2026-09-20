import type { Kpi } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Sparkline } from "./sparkline";

const trendColor = { good: "text-success", bad: "text-danger", neutral: "text-mustard" } as const;

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const inverse = kpi.inverse;
  return (
    <article className={cn("flex flex-col rounded-lg p-4 sm:p-4.5", inverse ? "bg-inverse text-on-inverse" : "border border-border bg-surface")}>
      <div className="flex items-start justify-between gap-2">
        <h3 className={cn("text-body-sm", inverse ? "opacity-75" : "text-ink-muted")}>{kpi.label}</h3>
        <Sparkline series={kpi.series} width={64} height={26} className={cn("hidden shrink-0 sm:block", inverse ? "text-mustard" : trendColor[kpi.trend])} />
      </div>
      <p className="mt-2 font-display text-[1.5rem] leading-tight sm:whitespace-nowrap sm:text-[1.75rem]">
        <span className="tabular">{kpi.value}</span> <span className="text-body">{kpi.unit}</span>
      </p>
      <p className={cn("mt-2.5 text-body-sm", inverse ? "text-mustard" : trendColor[kpi.trend])}>{kpi.delta}</p>
    </article>
  );
}
