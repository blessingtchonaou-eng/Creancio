import { formatDate, formatFCFA } from "@/lib/format";
import { parserDate } from "@/lib/import/date";
import { parserMontant } from "@/lib/import/montant";
import type { Operateur, StatutFacture } from "@/generated/prisma/enums";

/**
 * Règles d'une facture : reste dû, retard, validation d'un paiement, statut après chaque changement.
 * Fichier sans accès à la base de données : partagé par le formulaire, le serveur et les tests.
 */

export const REFERENCE_MAX = 100;
export const MOTIF_MIN = 3;
export const MOTIF_MAX = 200;

/** Comment un paiement reçu à la main a été payé, dans l'ordre du formulaire. */
export const OPERATEURS_MANUELS: { valeur: Operateur; libelle: string }[] = [
  { valeur: "FLOOZ", libelle: "Flooz" },
  { valeur: "MIXX", libelle: "Mixx by Yas" },
  { valeur: "ESPECES", libelle: "Espèces" },
  { valeur: "VIREMENT", libelle: "Virement" },
];

export const LIBELLE_OPERATEUR: Record<Operateur, string> = Object.fromEntries(OPERATEURS_MANUELS.map((o) => [o.valeur, o.libelle])) as Record<Operateur, string>;

const JOUR_MS = 86_400_000;
const espaces = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();

/** Ce qu'il reste à payer. Une facture annulée ne doit plus rien, même si des paiements avaient été reçus. */
export const resteDu = (statut: StatutFacture, montant: number, montantPaye: number) => (statut === "ANNULEE" ? 0 : Math.max(0, montant - montantPaye));

/** Statuts d'une facture qu'il reste à encaisser (mêmes que STATUTS_DUS de clients.ts, sans dépendre de la base). */
const estDue = (statut: StatutFacture) => statut !== "PAYEE" && statut !== "ANNULEE";

/** Jours de retard d'une facture encore due dont l'échéance est passée, sinon null. Dates au format AAAA-MM-JJ. */
export function joursDeRetard(statut: StatutFacture, echeance: string, aujourdhui: string): number | null {
  if (!estDue(statut)) return null;
  const jours = Math.round((Date.parse(`${aujourdhui}T00:00:00Z`) - Date.parse(`${echeance}T00:00:00Z`)) / JOUR_MS);
  return jours > 0 ? jours : null;
}

/** « À venir » si l'échéance n'est pas passée, « Échue » sinon (même règle que l'import). */
const selonEcheance = (echeance: string, aujourdhui: string): StatutFacture => (echeance < aujourdhui ? "ECHUE" : "A_VENIR");

// ---------------------------------------------------------------------------------------------------------------------
// Paiement reçu à la main
// ---------------------------------------------------------------------------------------------------------------------

/** Ce que le formulaire envoie : du texte, comme l'utilisateur l'a tapé. */
export interface SaisiePaiement {
  /** Identifiant tiré à l'ouverture du formulaire : un renvoi (double clic, connexion coupée) ne crée pas un second paiement. */
  cle: string;
  montant: string;
  date: string; // AAAA-MM-JJ
  operateur: string;
  reference: string;
}

export type ChampPaiement = "montant" | "date" | "operateur" | "reference";

export interface PaiementValide {
  montant: number;
  date: string;
  operateur: Operateur;
  reference: string | null;
}

export interface ContextePaiement {
  resteDu: number;
  aujourdhui: string;
  dateFacture: string;
  /** La date de facture n'était pas dans le fichier importé : un paiement « avant la facture » n'est alors qu'un avertissement. */
  dateFactureEstimee: boolean;
}

export type ResultatValidationPaiement =
  | { ok: true; valeur: PaiementValide; avertissements: Partial<Record<ChampPaiement, string>> }
  | { ok: false; erreurs: Partial<Record<ChampPaiement, string>> };

export const AVERTISSEMENT_DATE_ESTIMEE = "La date de facture est estimée : vérifiez la date de ce paiement.";

