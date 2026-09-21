import { db } from "@/lib/db";

/** Au plus 3 liens de réinitialisation par adresse et par heure, quelle que soit l'origine de la demande. */
export const MAX_LIENS_PAR_HEURE = 3;
const HEURE = 60 * 60 * 1000;
const PREFIXE_JETON = "reset-password:";

/**
 * Appelée par le rappel sendResetPassword, donc pour TOUTE demande (page, route publique /api/auth/request-password-reset,
 * appel direct) : le contrôle ne peut pas être contourné en évitant nos pages.
 * Better Auth a déjà créé le jeton quand on arrive ici : on le compte avec les autres. Au-delà de la limite,
 * on retire ce jeton (il ne doit pas rester valable) et on n'envoie rien. La réponse à l'internaute reste la même.
 * (Deux demandes exactement simultanées peuvent dépasser la limite d'une unité : l'erreur va dans le sens « moins d'e-mails ».)
 */
export async function autoriserLien(userId: string, jeton: string, maintenant = new Date()): Promise<boolean> {
  const recents = await db.verification.count({
    where: { identifier: { startsWith: PREFIXE_JETON }, value: userId, createdAt: { gte: new Date(maintenant.getTime() - HEURE) } },
  });
  if (recents <= MAX_LIENS_PAR_HEURE) return true;
  await db.verification.deleteMany({ where: { identifier: `${PREFIXE_JETON}${jeton}` } });
  return false;
}

/**
 * Même limite pour les e-mails de confirmation d'adresse (leur jeton n'est pas en base : on tient un registre dans la table
 * Verification, expiré au bout d'une heure). Renvoie faux quand la limite est atteinte.
 */
export async function reserverEnvoiVerification(userId: string, maintenant = new Date()): Promise<boolean> {
  const identifier = `limite-verification:${userId}`;
  await db.verification.deleteMany({ where: { identifier, expiresAt: { lt: maintenant } } });
  const recents = await db.verification.count({ where: { identifier } });
  if (recents >= MAX_LIENS_PAR_HEURE) return false;
  await db.verification.create({ data: { identifier, value: "1", expiresAt: new Date(maintenant.getTime() + HEURE) } });
  return true;
}
