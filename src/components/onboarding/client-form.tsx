"use client";

import { useActionState } from "react";
import { ajouterPremierClient } from "@/app/(onboarding)/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";

export function ClientForm() {
  const [state, action] = useActionState(ajouterPremierClient, {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Toast tone="danger" title={state.error} />}
      <Field label="Nom du client" name="nom" autoComplete="off" defaultValue={state.values?.nom} error={err.nom} />
      <Field
        label="Numéro WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        prefix="+228"
        placeholder="90 12 34 56"
        defaultValue={state.values?.whatsapp}
        error={err.whatsapp}
        help="C'est sur ce numéro que les relances seront envoyées."
      />
      <Field label="E-mail (facultatif)" name="email" type="email" inputMode="email" autoComplete="off" defaultValue={state.values?.email} error={err.email} />
      <SubmitButton size="lg">Ajouter ce client</SubmitButton>
    </form>
  );
}
