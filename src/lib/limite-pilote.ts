import { empreinte, incrementer } from "@/lib/limite-debit";
import { groupeIp } from "@/lib/ip-client";

/**
 * Limite du formulaire pilote de la page d'accueil, par IP, à trois paliers (les IP sont souvent partagées au Togo :
 * CGNAT mobile, bureaux). Toute tentative compte, pas seulement les échecs : il n'y a pas de notion d'échec ici.
 *   - jusqu'à 20 envois / heure : normal, la demande est enregistrée
 *   - de 21 à 100                : suspect, enregistrée avec le statut SUSPECTE (masquée par défaut dans /admin/pilote)
 *   - au-delà de 100             : bloqué, faux succès affiché au visiteur, rien n'est enregistré
 */
export type PalierPilote = "normal" | "suspect" | "bloque";

const FENETRE = 60 * 60;
const SEUIL_SUSPECT = 20;
const SEUIL_BLOQUE = 100;

/** Sans IP lisible (proxy mal configuré), tous les visiteurs partagent un même compteur : mieux qu'aucune limite. */
const IP_INCONNUE = "ip-inconnue";

export async function palierPilote(ip: string | null): Promise<PalierPilote> {
  const reseau = ip ? groupeIp(ip) : IP_INCONNUE;
  const { compteur } = await incrementer(`pilote:ip:${empreinte(reseau)}`, FENETRE);
  if (compteur > SEUIL_BLOQUE) return "bloque";
  if (compteur > SEUIL_SUSPECT) return "suspect";
  return "normal";
}
