import { envoyerEmail, type Courriel } from "@/lib/email";
import { courrielReinitialisation, courrielVerification } from "@/lib/email/modeles";
import { autoriserLien, reserverEnvoiVerification } from "@/lib/reinitialisation";

/** Une panne d'envoi ne doit jamais changer la réponse faite à l'internaute : elle dirait que le compte existe. On la journalise sans le lien. */
export async function envoyerSansEchec(courriel: Courriel) {
  try {
    await envoyerEmail(courriel);
  } catch (e) {
    console.error(`[auth] e-mail « ${courriel.sujet} » non envoyé : ${e instanceof Error ? e.message : "erreur inconnue"}`);
  }
}

type Utilisateur = { id: string; name: string; email: string };

/**
 * Rappel de Better Auth pour « mot de passe oublié » : appelé pour TOUTE demande, y compris directement sur la route publique
 * /api/auth/request-password-reset. C'est donc ici (et pas dans une action de page) que la limite de 3 liens par heure et par adresse s'applique.
 * Renvoie l'e-mail à envoyer, ou null quand la limite est atteinte (le jeton est alors retiré). L'envoi lui-même n'est pas attendu
 * (voir plus bas) : la réponse met le même temps que l'adresse existe ou non.
 */
export async function preparerReinitialisation({ user, url, token }: { user: Utilisateur; url: string; token: string }): Promise<Courriel | null> {
  if (!(await autoriserLien(user.id, token))) return null;
  return courrielReinitialisation(user.email, user.name, url);
}

export async function preparerVerification({ user, url }: { user: Utilisateur; url: string }): Promise<Courriel | null> {
  if (!(await reserverEnvoiVerification(user.id))) return null;
  return courrielVerification(user.email, user.name, url);
}

