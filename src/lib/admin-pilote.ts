import type { StatutDemandePilote } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatDate, toIsoDate } from "@/lib/format";
import { nationalTogoPhone } from "@/lib/phone";
import { LIBELLES_STATUT, LIBELLES_VOLUME, STATUTS_DEMANDE } from "@/lib/statuts-pilote";

/** Lecture des demandes de pilote pour /admin/pilote et son export. Réservé à l'administration de la plateforme. */

export const TAILLE_PAGE = 50;

/** Filtre de l'adresse (?statut=…). Absent ou inconnu : null = toutes les demandes sauf les suspectes. */
export function lireFiltre(brut: string | undefined): StatutDemandePilote | null {
  return STATUTS_DEMANDE.find((s) => s === brut) ?? null;
}

const where = (statut: StatutDemandePilote | null) => (statut ? { statut } : { statut: { not: "SUSPECTE" as const } });

/** Nombre de demandes par statut ; « toutes » exclut les suspectes, comme le filtre par défaut. */
export async function compterDemandes() {
  const groupes = await db.demandePilote.groupBy({ by: ["statut"], _count: { _all: true } });
  const parStatut = Object.fromEntries(STATUTS_DEMANDE.map((s) => [s, 0])) as Record<StatutDemandePilote, number>;
  for (const g of groupes) parStatut[g.statut] = g._count._all;
  const toutes = STATUTS_DEMANDE.filter((s) => s !== "SUSPECTE").reduce((n, s) => n + parStatut[s], 0);
  return { toutes, parStatut };
}

export async function listerDemandes(statut: StatutDemandePilote | null, page: number) {
  return db.demandePilote.findMany({ where: where(statut), orderBy: { createdAt: "desc" }, skip: (page - 1) * TAILLE_PAGE, take: TAILLE_PAGE });
}

// --- Export CSV ------------------------------------------------------------------------------------------------------

type LigneExport = Awaited<ReturnType<typeof listerDemandes>>[number];

/**
 * Cellule CSV. Toujours entre guillemets (les guillemets intérieurs doublés), ce qui protège les « ; » et les sauts de ligne.
 * Un texte saisi (par un visiteur ou dans la note) qui commence par = + - @ ou une tabulation serait lu comme une formule par
 * Excel : il est préfixé d'une apostrophe, qui reste visible et signale la neutralisation.
 */
export function celluleCsv(valeur: string | null | undefined, texteSaisi = false): string {
  let v = valeur ?? "";
  if (texteSaisi && /^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

const ENTETES = ["Reçue le", "Entreprise", "Contact", "WhatsApp (+228)", "Ville", "Factures par mois", "Statut", "Note", "Consentement (version)", "Consentement le"];

/** CSV lisible dans Excel en français : séparateur « ; », UTF-8 avec BOM, fins de ligne CRLF. */
export function versCsv(demandes: LigneExport[]): string {
  const lignes = demandes.map((d) =>
    [
      celluleCsv(formatDate(toIsoDate(d.createdAt))),
      celluleCsv(d.nomEntreprise, true),
      celluleCsv(d.nomContact, true),
      // Numéro national (« 90 12 34 56 ») : avec « +228 » en tête, Excel le prendrait pour une formule.
      celluleCsv(nationalTogoPhone(d.whatsapp)),
      celluleCsv(d.ville, true),
      celluleCsv(d.facturesParMois ? LIBELLES_VOLUME[d.facturesParMois] : ""),
      celluleCsv(LIBELLES_STATUT[d.statut]),
      celluleCsv(d.note, true),
      celluleCsv(d.consentementVersion),
      celluleCsv(d.consentementLe ? formatDate(toIsoDate(d.consentementLe)) : ""),
    ].join(";"),
  );
  return `\uFEFF${[ENTETES.map((e) => celluleCsv(e)).join(";"), ...lignes].join("\r\n")}\r\n`;
}

/** Toutes les demandes du filtre (sans pagination), pour l'export. */
export async function demandesAExporter(statut: StatutDemandePilote | null) {
  return db.demandePilote.findMany({ where: where(statut), orderBy: { createdAt: "desc" } });
}
