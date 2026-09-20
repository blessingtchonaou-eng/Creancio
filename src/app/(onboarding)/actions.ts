"use server";

import { redirect } from "next/navigation";
import { creerEntrepriseEtRattacher } from "@/lib/entreprise";
import { fieldErrorsFrom, stringValues, type FormState } from "@/lib/form-state";
import { requireUser } from "@/lib/session";
import { entrepriseSchema } from "@/lib/validation/entreprise";

/** Étape 1 de l'onboarding : crée l'entreprise, l'utilisateur en devient l'ADMIN. */
export async function creerEntreprise(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.entrepriseId) redirect("/tableau-de-bord");

  const values = stringValues(formData);
  const parsed = entrepriseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  await creerEntrepriseEtRattacher(user.id, parsed.data);
  redirect("/tableau-de-bord");
}
