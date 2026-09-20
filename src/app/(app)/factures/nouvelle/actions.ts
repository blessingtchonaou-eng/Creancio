"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creerFacture, type ResultatFacture } from "@/lib/factures";
import { MAX_FACTURES_PAR_ENVOI } from "@/lib/factures-saisie";
import { requireEntreprise } from "@/lib/session";

/**
 * Enregistre une ou plusieurs factures (plusieurs quand la file d'attente hors connexion se vide).
 * L'entreprise vient de la session ; chaque saisie est revalidée côté serveur et ne peut viser que cette entreprise.
 */

const texte = (max: number) => z.string().max(max);
const saisieSchema = z.object({
  cle: texte(100),
  numero: texte(200),
  montant: texte(100),
  dateFacture: texte(20),
  echeance: texte(20),
  client: z.discriminatedUnion("type", [
    z.object({ type: z.literal("existant"), id: texte(100) }),
    z.object({ type: z.literal("nouveau"), nom: texte(300), whatsapp: texte(100) }),
  ]),
  confirmerNumero: texte(30).optional(),
});

export type ReponseFactures = { resultats: { cle: string; resultat: ResultatFacture }[] } | { error: string };

export async function enregistrerFactures(saisies: unknown): Promise<ReponseFactures> {
  const { entrepriseId } = await requireEntreprise();
  const entree = z.array(saisieSchema).min(1).max(MAX_FACTURES_PAR_ENVOI).safeParse(saisies);
  if (!entree.success) return { error: "La facture n'a pas pu être envoyée. Rechargez la page et recommencez." };

  try {
    const resultats: { cle: string; resultat: ResultatFacture }[] = [];
    // Une par une : le numéro d'une facture doit être libre avant de passer à la suivante.
    for (const saisie of entree.data) resultats.push({ cle: saisie.cle, resultat: await creerFacture(entrepriseId, saisie) });
    if (resultats.some((r) => r.resultat.ok)) {
      revalidatePath("/factures");
      revalidatePath("/clients");
      revalidatePath("/tableau-de-bord");
    }
    return { resultats };
  } catch (e) {
    console.error("Enregistrement de facture impossible", e);
    return { error: "L'enregistrement a échoué et rien n'a été enregistré. Réessayez dans un instant." };
  }
}
