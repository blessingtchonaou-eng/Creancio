import { parserDate } from "@/lib/import/date";
import { parserMontant } from "@/lib/import/montant";
import { normalizeTogoPhone } from "@/lib/phone";

/**
 * Saisie rapide d'une facture : règles partagées par le formulaire (validation immédiate, même hors connexion)
 * et par le serveur (qui revalide tout, sans rien croire du navigateur). Fichier sans accès à la base de données.
 */

export const NUMERO_MAX = 50;
export const NOM_MAX = 120;
/** Nombre maximal de factures envoyées d'un coup (file d'attente hors connexion). */
export const MAX_FACTURES_PAR_ENVOI = 50;

/** Ce que le formulaire envoie : du texte, comme l'utilisateur l'a tapé. */
export interface SaisieFacture {
  /** Identifiant tiré par le navigateur : sert à suivre la facture dans la file d'attente hors connexion. */
  cle: string;
  numero: string;
  montant: string;
  dateFacture: string; // AAAA-MM-JJ
  echeance: string; // AAAA-MM-JJ
  client: { type: "existant"; id: string } | { type: "nouveau"; nom: string; whatsapp: string };
  /** Numéro WhatsApp (E.164) que l'utilisateur a confirmé « créer quand même » alors qu'un autre client l'a déjà. */
  confirmerNumero?: string;
}

export type ChampSaisie = "numero" | "montant" | "dateFacture" | "echeance" | "client" | "nom" | "whatsapp";

export interface FactureValide {
  numero: string;
  montant: number;
  dateFacture: string;
  echeance: string;
  client: { type: "existant"; id: string } | { type: "nouveau"; nom: string; whatsapp: string };
}

export type ResultatValidation = { ok: true; valeur: FactureValide } | { ok: false; erreurs: Partial<Record<ChampSaisie, string>> };

const espaces = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();

export function validerSaisie(saisie: SaisieFacture): ResultatValidation {
  const erreurs: Partial<Record<ChampSaisie, string>> = {};

  const numero = espaces(saisie.numero);
  if (numero === "") erreurs.numero = "Saisissez le numéro de la facture.";
  else if (numero.length > NUMERO_MAX) erreurs.numero = "Ce numéro de facture est trop long.";

  const montant = parserMontant(saisie.montant);
  if (!montant.ok) erreurs.montant = montant.error;

  const dateFacture = parserDate(saisie.dateFacture);
  if (!dateFacture.ok) erreurs.dateFacture = "Choisissez la date de la facture.";
  const echeance = parserDate(saisie.echeance);
  if (!echeance.ok) erreurs.echeance = "Choisissez la date d'échéance.";
  if (dateFacture.ok && echeance.ok && echeance.iso < dateFacture.iso) {
    erreurs.echeance = "L'échéance doit venir après la date de facture. Si la facture est ancienne, changez aussi sa date.";
  }

  let client: FactureValide["client"] | undefined;
  if (saisie.client.type === "existant") {
    if (saisie.client.id === "") erreurs.client = "Choisissez un client, ou créez-en un.";
    else client = { type: "existant", id: saisie.client.id };
  } else {
    const nom = espaces(saisie.client.nom);
    if (nom === "") erreurs.nom = "Saisissez le nom du client.";
    else if (nom.length > NOM_MAX) erreurs.nom = "Ce nom est trop long.";
    const tel = normalizeTogoPhone(saisie.client.whatsapp);
    if (!tel.ok) erreurs.whatsapp = tel.error;
    if (!erreurs.nom && tel.ok) client = { type: "nouveau", nom, whatsapp: tel.e164 };
  }

  if (Object.keys(erreurs).length > 0 || !montant.ok || !dateFacture.ok || !echeance.ok || !client) return { ok: false, erreurs };
  return { ok: true, valeur: { numero, montant: montant.valeur, dateFacture: dateFacture.iso, echeance: echeance.iso, client } };
}

/** « 1250000 » → « 1 250 000 » pendant la frappe. Ne garde que les chiffres, sans zéros au début. */
export function formaterSaisieMontant(texte: string): string {
  const chiffres = texte.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return chiffres.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Prochain numéro « FA-AAAA-NNNN » : le plus grand numéro de l'année déjà utilisé, plus un. À modifier librement. */
export function suggererNumero(numeros: readonly string[], annee: number): string {
  const motif = new RegExp(`^FA-${annee}-(\\d+)$`);
  let max = 0;
  for (const n of numeros) {
    const m = motif.exec(n);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `FA-${annee}-${String(max + 1).padStart(4, "0")}`;
}

/** Numéro qui suit celui qu'on vient d'enregistrer (« FA-2026-0007 » → « FA-2026-0008 »), ou null si le format est libre. */
export function numeroSuivant(numero: string): string | null {
  const m = /^(.*?)(\d+)$/.exec(numero);
  if (!m) return null;
  const suite = String(Number(m[2]) + 1).padStart(m[2].length, "0");
  return `${m[1]}${suite}`;
}

export const versISO = (d: Date) => d.toISOString().slice(0, 10);
