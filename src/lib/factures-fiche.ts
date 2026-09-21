import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Operateur, StatutFacture } from "@/generated/prisma/enums";
import {
  PEUT_RECEVOIR_PAIEMENT,
  PEUT_SUSPENDRE,
  joursDeRetard,
  resteDu,
  statutApresAnnulationPaiement,
  statutApresModification,
  statutApresPaiement,
  statutApresReprise,
  validerMotif,
  validerPaiement,
  type ChampPaiement,
  type SaisiePaiement,
} from "@/lib/facture-regles";
import { validerSaisie, type ChampSaisie, type SaisieFacture } from "@/lib/factures-saisie";
import { formatFCFA, toIsoDate } from "@/lib/format";
import { aujourdhuiIso, dateDuJour, statutAffiche } from "@/lib/status";

/**
 * Fiche d'une facture : lecture, modification, paiement reçu à la main, suspension, annulation.
 * Toutes les fonctions prennent l'entrepriseId de la session (jamais du navigateur) et l'appliquent à chaque requête :
 * la facture d'une autre entreprise est « introuvable », comme si elle n'existait pas.
 *
 * Invariant : pour toute facture, montantPaye = somme des paiements non annulés (0 sans paiement).
 * Chaque écriture se fait sous verrou de ligne (SELECT … FOR UPDATE) et modifie montantPaye par un delta.
 */

export interface Contexte {
  entrepriseId: string;
  utilisateurId: string;
  role: "ADMIN" | "COLLABORATEUR";
}

// ---------------------------------------------------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------------------------------------------------

export interface LignePaiement {
  id: string;
  montant: number;
  operateur: Operateur;
  payeLe: string; // AAAA-MM-JJ
  /** Référence saisie à la main, ou référence PayGate. Null si le paiement manuel n'en a pas. */
  reference: string | null;
  manuel: boolean;
  annule: { le: string; parPrenom: string | null; motif: string | null } | null;
}

export interface FicheFacture {
  id: string;
  numero: string;
  /** Statut affiché : une facture « À venir » dont l'échéance est passée est « Échue ». */
  statut: StatutFacture;
  montant: number;
  montantPaye: number;
  resteDu: number;
  dateFacture: string;
  dateFactureEstimee: boolean;
  echeance: string;
  joursRetard: number | null;
  client: { id: string; nom: string; whatsapp: string };
  paiements: LignePaiement[];
}

/** La facture existe-t-elle dans CETTE entreprise ? Contrôle léger, fait avant que la page ne commence à s'afficher (voir factures/[id]/layout.tsx). */
export async function factureExiste(entrepriseId: string, id: string): Promise<boolean> {
  return (await db.facture.count({ where: { id, entrepriseId } })) > 0;
}

