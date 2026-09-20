"use client";

import { useActionState } from "react";
import { connexion } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";

export function SignInForm({ suite }: { suite?: string }) {
  const [state, action] = useActionState(connexion, {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Toast tone="danger" title={state.error} />}
      {suite && <input type="hidden" name="suite" value={suite} />}
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
      <PasswordField label="Mot de passe" name="password" autoComplete="current-password" error={err.password} />
      <SubmitButton size="lg">Me connecter</SubmitButton>
    </form>
  );
}
