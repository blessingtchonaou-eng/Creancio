import { z } from "zod";
import { normalizeTogoPhone } from "@/lib/phone";
import type { Colonne } from "./colonnes";
import { parserDate } from "./date";
import { parserMontant } from "./montant";
import type { LigneBrute } from "./types";

/**
 * Analyse des lignes d'un import : fonction pure, sans base de données.
 * Le contexte (factures et clients déjà enregistrés) est fourni par l'appelant, et vient TOUJOURS de l'entreprise de la session.
 *
 * Règles absolues : une valeur illisible est une erreur visible (jamais devinée), et une ligne en erreur n'est jamais importée.
 */

export type StatutLigne = "prete" | "erreur" | "deja_importee" | "a_choisir";

export interface ClientConnu {
  id: string;
  nom: string;
  whatsapp: string;
}

export interface ContexteAnalyse {
  /** Numéros de facture déjà enregistrés pour l'entreprise (seuls ceux du fichier sont nécessaires). */
  numerosExistants: ReadonlySet<string>;
  clients: readonly ClientConnu[];
  /** Jour de l'import (AAAA-MM-JJ, UTC) : date de facture par défaut. Vaut le jour même si l'appelant ne le fournit pas. */
  aujourdhui?: string;
}

export const jourDuJour = () => new Date().toISOString().slice(0, 10);

/** Une facture dont l'échéance est passée est « Échue » dès l'import ; sinon « À venir ». */
export const statutSelonEcheance = (echeance: string, aujourdhui: string) => (echeance < aujourdhui ? ("ECHUE" as const) : ("A_VENIR" as const));

/** Choix de l'utilisateur pour un client à départager : identifiant du client existant, ou NOUVEAU_CLIENT. */
export const NOUVEAU_CLIENT = "nouveau";
export type Choix = Readonly<Record<string, string>>;

export type ClientRetenu = { type: "existant"; id: string; nom: string } | { type: "nouveau"; nom: string; whatsapp: string; email: string | null };

export interface LigneAnalysee {
  ligne: number;
  statut: StatutLigne;
  erreurs: Partial<Record<Colonne, string>>;
  /** Information à côté du client : « Client existant », « Nouveau client »… */
  noteClient?: string;
  /** Clé qui identifie le client dans le fichier ; elle sert à retenir un choix pour toutes ses lignes. */
  cleClient?: string;
  candidats?: ClientConnu[];
  // Valeurs lues, présentes seulement quand la ligne est prête.
  numero?: string;
  montant?: number;
  echeance?: string; // AAAA-MM-JJ
  dateFacture?: string; // AAAA-MM-JJ
  /** Aucune date de facture dans le fichier : la date du jour est utilisée. */
  dateFactureParDefaut?: boolean;
  client?: ClientRetenu;
}

export interface ComptesAnalyse {
  pretes: number;
  /** Lignes en erreur + lignes dont le client est à choisir. */
  aCorriger: number;
  dejaImportees: number;
}

export interface Analyse {
  lignes: LigneAnalysee[];
  comptes: ComptesAnalyse;
}

const NUMERO_MAX = 50;
const NOM_MAX = 120;

const emailSchema = z.email();

/** Texte d'une cellule nettoyé : espaces multiples réduits, extrémités retirées. */
export const espaces = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();

