import { empreinte, incrementer, lireCompteur, oublier, type Fenetre } from "@/lib/limite-debit";
import { groupeIp } from "@/lib/ip-client";

/**
 * Limites sur les ÉCHECS de connexion et d'inscription. Seuls les échecs comptent : une réussite ne consomme rien.
 * Les adresses IP sont souvent partagées au Togo (réseau mobile, bureaux) : la limite par IP seule est donc large, et c'est
 * le couple IP + adresse qui protège un compte précis.
 *   - par IP                       : 20 échecs / 15 min (toutes adresses confondues)
 *   - par couple IP + adresse      : 10 échecs / 15 min
 *   - par adresse, toutes IP       : 50 échecs / heure (attaque répartie sur beaucoup d'IP)
 * Le refus ne dit jamais laquelle des limites a joué, ni si le compte existe : mêmes compteurs et même message dans tous les cas.
 * (Une adresse inexistante est comptée comme une adresse qui existe.)
 */
export type Operation = "connexion" | "inscription";
export const LIMITES = {
  ip: { fenetre: 15 * 60, max: 20 },
  couple: { fenetre: 15 * 60, max: 10 },
  adresse: { fenetre: 60 * 60, max: 50 },
} as const satisfies Record<string, Fenetre>;

/** Sans IP lisible (proxy mal configuré), tous les visiteurs partagent un même compteur : mieux qu'aucune limite. */
const IP_INCONNUE = "ip-inconnue";

export function clesLimites(operation: Operation, ip: string | null, email: string) {
  const adresse = email.trim().toLowerCase().slice(0, 320);
  const reseau = ip ? groupeIp(ip) : IP_INCONNUE;
  return {
    ip: `${operation}:ip:${empreinte(reseau)}`,
    couple: `${operation}:couple:${empreinte(`${reseau}|${adresse}`)}`,
    adresse: `${operation}:adresse:${empreinte(adresse)}`,
  };
}

/** Un seul message pour les trois limites : il ne dit ni laquelle a joué, ni si le compte existe. */
export const MESSAGE_TROP_DE_TENTATIVES = "Trop de tentatives. Patientez quelques minutes, puis réessayez.";

/** Avant de tenter : renvoie null si c'est permis, sinon la durée d'attente en minutes (pour les tests et les journaux : elle n'est pas montrée au visiteur). */
export async function attenteAvantTentative(operation: Operation, ip: string | null, email: string): Promise<number | null> {
  const k = clesLimites(operation, ip, email);
  const [a, b, c] = await Promise.all([lireCompteur(k.ip), lireCompteur(k.couple), lireCompteur(k.adresse)]);
  let attente = 0;
  if (a && a.compteur >= LIMITES.ip.max) attente = Math.max(attente, a.resteSecondes);
  if (b && b.compteur >= LIMITES.couple.max) attente = Math.max(attente, b.resteSecondes);
  if (c && c.compteur >= LIMITES.adresse.max) attente = Math.max(attente, c.resteSecondes);
  return attente > 0 ? Math.max(1, Math.ceil(attente / 60)) : null;
}

/** Après un échec : les trois compteurs montent d'un cran. */
export async function enregistrerEchec(operation: Operation, ip: string | null, email: string): Promise<void> {
  const k = clesLimites(operation, ip, email);
  await Promise.all([incrementer(k.ip, LIMITES.ip.fenetre), incrementer(k.couple, LIMITES.couple.fenetre), incrementer(k.adresse, LIMITES.adresse.fenetre)]);
}

/**
 * Après une réussite : seul le compteur du couple IP + adresse repart à zéro (le visiteur a prouvé qu'il connaît le mot de passe
 * de CETTE adresse). Ni le compteur de l'IP ni celui de l'adresse ne bougent : sinon un attaquant réussissant une connexion sur son
 * propre compte remettrait à zéro les limites qui le concernent.
 */
export async function reussite(operation: Operation, ip: string | null, email: string): Promise<void> {
  await oublier(clesLimites(operation, ip, email).couple);
}
