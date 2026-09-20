"use client";

import { useActionState } from "react";
import { creerEntreprise } from "@/app/(onboarding)/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";

export function EntrepriseForm() {
  const [state, action] = useActionState(creerEntreprise, {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Toast tone="danger" title={state.error} />}
      <Field label="Nom de l'entreprise" name="raisonSociale" autoComplete="organization" defaultValue={state.values?.raisonSociale} error={err.raisonSociale} />
      <Field
        label="NIF (facultatif)"
        name="nif"
        autoCapitalize="characters"
        defaultValue={state.values?.nif}
        error={err.nif}
        help="Numéro d'identification fiscale. Vous pourrez l'ajouter plus tard."
      />
      <Field
        label="Téléphone de l'entreprise"
        name="telephone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        prefix="+228"
        placeholder="90 12 34 56"
        defaultValue={state.values?.telephone}
        error={err.telephone}
      />
      <SubmitButton size="lg">Enregistrer mon entreprise</SubmitButton>
    </form>
  );
}
