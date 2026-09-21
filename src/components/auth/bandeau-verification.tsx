"use client";

import { useActionState } from "react";
import { renvoyerVerification } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/feedback";

/** Rappel non bloquant : l'adresse e-mail n'est pas encore confirmée. Elle sert à retrouver le compte si le mot de passe est oublié. */
export function BandeauVerification({ email }: { email: string }) {
  const [state, action, pending] = useActionState(() => renvoyerVerification(), {});
  return (
    <div className="flex flex-col gap-2">
      {state.success && <Toast tone="success" title={state.success} />}
      {state.error && <Toast tone="danger" title={state.error} />}
      {!state.success && (
        <Toast tone="info" title="Confirmez votre adresse e-mail">
          Nous avons écrit à {email}. Cliquez sur le lien du message pour la confirmer : ce sera utile si vous oubliez votre mot de passe.
        </Toast>
      )}
      {!state.success && (
        <form action={action}>
          <Button type="submit" variant="secondary" loading={pending}>
            Renvoyer l&apos;e-mail
          </Button>
        </form>
      )}
    </div>
  );
}
