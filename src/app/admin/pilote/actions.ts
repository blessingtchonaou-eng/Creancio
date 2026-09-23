"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/lib/form-state";
import { creerInvitation } from "@/lib/invitation-pilote";
import { requireAdminPlateforme } from "@/lib/session";

const MESSAGES_REFUS: Record<"introuvable" | "deja_inscrite" | "abandonnee", string> = {
  introuvable: "Cette demande n'existe plus.",
  deja_inscrite: "Cette demande a déjà un compte : inutile de créer un nouveau lien.",
  abandonnee: "Cette demande a été abandonnée : inutile de créer un lien.",
};

/** Chaque action de /admin revérifie l'accès : un identifiant de Server Action est un point d'entrée public (voir src/lib/session.ts). */
export async function creerInvitationAction(demandePiloteId: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  const admin = await requireAdminPlateforme();
  const resultat = await creerInvitation(demandePiloteId, admin.id);
  if (!resultat.ok) return { error: MESSAGES_REFUS[resultat.raison] };

  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const url = `${base}/inscription?invitation=${encodeURIComponent(resultat.jeton)}`;
  revalidatePath("/admin/pilote");
  return { invitationCreee: { url, expireLe: resultat.expireLe.toISOString() } };
}
