"use client";

import { useActionState } from "react";
import { reinitialiserMotDePasse } from "@/app/(auth)/actions";
import { PasswordField } from "@/components/ui/password-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(reinitialiserMotDePasse, {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Toast tone="danger" title={state.error} />}
      <input type="hidden" name="token" value={token} />
      <PasswordField label="Nouveau mot de passe" name="password" autoComplete="new-password" help="Au moins 8 caractères." error={err.password} />
      <SubmitButton size="lg">Enregistrer le nouveau mot de passe</SubmitButton>
    </form>
  );
}
