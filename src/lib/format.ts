const fcfa = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 1250000 → « 1 250 000 » (espaces fines insécables remplacées par des espaces insécables). */
export function formatAmount(value: number): string {
  return fcfa.format(Math.round(value)).replace(/\u202f/g, "\u00a0");
}

/** 1250000 → « 1 250 000 FCFA » */
export function formatFCFA(value: number): string {
  return `${formatAmount(value)}\u00a0FCFA`;
}

/** 5275000 → « 5,28 M » */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(".", ",")}\u00a0M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}\u00a0k`;
  return formatAmount(value);
}

/** Date (colonne @db.Date, à minuit UTC) → « 2026-09-25 » */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** « 2026-09-25 » → « 25/09/2026 » */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Libellé d'une étape de relance : -3 → « J-3 », 0 → « J », 7 → « J+7 » */
export function formatOffset(days: number): string {
  if (days === 0) return "J";
  return days > 0 ? `J+${days}` : `J${days}`;
}
