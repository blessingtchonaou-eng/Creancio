import type { StatutFacture } from "@/generated/prisma/enums";

/**
 * « Aujourd'hui » au format AAAA-MM-JJ, calculé en UTC. C'est juste pour le Togo : le pays est à UTC+0 toute l'année,
 * sans heure d'été, donc le jour UTC est le jour de Lomé. À revoir si le produit s'ouvre à un autre fuseau
 * (voir TODO-PRODUCTION.md).
 */
export const aujourdhuiIso = () => new Date().toISOString().slice(0, 10);

/** AAAA-MM-JJ → minuit UTC, comme les colonnes @db.Date de Prisma. */
export const dateDuJour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/**
 * Le statut est écrit à la création et aucun planificateur ne le met encore à jour : une facture « À venir » dont
 * l'échéance est passée est en réalité échue. Tout écran affiche ce statut-là ; les filtres SQL appliquent la même règle.
 * Le passage en base viendra avec le planificateur de relances.
 */
export function statutAffiche(statut: StatutFacture, echeance: Date | string, aujourdhui: string): StatutFacture {
  const jour = typeof echeance === "string" ? echeance : echeance.toISOString().slice(0, 10);
  return statut === "A_VENIR" && jour < aujourdhui ? "ECHUE" : statut;
}

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
