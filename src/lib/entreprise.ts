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