/** « Kofi  AGBO » et « kofi agbo » désignent le même client. */
export function normaliserNom(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function cleClient(nom: string, whatsapp: string | null): string {
  return `${whatsapp ?? ""}|${normaliserNom(nom)}`;
}

function analyserUneLigne(brute: LigneBrute, contexte: ContexteAnalyse, choix: Choix): LigneAnalysee {
  const erreurs: LigneAnalysee["erreurs"] = {};

  const numero = espaces(brute.numero);
  if (numero === "") erreurs.numero = "Saisissez le numéro de la facture.";
  else if (numero.length > NUMERO_MAX) erreurs.numero = "Ce numéro de facture est trop long.";

  // Déjà enregistrée : la ligne est ignorée, sans autre vérification. C'est ce qui rend l'import rejouable.
  if (!erreurs.numero && contexte.numerosExistants.has(numero)) return { ligne: brute.ligne, statut: "deja_importee", erreurs: {}, numero };

  const nom = espaces(brute.client);
  if (nom === "") erreurs.client = "Saisissez le nom du client.";
  else if (nom.length > NOM_MAX) erreurs.client = "Ce nom est trop long.";

  let whatsapp: string | null = null;
  if (brute.telephone.trim() !== "") {
    const t = normalizeTogoPhone(brute.telephone);
    if (t.ok) whatsapp = t.e164;
    else erreurs.telephone = t.error;
  }

  const montant = parserMontant(brute.montant);
  if (!montant.ok) erreurs.montant = montant.error;

  const echeance = parserDate(brute.echeance);
  if (!echeance.ok) erreurs.echeance = echeance.error;

  // Date de facture facultative : absente, on retombe sur le jour de l'import, et l'aperçu le dit.
  const aujourdhui = contexte.aujourdhui ?? jourDuJour();
  let dateFacture = aujourdhui;
  const dateFactureParDefaut = brute.dateFacture.trim() === "";
  if (!dateFactureParDefaut) {
    const d = parserDate(brute.dateFacture);
    if (d.ok) dateFacture = d.iso;
    else erreurs.dateFacture = d.error;
  }
  // Une échéance avant la date de facture est une faute de saisie : on la montre au lieu de la corriger en silence.
  if (!dateFactureParDefaut && !erreurs.dateFacture && echeance.ok && echeance.iso < dateFacture) {
    erreurs.echeance = "L'échéance est avant la date de facture. Vérifiez les deux dates.";
  }

  let email: string | null = null;
  if (brute.email.trim() !== "") {
    const e = emailSchema.safeParse(brute.email.trim());
    if (e.success) email = e.data;
    else erreurs.email = "Cette adresse e-mail n'est pas valide. Corrigez-la ou videz la case.";
  }

  const base: LigneAnalysee = {
    ligne: brute.ligne,
    statut: "erreur",
    erreurs,
    numero: numero || undefined,
    montant: montant.ok ? montant.valeur : undefined,
    echeance: echeance.ok ? echeance.iso : undefined,
    dateFacture: erreurs.dateFacture ? undefined : dateFacture,
    dateFactureParDefaut,
  };
  if (erreurs.client || erreurs.telephone) return base;

  // Résolution du client.
  const cle = cleClient(nom, whatsapp);
  base.cleClient = cle;
  const nomNormalise = normaliserNom(nom);
  const memeNom = contexte.clients.filter((c) => normaliserNom(c.nom) === nomNormalise);

  let candidats: ClientConnu[];
  let motif: string;
  if (whatsapp) {
    const memeNumero = contexte.clients.filter((c) => c.whatsapp === whatsapp);
    const exacts = memeNumero.filter((c) => normaliserNom(c.nom) === nomNormalise);
    if (exacts.length === 1) {
      return finaliser(base, { type: "existant", id: exacts[0].id, nom: exacts[0].nom }, "Client existant");
    }
    if (exacts.length > 1) {
      candidats = exacts;
      motif = "Plusieurs clients ont ce nom et ce numéro";
    } else if (memeNumero.length > 0) {
      candidats = memeNumero;
      motif = memeNumero.length === 1 ? "Ce numéro est déjà celui d'un autre client" : "Ce numéro est celui de plusieurs clients";
    } else if (memeNom.length > 0) {
      candidats = memeNom;
      motif = "Un client de ce nom existe avec un autre numéro";
    } else {
      return finaliser(base, { type: "nouveau", nom, whatsapp, email }, "Nouveau client");
    }
  } else {
    if (memeNom.length === 1) return finaliser(base, { type: "existant", id: memeNom[0].id, nom: memeNom[0].nom }, "Client existant");
    if (memeNom.length === 0) {
      base.erreurs.telephone = "Saisissez le numéro WhatsApp : ce client n'existe pas encore.";
      return base;
    }
    candidats = memeNom;
    motif = "Plusieurs clients portent ce nom";
  }

  // Cas ambigu : on ne devine pas. Le choix de l'utilisateur vaut pour toutes les lignes du même client.
  const choisi = choix[cle];
  if (choisi === NOUVEAU_CLIENT) {
    if (!whatsapp) {
      base.erreurs.telephone = "Saisissez le numéro WhatsApp pour créer un nouveau client.";
      return base;
    }
    return finaliser(base, { type: "nouveau", nom, whatsapp, email }, "Nouveau client");
  }
  const retenu = candidats.find((c) => c.id === choisi);
  if (retenu) return finaliser(base, { type: "existant", id: retenu.id, nom: retenu.nom }, "Client existant");
  // Une autre erreur sur la ligne (montant, date…) passe avant : elle est à corriger d'abord.
  return { ...base, statut: Object.keys(base.erreurs).length > 0 ? "erreur" : "a_choisir", candidats, noteClient: motif };
}

function finaliser(base: LigneAnalysee, client: ClientRetenu, noteClient: string): LigneAnalysee {
  if (Object.keys(base.erreurs).length > 0) return { ...base, noteClient };
  return { ...base, statut: "prete", client, noteClient };
}

/**
 * Analyse toutes les lignes : vérifie chaque ligne, puis les numéros en double DANS le fichier
 * (la première occurrence reste valable, les suivantes sont en erreur).
 */
export function analyserLignes(brutes: readonly LigneBrute[], contexte: ContexteAnalyse, choix: Choix = {}): Analyse {
  const vus = new Map<string, number>(); // numéro → première ligne qui le porte
  const lignes = brutes.map((brute) => {
    const analysee = analyserUneLigne(brute, contexte, choix);
    if (analysee.numero && !analysee.erreurs.numero) {
      const premiere = vus.get(analysee.numero);
      if (premiere === undefined) vus.set(analysee.numero, brute.ligne);
      else if (analysee.statut !== "deja_importee") {
        return {
          ...analysee,
          statut: "erreur" as const,
          erreurs: { ...analysee.erreurs, numero: `Ce numéro de facture apparaît déjà à la ligne ${premiere}.` },
          client: undefined,
        };
      }
    }
    return analysee;
  });

  const comptes: ComptesAnalyse = { pretes: 0, aCorriger: 0, dejaImportees: 0 };
  for (const l of lignes) {
    if (l.statut === "prete") comptes.pretes++;
    else if (l.statut === "deja_importee") comptes.dejaImportees++;
    else comptes.aCorriger++;
  }
  return { lignes, comptes };
}

/** « 247 prêtes, 3 à corriger » (et « 12 déjà importées » s'il y en a). */
export function resumerComptes({ pretes, aCorriger, dejaImportees }: ComptesAnalyse): string {
  const parties = [`${pretes} ${pretes > 1 ? "prêtes" : "prête"}`, `${aCorriger} à corriger`];
  if (dejaImportees > 0) parties.push(`${dejaImportees} déjà ${dejaImportees > 1 ? "importées" : "importée"}`);
  return parties.join(", ");
}
