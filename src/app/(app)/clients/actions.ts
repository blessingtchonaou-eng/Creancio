"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { creerClient, modifierClient } from "@/lib/clients";
import { fieldErrorsFrom, stringValues, type FormState } from "@/lib/form-state";
import { requireEntreprise } from "@/lib/session";
import { clientSchema } from "@/lib/validation/client";

/** Crée un client dans l'entreprise de l'utilisateur, puis ouvre sa fiche. */
export async function creerClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { entrepriseId } = await requireEntreprise();

  const values = stringValues(formData);
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const r = await creerClient(entrepriseId, parsed.data);
  if (!r.ok) return { fieldErrors: { whatsapp: r.error }, values };
  revalidatePath("/clients");
  redirect(`/clients/${r.id}`);
}

/** Modifie un client. L'entreprise vient de la session : l'identifiant d'un client d'une autre entreprise donne une page introuvable. */
export async function modifierClientAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { entrepriseId } = await requireEntreprise();

  const values = stringValues(formData);
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const r = await modifierClient(entrepriseId, id, parsed.data);
  if (!r.ok) {
    if (r.introuvable) notFound();
    return { fieldErrors: { whatsapp: r.error }, values };
  }
  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}
