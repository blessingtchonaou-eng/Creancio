import { db } from "@/lib/db";
import { STATUTS_DUS, TAILLE_PAGE } from "@/lib/clients";
import { toIsoDate } from "@/lib/format";
import { dateDuJour, statutAffiche } from "@/lib/status";
import type { Prisma } from "@/generated/prisma/client";
import type { StatutFacture } from "@/generated/prisma/enums";

/**
 * Liste des factures d'une entreprise. L'entrepriseId vient de la session et s'applique à chaque requête :
 * une entreprise ne voit jamais les factures d'une autre.
 */

export type FiltreFacture = "a_encaisser" | "toutes" | "a_venir" | "echues" | "en_relance" | "partielles" | "payees" | "suspendues" | "annulees";
export type TriEcheance = "asc" | "desc";

export const FILTRE_PAR_DEFAUT: FiltreFacture = "a_encaisser";

/** Ordre d'affichage des puces de filtre. */
export const FILTRES: { valeur: FiltreFacture; libelle: string; glyphe?: string }[] = [
  { valeur: "a_encaisser", libelle: "À encaisser" },
  { valeur: "toutes", libelle: "Toutes" },
  { valeur: "a_venir", libelle: "À venir", glyphe: "○" },
  { valeur: "echues", libelle: "Échues", glyphe: "!" },
  { valeur: "en_relance", libelle: "En relance", glyphe: "↻" },
  { valeur: "partielles", libelle: "Partielles", glyphe: "◐" },
  { valeur: "payees", libelle: "Payées", glyphe: "✓" },
  { valeur: "suspendues", libelle: "Suspendues", glyphe: "‖" },
  { valeur: "annulees", libelle: "Annulées", glyphe: "✕" },
];

export const lireFiltre = (v: string | undefined): FiltreFacture => FILTRES.find((f) => f.valeur === v)?.valeur ?? FILTRE_PAR_DEFAUT;
export const lireTri = (v: string | undefined): TriEcheance => (v === "desc" ? "desc" : "asc");

/** Condition SQL d'une puce. Un « À venir » dont l'échéance est passée compte comme « Échue » (voir statutAffiche). */
function conditionFiltre(filtre: FiltreFacture, jour: Date): Prisma.FactureWhereInput {
  switch (filtre) {
    case "toutes":
      return {};
    case "a_encaisser":
      return { statut: { in: STATUTS_DUS } };
    case "a_venir":
      return { statut: "A_VENIR", echeance: { gte: jour } };
    case "echues":
      return { OR: [{ statut: "ECHUE" }, { statut: "A_VENIR", echeance: { lt: jour } }] };
    case "en_relance":
      return { statut: "EN_RELANCE" };
    case "partielles":
      return { statut: "PARTIELLEMENT_PAYEE" };
    case "payees":
      return { statut: "PAYEE" };
    case "suspendues":
      return { statut: "SUSPENDUE" };
    case "annulees":
      return { statut: "ANNULEE" };
  }
}

export interface LigneFacture {
  id: string;
  numero: string;
  clientId: string;
  clientNom: string;
  echeance: string; // AAAA-MM-JJ
  montant: number;
  montantPaye: number;
  statut: StatutFacture; // statut affiché
}

export type ComptesFiltres = Record<FiltreFacture, number>;

export interface PageFactures {
  lignes: LigneFacture[];
  total: number;
  page: number;
  nbPages: number;
  /** Nombre de factures par puce, pour la recherche en cours. */
  comptes: ComptesFiltres;
  /** Filtre réellement appliqué : « toutes » dès qu'une recherche est saisie. */
  filtreApplique: FiltreFacture;
}

interface Options {
  q?: string;
  filtre?: FiltreFacture;
  tri?: TriEcheance;
  page?: number;
}

/**
 * Recherche par numéro de facture ou par nom du client. Une recherche porte sur TOUTES les factures, quel que soit le filtre :
 * sinon une facture payée ne se retrouverait pas par son numéro tant que « À encaisser » est actif.
 */
export async function listerFactures(entrepriseId: string, { q = "", filtre = FILTRE_PAR_DEFAUT, tri = "asc", page = 1 }: Options, aujourdhui: string): Promise<PageFactures> {
  const recherche = q.trim();
  const jour = dateDuJour(aujourdhui);
  const filtreApplique: FiltreFacture = recherche ? "toutes" : filtre;

  const baseRecherche: Prisma.FactureWhereInput = {
    entrepriseId,
    ...(recherche
      ? { OR: [{ numero: { contains: recherche, mode: "insensitive" } }, { client: { nom: { contains: recherche, mode: "insensitive" } } }] }
      : {}),
  };
  const where: Prisma.FactureWhereInput = { AND: [baseRecherche, conditionFiltre(filtreApplique, jour)] };

  const [parStatut, avenirEchues, total] = await Promise.all([
    db.facture.groupBy({ by: ["statut"], where: baseRecherche, _count: { _all: true } }),
    db.facture.count({ where: { AND: [baseRecherche, { statut: "A_VENIR", echeance: { lt: jour } }] } }),
    db.facture.count({ where }),
  ]);
  const n = (s: StatutFacture) => parStatut.find((g) => g.statut === s)?._count._all ?? 0;
  const comptes: ComptesFiltres = {
    toutes: parStatut.reduce((somme, g) => somme + g._count._all, 0),
    a_encaisser: STATUTS_DUS.reduce((somme, s) => somme + n(s), 0),
    a_venir: n("A_VENIR") - avenirEchues,
    echues: n("ECHUE") + avenirEchues,
    en_relance: n("EN_RELANCE"),
    partielles: n("PARTIELLEMENT_PAYEE"),
    payees: n("PAYEE"),
    suspendues: n("SUSPENDUE"),
    annulees: n("ANNULEE"),
  };

  const nbPages = Math.max(1, Math.ceil(total / TAILLE_PAGE));
  const pageCourante = Math.min(Math.max(1, Math.trunc(page) || 1), nbPages);

  const factures = await db.facture.findMany({
    where,
    // numéro puis id : un ordre total, pour que la pagination ne saute ni ne répète aucune facture.
    orderBy: [{ echeance: tri }, { numero: tri }, { id: "asc" }],
    skip: (pageCourante - 1) * TAILLE_PAGE,
    take: TAILLE_PAGE,
    select: { id: true, numero: true, clientId: true, montant: true, montantPaye: true, echeance: true, statut: true, client: { select: { nom: true } } },
  });

  return {
    lignes: factures.map((f) => ({
      id: f.id,
      numero: f.numero,
      clientId: f.clientId,
      clientNom: f.client.nom,
      echeance: toIsoDate(f.echeance),
      montant: f.montant,
      montantPaye: f.montantPaye,
      statut: statutAffiche(f.statut, f.echeance, aujourdhui),
    })),
    total,
    page: pageCourante,
    nbPages,
    comptes,
    filtreApplique,
  };
}
