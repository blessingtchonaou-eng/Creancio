"use client";

import Link from "next/link";
import { useActionState } from "react";
import { demanderReinitialisation } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(demanderReinitialisation, {});
  const err = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <Toast tone="success" title={state.success}>
          Le lien est valable 1 heure. Regardez aussi dans vos courriers indésirables.
        </Toast>
        <ButtonLink href="/connexion" variant="secondary" size="lg">
          Retour à la connexion
        </ButtonLink>
        <p className="text-body-sm text-ink-muted">
          Rien reçu au bout de quelques minutes ?{" "}
          <Link href="/mot-de-passe-oublie" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2">
            Demander un nouveau lien
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Toast tone="danger" title={state.error} />}
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
      <SubmitButton size="lg">Recevoir le lien</SubmitButton>
    </form>
  );
}
