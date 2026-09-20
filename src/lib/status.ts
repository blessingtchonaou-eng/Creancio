import type { StatutFacture } from "@/generated/prisma/enums";

export const STATUS_META: Record<
  StatutFacture,
  { label: string; short: string; glyph: string; className: string }
> = {
  A_VENIR: { label: "À venir", short: "À venir", glyph: "○", className: "bg-st-upcoming-bg text-st-upcoming-fg" },
  ECHUE: { label: "Échue", short: "Échues", glyph: "!", className: "bg-st-overdue-bg text-st-overdue-fg" },
  EN_RELANCE: { label: "En relance", short: "En relance", glyph: "↻", className: "bg-st-reminding-bg text-st-reminding-fg" },
  PARTIELLEMENT_PAYEE: { label: "Partiellement payée", short: "Partielles", glyph: "◐", className: "bg-st-partial-bg text-st-partial-fg" },
  PAYEE: { label: "Payée", short: "Payées", glyph: "✓", className: "bg-st-paid-bg text-st-paid-fg" },
  SUSPENDUE: { label: "Suspendue", short: "Suspendues", glyph: "‖", className: "bg-st-paused-bg text-st-paused-fg" },
  ANNULEE: { label: "Annulée", short: "Annulées", glyph: "✕", className: "bg-st-cancelled-bg text-st-cancelled-fg line-through" },
};
