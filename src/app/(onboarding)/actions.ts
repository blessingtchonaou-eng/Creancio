"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  avancerOnboarding,
  creerEntrepriseEtRattacher,
  ETAPE_CLIENT,
  ETAPE_FACTURES,
  ETAPE_TERMINEE,
  urlEtape,
} from "@/lib/entreprise";
import { fieldErrorsFrom, stringValues, type FormState } from "@/lib/form-state";
import { requireEntreprise, requireUser } from "@/lib/session";
import { clientSchema } from "@/lib/validation/client";
import { entrepriseSchema } from "@/lib/validation/entreprise";

/**
 * Étape 1 : crée l'entreprise (l'utilisateur en devient l'ADMIN) ou, si on revient en arrière,
 * met à jour la sienne. L'entreprise modifiée est toujours celle de la session.
 */
export async function enregistrerEntreprise(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const values = stringValues(formData);
  const parsed = entrepriseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  if (user.entrepriseId) {
    const { entrepriseId } = await requireEntreprise();
    await db.entreprise.update({ where: { id: entrepriseId }, data: parsed.data });
  } else {
    await creerEntrepriseEtRattacher(user.id, parsed.data);
  }
  redirect(urlEtape(ETAPE_CLIENT));
}

/** Étape 2 : ajoute le premier client, puis passe à l'étape 3. */
export async function ajouterPremierClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const { entrepriseId } = await requireEntreprise();

  const values = stringValues(formData);
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  await db.client.create({ data: { ...parsed.data, entrepriseId } });
  await avancerOnboarding(entrepriseId, ETAPE_FACTURES);
  redirect(urlEtape(ETAPE_FACTURES));
}

/** « Passer pour l'instant » à l'étape 2. */
export async function passerEtapeClient() {
  const { entrepriseId } = await requireEntreprise();
  await avancerOnboarding(entrepriseId, ETAPE_FACTURES);
  redirect(urlEtape(ETAPE_FACTURES));
}

/** « Passer pour l'instant » à l'étape 3 : l'onboarding est terminé. */
export async function passerEtapeFactures() {
  const { entrepriseId } = await requireEntreprise();
  await avancerOnboarding(entrepriseId, ETAPE_TERMINEE);
  redirect("/tableau-de-bord");
}

/** Étape 3 : termine l'onboarding et ouvre l'import Excel. */
export async function terminerVersImport() {
  const { entrepriseId } = await requireEntreprise();
  await avancerOnboarding(entrepriseId, ETAPE_TERMINEE);
  redirect("/factures/import");
}

/** Étape 3 : termine l'onboarding et ouvre la saisie rapide d'une facture. */
export async function terminerVersSaisie() {
  const { entrepriseId } = await requireEntreprise();
  await avancerOnboarding(entrepriseId, ETAPE_TERMINEE);
  redirect("/factures/nouvelle");
}
