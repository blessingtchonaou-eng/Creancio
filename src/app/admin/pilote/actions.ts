"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { STATUTS_DEMANDE } from "@/lib/statuts-pilote";
import { db } from "@/lib/db";
import { fieldErrorsFrom, type FormState } from "@/lib/form-state";
import { creerInvitation } from "@/lib/invitation-pilote";
import { requireAdminPlateforme } from "@/lib/session";

const MESSAGES_REFUS: Record<"introuvable" | "deja_inscrite" | "abandonnee" | "suspecte", string> = {
  introuvable: "Cette demande n'existe plus.",
  deja_inscrite: "Cette demande a déjà un compte : inutile de créer un nouveau lien.",
  abandonnee: "Cette demande a été abandonnée : inutile de créer un lien.",
  suspecte: "Cette demande est suspecte : passez-la d'abord en « Nouvelle » ou « Contactée ».",
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

const miseAJourSchema = z.object({
  statut: z.enum(STATUTS_DEMANDE, { message: "Choisissez un statut dans la liste." }),
  note: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().max(500, "La note ne peut pas dépasser 500 caractères.")),
});

/** Statut et note d'une demande. La note est du texte libre, affiché échappé (jamais interprété comme du HTML). */
export async function mettreAJourDemandeAction(demandePiloteId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdminPlateforme();
  const values = { statut: String(formData.get("statut") ?? ""), note: String(formData.get("note") ?? "") };
  const parsed = miseAJourSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const { count } = await db.demandePilote.updateMany({
    where: { id: demandePiloteId },
    data: { statut: parsed.data.statut, note: parsed.data.note === "" ? null : parsed.data.note },
  });
  if (count === 0) notFound();
  revalidatePath("/admin/pilote");
  return { success: "Demande mise à jour." };
}
