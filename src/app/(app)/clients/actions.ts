"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { creerClient, modifierClient } from "@/lib/clients";
import { doublonConfirme, etatDoublon } from "@/lib/clients-form";
import { fieldErrorsFrom, stringValues, type FormState } from "@/lib/form-state";
import { requireEntreprise } from "@/lib/session";
import { clientSchema } from "@/lib/validation/client";

/** Crée un client dans l'entreprise de l'utilisateur, puis ouvre sa fiche. Un numéro déjà utilisé demande une confirmation. */
export async function creerClientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { entrepriseId } = await requireEntreprise();

  const values = stringValues(formData);
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const r = await creerClient(entrepriseId, parsed.data, { confirmerDoublon: doublonConfirme(formData, parsed.data.whatsapp) });
  if (!r.ok) return etatDoublon(values, parsed.data.whatsapp, r.doublon);
  revalidatePath("/clients");
  redirect(`/clients/${r.id}`);
}

/** Modifie un client. L'entreprise vient de la session : l'identifiant d'un client d'une autre entreprise donne une page introuvable. */
export async function modifierClientAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { entrepriseId } = await requireEntreprise();

  const values = stringValues(formData);
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  const r = await modifierClient(entrepriseId, id, parsed.data, { confirmerDoublon: doublonConfirme(formData, parsed.data.whatsapp) });
  if (!r.ok) {
    if ("introuvable" in r) notFound();
    return etatDoublon(values, parsed.data.whatsapp, r.doublon);
  }
  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}
