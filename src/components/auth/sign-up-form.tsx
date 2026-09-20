"use client";

import { useActionState } from "react";
import { inscription } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";

export function SignUpForm() {
  const [state, action] = useActionState(inscription, {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Toast tone="danger" title={state.error} />}
      <Field label="Votre nom" name="nom" autoComplete="name" defaultValue={state.values?.nom} error={err.nom} />
      <Field
        label="Adresse e-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        defaultValue={state.values?.email}
        error={err.email}
      />
      <PasswordField label="Mot de passe" name="password" autoComplete="new-password" help="Au moins 8 caractères." error={err.password} />
      <SubmitButton size="lg">Créer mon compte</SubmitButton>
    </form>
  );
}