/** Une facture de l'entreprise avec ses paiements (annulés compris, pour garder la trace). Null si elle n'est pas dans CETTE entreprise. */
export async function trouverFacture(entrepriseId: string, id: string, aujourdhui = aujourdhuiIso()): Promise<FicheFacture | null> {
  const f = await db.facture.findFirst({
    where: { id, entrepriseId },
    include: {
      client: { select: { id: true, nom: true, whatsapp: true } },
      paiements: { orderBy: [{ payeLe: "desc" }, { createdAt: "desc" }], include: { annulePar: { select: { nom: true } } } },
    },
  });
  if (!f) return null;
  const statut = statutAffiche(f.statut, f.echeance, aujourdhui);
  const echeance = toIsoDate(f.echeance);
  return {
    id: f.id,
    numero: f.numero,
    statut,
    montant: f.montant,
    montantPaye: f.montantPaye,
    resteDu: resteDu(f.statut, f.montant, f.montantPaye),
    dateFacture: toIsoDate(f.dateFacture),
    dateFactureEstimee: f.dateFactureEstimee,
    echeance,
    joursRetard: joursDeRetard(statut, echeance, aujourdhui),
    client: f.client,
    paiements: f.paiements.map((p) => ({
      id: p.id,
      montant: p.montant,
      operateur: p.operateur,
      payeLe: toIsoDate(p.payeLe),
      reference: p.manuel ? p.reference : (p.reference ?? p.referenceTx),
      manuel: p.manuel,
      annule: p.annuleLe ? { le: toIsoDate(p.annuleLe), parPrenom: p.annulePar?.nom.split(" ")[0] ?? null, motif: p.motifAnnulation } : null,
    })),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Verrou de ligne
// ---------------------------------------------------------------------------------------------------------------------

interface FactureVerrouillee {
  id: string;
  montant: number;
  montantPaye: number;
  statut: StatutFacture;
  echeance: string;
  dateFacture: string;
  dateFactureEstimee: boolean;
}

/**
 * Lit la facture ET la verrouille jusqu'à la fin de la transaction : deux opérations simultanées sur la même facture
 * passent l'une après l'autre (jamais deux paiements qui dépassent ensemble le reste dû). Filtré par entreprise.
 */
async function verrouiller(tx: Prisma.TransactionClient, entrepriseId: string, id: string): Promise<FactureVerrouillee | null> {
  const lignes = await tx.$queryRaw<FactureVerrouillee[]>`
    SELECT "id", "montant", "montantPaye", "statut"::text AS "statut", "echeance"::text AS "echeance",
           "dateFacture"::text AS "dateFacture", "dateFactureEstimee"
    FROM "Facture"
    WHERE "id" = ${id} AND "entrepriseId" = ${entrepriseId}
    FOR UPDATE`;
  return lignes[0] ?? null;
}

const OPTIONS_TRANSACTION = { timeout: 15_000, maxWait: 10_000 };
const estViolationUnicite = (e: unknown) => typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";

// ---------------------------------------------------------------------------------------------------------------------
// Paiement reçu à la main
// ---------------------------------------------------------------------------------------------------------------------

export type ResultatPaiement =
  | { ok: true; paiementId: string; avertissements: Partial<Record<ChampPaiement, string>>; /** Même envoi reçu deux fois : rien n'a été dupliqué. */ dejaEnregistre?: boolean }
  | { ok: false; introuvable: true }
  | { ok: false; erreurs: Partial<Record<ChampPaiement | "general", string>> };

export async function enregistrerPaiement(entrepriseId: string, factureId: string, saisie: SaisiePaiement, aujourdhui = aujourdhuiIso()): Promise<ResultatPaiement> {
  const cle = saisie.cle.trim();
  if (cle === "" || cle.length > 100) return { ok: false, erreurs: { general: "Le paiement n'a pas pu être envoyé. Rechargez la page et recommencez." } };
  const referenceTx = `MANUEL-${cle}`;

  try {
    return await db.$transaction(async (tx): Promise<ResultatPaiement> => {
      const f = await verrouiller(tx, entrepriseId, factureId);
      if (!f) return { ok: false, introuvable: true };

      // Même envoi une seconde fois (double clic, connexion coupée) : on renvoie le paiement déjà enregistré.
      const dejaLa = await tx.paiement.findUnique({ where: { referenceTx }, select: { id: true, factureId: true } });
      if (dejaLa) {
        if (dejaLa.factureId === factureId) return { ok: true, paiementId: dejaLa.id, avertissements: {}, dejaEnregistre: true };
        return { ok: false, erreurs: { general: "Le paiement n'a pas pu être envoyé. Rechargez la page et recommencez." } };
      }

      if (f.statut === "ANNULEE") return { ok: false, erreurs: { general: "Cette facture est annulée : elle ne peut plus recevoir de paiement." } };
      if (!PEUT_RECEVOIR_PAIEMENT.includes(f.statut)) return { ok: false, erreurs: { montant: "Il ne reste rien à payer sur cette facture." } };

      const validation = validerPaiement(saisie, {
        resteDu: resteDu(f.statut, f.montant, f.montantPaye),
        aujourdhui,
        dateFacture: f.dateFacture,
        dateFactureEstimee: f.dateFactureEstimee,
      });
      if (!validation.ok) return { ok: false, erreurs: validation.erreurs };
      const { montant, date, operateur, reference } = validation.valeur;

      const paiement = await tx.paiement.create({
        data: { factureId, montant, operateur, referenceTx, payeLe: dateDuJour(date), manuel: true, reference },
        select: { id: true },
      });
      const nouveauMontantPaye = f.montantPaye + montant;
      await tx.facture.update({ where: { id: factureId }, data: { montantPaye: { increment: montant }, statut: statutApresPaiement(f.statut, f.montant, nouveauMontantPaye) } });
      return { ok: true, paiementId: paiement.id, avertissements: validation.avertissements };
    }, OPTIONS_TRANSACTION);
  } catch (e) {
    if (estViolationUnicite(e)) return { ok: false, erreurs: { general: "Le paiement n'a pas pu être envoyé. Rechargez la page et recommencez." } };
    throw e;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Modification
// ---------------------------------------------------------------------------------------------------------------------

export type ResultatModification =
  | { ok: true }
  | { ok: false; introuvable: true }
  | { ok: false; erreurs: Partial<Record<ChampSaisie | "general", string>> };

/** Modifier le numéro, le montant, les dates ou le client. Mêmes règles que la saisie rapide, plus celles d'une facture qui existe déjà. */
export async function modifierFacture(entrepriseId: string, id: string, saisie: SaisieFacture, aujourdhui = aujourdhuiIso()): Promise<ResultatModification> {
  const validation = validerSaisie(saisie);
  if (!validation.ok) return { ok: false, erreurs: validation.erreurs };
  const { numero, montant, dateFacture, echeance, client } = validation.valeur;
  if (client.type !== "existant") return { ok: false, erreurs: { client: "Choisissez un client qui existe déjà." } };

  const numeroPris = { ok: false as const, erreurs: { numero: `Le numéro ${numero} est déjà utilisé par une autre facture. Choisissez un autre numéro.` } };
  try {
    return await db.$transaction(async (tx): Promise<ResultatModification> => {
      const f = await verrouiller(tx, entrepriseId, id);
      if (!f) return { ok: false, introuvable: true };
      if (f.statut === "ANNULEE") return { ok: false, erreurs: { general: "Cette facture est annulée : elle ne se modifie plus." } };
      if (montant < f.montantPaye) return { ok: false, erreurs: { montant: `Le montant ne peut pas être inférieur à ce qui est déjà payé : ${formatFCFA(f.montantPaye)}.` } };

      const clientTrouve = await tx.client.findFirst({ where: { id: client.id, entrepriseId }, select: { id: true } });
      if (!clientTrouve) return { ok: false, erreurs: { client: "Ce client n'existe plus. Choisissez-en un autre." } };
      if (await tx.facture.findFirst({ where: { entrepriseId, numero, id: { not: id } }, select: { id: true } })) return numeroPris;

      await tx.facture.update({
        where: { id },
        data: {
          numero,
          montant,
          clientId: clientTrouve.id,
          dateFacture: dateDuJour(dateFacture),
          echeance: dateDuJour(echeance),
          // Changer la date de facture, c'est la confirmer : elle n'est plus « estimée ».
          dateFactureEstimee: dateFacture !== f.dateFacture ? false : f.dateFactureEstimee,
          statut: statutApresModification(f.statut, montant, f.montantPaye, echeance, aujourdhui),
        },
      });
      return { ok: true };
    }, OPTIONS_TRANSACTION);
  } catch (e) {
    if (estViolationUnicite(e)) return numeroPris;
    throw e;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Suspendre, reprendre, annuler
// ---------------------------------------------------------------------------------------------------------------------

export type ResultatAction =
  | { ok: true }
  | { ok: false; introuvable: true }
  /** Réservé aux administrateurs. Rien n'a été écrit. */
  | { ok: false; interdit: true }
  | { ok: false; erreur: string; champ?: "motif" };

const refuse = (erreur: string, champ?: "motif"): ResultatAction => ({ ok: false, erreur, champ });
const INTERDIT: ResultatAction = { ok: false, interdit: true };

export async function suspendreRelances(entrepriseId: string, id: string): Promise<ResultatAction> {
  return db.$transaction(async (tx): Promise<ResultatAction> => {
    const f = await verrouiller(tx, entrepriseId, id);
    if (!f) return { ok: false, introuvable: true };
    if (f.statut === "SUSPENDUE") return refuse("Les relances de cette facture sont déjà suspendues.");
    if (f.statut === "ANNULEE") return refuse("Cette facture est annulée.");
    if (!PEUT_SUSPENDRE.includes(f.statut)) return refuse("Cette facture est payée : il n'y a plus de relance à suspendre.");
    await tx.facture.update({ where: { id }, data: { statut: "SUSPENDUE" } });
    return { ok: true };
  }, OPTIONS_TRANSACTION);
}

export async function reprendreRelances(entrepriseId: string, id: string, aujourdhui = aujourdhuiIso()): Promise<ResultatAction> {
  return db.$transaction(async (tx): Promise<ResultatAction> => {
    const f = await verrouiller(tx, entrepriseId, id);
    if (!f) return { ok: false, introuvable: true };
    if (f.statut !== "SUSPENDUE") return refuse("Les relances de cette facture ne sont pas suspendues.");
    await tx.facture.update({ where: { id }, data: { statut: statutApresReprise(f.montant, f.montantPaye, f.echeance, aujourdhui) } });
    return { ok: true };
  }, OPTIONS_TRANSACTION);
}

/** Administrateur seulement. On n'efface jamais une facture : elle passe « Annulée ». Refusé tant qu'un paiement n'est pas annulé. */
export async function annulerFacture(contexte: Contexte, id: string): Promise<ResultatAction> {
  if (contexte.role !== "ADMIN") return INTERDIT;
  return db.$transaction(async (tx): Promise<ResultatAction> => {
    const f = await verrouiller(tx, contexte.entrepriseId, id);
    if (!f) return { ok: false, introuvable: true };
    if (f.statut === "ANNULEE") return refuse("Cette facture est déjà annulée.");
    const actifs = await tx.paiement.count({ where: { factureId: id, annuleLe: null } });
    if (actifs > 0) return refuse("Cette facture a déjà reçu des paiements, elle ne peut pas être annulée.");
    await tx.facture.update({ where: { id }, data: { statut: "ANNULEE" } });
    return { ok: true };
  }, OPTIONS_TRANSACTION);
}

/**
 * Administrateur seulement. Annule un paiement saisi à la main, en gardant la trace (qui, quand, pourquoi).
 * Un paiement reçu par PayGate ne s'annule pas ici : il faut un remboursement.
 */
export async function annulerPaiement(contexte: Contexte, factureId: string, paiementId: string, motif: string, aujourdhui = aujourdhuiIso()): Promise<ResultatAction> {
  if (contexte.role !== "ADMIN") return INTERDIT;
  const m = validerMotif(motif);
  if (!m.ok) return refuse(m.error, "motif");

  return db.$transaction(async (tx): Promise<ResultatAction> => {
    const f = await verrouiller(tx, contexte.entrepriseId, factureId);
    if (!f) return { ok: false, introuvable: true };
    if (f.statut === "ANNULEE") return refuse("Cette facture est annulée : ses paiements ne se modifient plus.");
    // Le paiement doit appartenir à CETTE facture, elle-même de CETTE entreprise.
    const p = await tx.paiement.findFirst({ where: { id: paiementId, factureId }, select: { montant: true, manuel: true, annuleLe: true } });
    if (!p) return { ok: false, introuvable: true };
    if (!p.manuel) return refuse("Un paiement reçu par Mobile Money ne s'annule pas ici : il faut un remboursement.");
    if (p.annuleLe) return refuse("Ce paiement est déjà annulé.");

    await tx.paiement.update({ where: { id: paiementId }, data: { annuleLe: new Date(), annuleParId: contexte.utilisateurId, motifAnnulation: m.valeur } });
    const nouveauMontantPaye = f.montantPaye - p.montant;
    await tx.facture.update({
      where: { id: factureId },
      data: { montantPaye: { decrement: p.montant }, statut: statutApresAnnulationPaiement(f.statut, f.montant, nouveauMontantPaye, f.echeance, aujourdhui) },
    });
    return { ok: true };
  }, OPTIONS_TRANSACTION);
}
