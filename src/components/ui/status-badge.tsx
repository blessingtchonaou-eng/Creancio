import { STATUS_META } from "@/lib/status";
import type { StatutFacture } from "@/generated/prisma/enums";
import { cn } from "@/lib/cn";

export function StatusBadge({ status, className }: { status: StatutFacture; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold",
        meta.className,
        className,
      )}
    >
      <span aria-hidden>{meta.glyph}</span>
      {meta.label}
    </span>
  );
}
