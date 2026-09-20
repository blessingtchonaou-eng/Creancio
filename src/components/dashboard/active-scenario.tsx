import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatOffset } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ReminderStep } from "@/lib/types";

const toneClass = {
  neutre: "bg-surface-muted text-ink",
  accent: "bg-mustard text-[#232A1B]",
  fort: "bg-inverse text-on-inverse",
} as const;

export function ActiveScenario({ steps }: { steps: ReminderStep[] }) {
  return (
    <Card className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[1.0625rem]">Scénario de relance actif</h2>
        <Link href="/relances" className="text-body-sm font-medium text-primary hover:text-primary-strong">Modifier</Link>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map((s) => (
          <li key={s.offsetDays} className="flex items-start gap-3">
            <span className={cn("flex h-7 w-12 shrink-0 items-center justify-center rounded-full text-caption font-semibold", toneClass[s.tone])}>
              {formatOffset(s.offsetDays)}
            </span>
            <div className="text-body-sm">
              <p className="font-semibold">{s.title}</p>
              <p className="text-ink-muted">{s.channel}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