export function validerPaiement(saisie: Pick<SaisiePaiement, "montant" | "date" | "operateur" | "reference">, contexte: ContextePaiement): ResultatValidationPaiement {
  const erreurs: Partial<Record<ChampPaiement, string>> = {};
  const avertissements: Partial<Record<ChampPaiement, string>> = {};

  const montant = parserMontant(saisie.montant);
  if (!montant.ok) erreurs.montant = montant.error;
  else if (contexte.resteDu <= 0) erreurs.montant = "Il ne reste rien à payer sur cette facture.";
  else if (montant.valeur > contexte.resteDu) erreurs.montant = `Le paiement ne peut pas dépasser le reste à payer : ${formatFCFA(contexte.resteDu)}.`;

  const date = parserDate(saisie.date);
  if (!date.ok) erreurs.date = "Choisissez la date du paiement.";
  else if (date.iso > contexte.aujourdhui) erreurs.date = "La date du paiement ne peut pas être dans le futur.";
  else if (date.iso < contexte.dateFacture) {
    if (contexte.dateFactureEstimee) avertissements.date = AVERTISSEMENT_DATE_ESTIMEE;
    else erreurs.date = `La date du paiement ne peut pas être avant celle de la facture (${formatDate(contexte.dateFacture)}).`;
  }

  const operateur = OPERATEURS_MANUELS.find((o) => o.valeur === saisie.operateur)?.valeur;
  if (!operateur) erreurs.operateur = "Choisissez comment le paiement a été reçu.";

  const reference = espaces(saisie.reference);
  if (reference.length > REFERENCE_MAX) erreurs.reference = `La référence est trop longue (${REFERENCE_MAX} caractères au maximum).`;

  if (Object.keys(erreurs).length > 0 || !montant.ok || !date.ok || !operateur) return { ok: false, erreurs };
  return { ok: true, valeur: { montant: montant.valeur, date: date.iso, operateur, reference: reference === "" ? null : reference }, avertissements };
}

export type ResultatMotif = { ok: true; valeur: string } | { ok: false; error: string };

/** Motif d'une annulation de paiement : obligatoire, 3 à 200 caractères. */
export function validerMotif(brut: string): ResultatMotif {
  const motif = espaces(brut);
  if (motif.length < MOTIF_MIN) return { ok: false, error: `Écrivez ${MOTIF_MIN} caractères au moins.` };
  if (motif.length > MOTIF_MAX) return { ok: false, error: `Le motif est trop long (${MOTIF_MAX} caractères au maximum).` };
  return { ok: true, valeur: motif };
}

// ---------------------------------------------------------------------------------------------------------------------
// Statut après un changement
// ---------------------------------------------------------------------------------------------------------------------

/** Après un paiement : « Payée » si la facture est soldée. Une facture suspendue le reste tant qu'elle n'est pas soldée (la suspension est un choix du gérant). */
export function statutApresPaiement(statut: StatutFacture, montant: number, nouveauMontantPaye: number): StatutFacture {
  if (nouveauMontantPaye >= montant) return "PAYEE";
  if (statut === "SUSPENDUE") return "SUSPENDUE";
  return "PARTIELLEMENT_PAYEE";
}

/** Après l'annulation d'un paiement : la facture revient à ce que disent les paiements qui restent. */
export function statutApresAnnulationPaiement(statut: StatutFacture, montant: number, montantPaye: number, echeance: string, aujourdhui: string): StatutFacture {
  if (montantPaye >= montant) return "PAYEE";
  if (statut === "SUSPENDUE") return "SUSPENDUE";
  if (montantPaye > 0) return "PARTIELLEMENT_PAYEE";
  return selonEcheance(echeance, aujourdhui);
}

/** Après une modification du montant ou de l'échéance. La suspension et la relance en cours sont conservées. */
export function statutApresModification(statut: StatutFacture, montant: number, montantPaye: number, echeance: string, aujourdhui: string): StatutFacture {
  if (statut === "ANNULEE") return "ANNULEE";
  if (montantPaye >= montant) return "PAYEE";
  if (statut === "SUSPENDUE" || statut === "EN_RELANCE") return statut;
  if (montantPaye > 0) return "PARTIELLEMENT_PAYEE";
  return selonEcheance(echeance, aujourdhui);
}

/** Après « Reprendre les relances » : le statut d'avant la suspension n'est pas gardé, on le déduit des paiements et de l'échéance. */
export function statutApresReprise(montant: number, montantPaye: number, echeance: string, aujourdhui: string): StatutFacture {
  if (montantPaye >= montant) return "PAYEE";
  if (montantPaye > 0) return "PARTIELLEMENT_PAYEE";
  return selonEcheance(echeance, aujourdhui);
}

/** Statuts d'où l'on peut suspendre les relances. */
export const PEUT_SUSPENDRE: StatutFacture[] = ["A_VENIR", "ECHUE", "EN_RELANCE", "PARTIELLEMENT_PAYEE"];
/** Statuts d'où l'on peut enregistrer un paiement. */
export const PEUT_RECEVOIR_PAIEMENT: StatutFacture[] = ["A_VENIR", "ECHUE", "EN_RELANCE", "PARTIELLEMENT_PAYEE", "SUSPENDUE"];
