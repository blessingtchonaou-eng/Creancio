"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";
import type { FormState } from "@/lib/form-state";

export interface ClientInitial {
  nom: string;
  whatsapp: string; // sans le +228 : « 90 12 34 56 »
  email: string;
}

interface Props {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  initial?: ClientInitial;
}

/** Formulaire d'un client, partagé par l'onboarding, la création et la modification. */
export function ClientForm({ action, submitLabel, initial }: Props) {
  const [state, formAction] = useActionState(action, {});
  const err = state.fieldErrors ?? {};
  const val = (name: keyof ClientInitial) => state.values?.[name] ?? initial?.[name];
  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.error && <Toast tone="danger" title={state.error} />}
      <Field label="Nom du client" name="nom" autoComplete="off" defaultValue={val("nom")} error={err.nom} />
      <Field
        label="Numéro WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        prefix="+228"
        placeholder="90 12 34 56"
        defaultValue={val("whatsapp")}
        error={err.whatsapp}
        help="C'est sur ce numéro que les relances seront envoyées."
      />
      <Field label="E-mail (facultatif)" name="email" type="email" inputMode="email" autoComplete="off" defaultValue={val("email")} error={err.email} />
      <SubmitButton size="lg">{submitLabel}</SubmitButton>
    </form>
  );
}
