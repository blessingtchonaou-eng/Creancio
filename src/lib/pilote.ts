import { timingSafeEqual } from "node:crypto";
import { CONSENTEMENT_ACTUEL, landing } from "@/content/landing";
import { db } from "@/lib/db";
import { fieldErrorsFrom, type FormState } from "@/lib/form-state";
import { empreinte } from "@/lib/limite-debit";
import { palierPilote } from "@/lib/limite-pilote";
import { demandePiloteSchema, type DemandePiloteValide } from "@/lib/validation/pilote";

/**
 * Formulaire « Rejoindre le pilote » de la page d'accueil, sans captcha. Ordre des contrôles :
 *   1. champ piège rempli                 → faux succès, rien d'enregistré, ne compte pas dans la limite ;
 *   2. validation                         → erreurs par champ (une personne qui se trompe est corrigée), ne compte pas ;
 *   3. jeton horodaté de plus de 24 h     → « le formulaire a expiré », un nouveau jeton est renvoyé ;
 *   4. paliers par IP (limite-pilote.ts)  → au-delà de 100 envois valides / heure : faux succès, rien d'enregistré ;
 *   5. enregistrement : en SUSPECTE si le palier est « suspect » (21 à 100), si l'envoi arrive moins de 3 s après
 *      l'affichage ou si le jeton est invalide ; sinon normalement. Toujours le même message de succès.
 */

export const CHAMP_PIEGE = "site_web";
export const SUCCES_PILOTE = "demande-envoyee";

const DELAI_MINIMUM_MS = 3_000;
const VALIDITE_JETON_MS = 24 * 60 * 60 * 1000;
/** Tolérance d'horloge entre deux serveurs (jeton créé sur l'un, lu sur l'autre). */
const AVANCE_TOLEREE_MS = 60_000;

const estViolationUnicite = (e: unknown) => typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";

const signature = (horodatage: string) => empreinte(`formulaire-pilote:${horodatage}`);

/** Jeton posé dans le formulaire au rendu de la page : l'heure d'affichage, signée (non falsifiable, marche sans JavaScript). */
export function creerJetonFormulaire(maintenant = Date.now()): string {
  const horodatage = String(maintenant);
  return `${horodatage}.${signature(horodatage)}`;
}

export type EtatJeton = "valide" | "trop-rapide" | "invalide" | "expire";

export function lireJetonFormulaire(jeton: unknown, maintenant = Date.now()): EtatJeton {
  if (typeof jeton !== "string") return "invalide";
  const [horodatage, sig] = jeton.split(".");
  if (!horodatage || !sig || !/^\d{13}$/.test(horodatage)) return "invalide";
  const attendue = Buffer.from(signature(horodatage));
  const recue = Buffer.from(sig);
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) return "invalide";
  const age = maintenant - Number(horodatage);
  if (age < -AVANCE_TOLEREE_MS) return "invalide";
  if (age > VALIDITE_JETON_MS) return "expire";
  if (age < DELAI_MINIMUM_MS) return "trop-rapide";
  return "valide";
}

/**
 * Une demande par numéro WhatsApp.
 * - Envoi normal : crée la demande (NOUVELLE) ou met à jour l'existante en gardant son statut et sa note ; une demande
 *   ABANDONNEE ou SUSPECTE repasse en NOUVELLE (la personne s'est manifestée normalement).
 * - Envoi suspect : crée la demande en SUSPECTE si le numéro est inconnu, et ne touche JAMAIS une demande existante
 *   (une rafale ne doit pas pouvoir écraser le nom d'un vrai prospect ni déclasser sa demande).
 * La preuve du consentement (version de la phrase, date) est écrite à chaque envoi enregistré.
 */
export async function enregistrerDemande(d: DemandePiloteValide, { suspecte }: { suspecte: boolean }, maintenant = new Date()) {
  const consentement = { consentement: true, consentementVersion: CONSENTEMENT_ACTUEL, consentementLe: maintenant };
  const creation = { nomEntreprise: d.nomEntreprise, whatsapp: d.whatsapp, facturesParMois: d.facturesParMois ?? null, ...consentement };

  if (suspecte) {
    await db.demandePilote.createMany({ data: [{ ...creation, statut: "SUSPECTE" }], skipDuplicates: true });
    return;
  }
  try {
    await db.$transaction([
      db.demandePilote.upsert({
        where: { whatsapp: d.whatsapp },
        create: creation,
        update: { nomEntreprise: d.nomEntreprise, ...(d.facturesParMois ? { facturesParMois: d.facturesParMois } : {}), ...consentement },
      }),
      db.demandePilote.updateMany({ where: { whatsapp: d.whatsapp, statut: { in: ["ABANDONNEE", "SUSPECTE"] } }, data: { statut: "NOUVELLE" } }),
    ]);
  } catch (e) {
    // Deux envois simultanés du même numéro : l'autre a créé la demande, celle-ci existe donc bien.
    if (!estViolationUnicite(e)) throw e;
  }
}

/** Traite un envoi du formulaire. `ip` : adresse du visiteur (lireIpClient), null si illisible. */
export async function traiterDemandePilote(formData: FormData, ip: string | null, maintenant = new Date()): Promise<FormState> {
  const succes: FormState = { success: SUCCES_PILOTE };
  const piege = formData.get(CHAMP_PIEGE);
  if (typeof piege === "string" && piege !== "") return succes;

  const values: Record<string, string> = {};
  for (const champ of ["nomEntreprise", "whatsapp", "facturesParMois", "consentement"]) {
    const v = formData.get(champ);
    if (typeof v === "string") values[champ] = v;
  }
  const parsed = demandePiloteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const jeton = lireJetonFormulaire(formData.get("jeton"), maintenant.getTime());
  if (jeton === "expire") return { error: landing.pilote.erreurs.expire, values, jeton: creerJetonFormulaire(maintenant.getTime()) };

  try {
    const palier = await palierPilote(ip);
    if (palier === "bloque") return succes;
    await enregistrerDemande(parsed.data, { suspecte: palier === "suspect" || jeton !== "valide" }, maintenant);
  } catch (e) {
    console.error("Formulaire pilote : envoi non enregistré.", e);
    return { error: landing.pilote.erreurs.generale, values };
  }
  return succes;
}
