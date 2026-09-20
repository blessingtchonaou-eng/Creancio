import { db } from "@/lib/db";

interface NouvelleEntreprise {
  raisonSociale: string;
  nif: string | null;
  telephone: string;
}

/**
 * Crée l'entreprise et en fait l'utilisateur l'ADMIN, en une transaction.
 * Réussit seulement si l'utilisateur n'a pas encore d'entreprise (mise à jour conditionnelle sur
 * entrepriseId = null) : impossible de se rattacher une deuxième fois, ni de prendre le rôle ADMIN
 * d'une entreprise existante. Renvoie false, sans rien créer, si l'utilisateur est déjà rattaché.
 */
export async function creerEntrepriseEtRattacher(userId: string, data: NouvelleEntreprise): Promise<boolean> {
  try {
    await db.$transaction(async (tx) => {
      const entreprise = await tx.entreprise.create({ data });
      const rattache = await tx.utilisateur.updateMany({
        where: { id: userId, entrepriseId: null },
        data: { entrepriseId: entreprise.id, role: "ADMIN" },
      });
      if (rattache.count !== 1) throw new DejaRattache();
    });
    return true;
  } catch (e) {
    if (e instanceof DejaRattache) return false; // la transaction est annulée : l'entreprise n'est pas créée
    throw e;
  }
}

class DejaRattache extends Error {}

/** Étapes de l'onboarding : la valeur stockée est la prochaine étape à faire. */
export const ETAPE_CLIENT = 2;
export const ETAPE_FACTURES = 3;
export const ETAPE_TERMINEE = 4;

/** Écran de reprise pour une étape donnée. */
export function urlEtape(etape: number): string {
  if (etape <= 1) return "/bienvenue";
  if (etape === ETAPE_CLIENT) return "/bienvenue/clients";
  if (etape === ETAPE_FACTURES) return "/bienvenue/factures";
  return "/tableau-de-bord";
}

/** Fait avancer l'onboarding, jamais reculer : revenir en arrière ne fait rien perdre. */
export async function avancerOnboarding(entrepriseId: string, etape: number): Promise<void> {
  await db.entreprise.updateMany({ where: { id: entrepriseId, etapeOnboarding: { lt: etape } }, data: { etapeOnboarding: etape } });
}
