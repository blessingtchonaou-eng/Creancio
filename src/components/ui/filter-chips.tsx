"use client";

import { cn } from "@/lib/cn";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  glyph?: string;
  count?: number;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-body-sm font-medium transition-colors",
              active ? "border-inverse bg-inverse text-on-inverse" : "border-border-strong bg-surface text-ink hover:bg-surface-muted",
            )}
          >
            {o.glyph && <span aria-hidden>{o.glyph} </span>}
            {o.label}
            {o.count !== undefined && <span className="tabular"> · {o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
