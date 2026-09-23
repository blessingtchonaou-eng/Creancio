"use client";

import { useActionState } from "react";
import { creerInvitationAction } from "@/app/admin/pilote/actions";
import { buttonClasses } from "@/components/ui/button";
import { Toast } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, toIsoDate } from "@/lib/format";

/** Message prérempli du lien WhatsApp (wa.me) : le contact copie-colle le lien reçu, rien à installer côté Créancio. */
function messageWhatsapp(url: string): string {
  return `Bonjour, voici votre lien pour créer votre compte Créancio : ${url}\nIl est valable 7 jours et ne sert qu'une fois.`;
}

interface Props {
  demandePiloteId: string;
  /** Numéro E.164 (+228XXXXXXXX) : wa.me veut les chiffres seuls, sans le +. */
  whatsapp: string;
}

/**
 * Bouton « Créer un lien d'inscription » : le jeton n'apparaît jamais dans l'adresse de cette page (ni dans une
 * redirection, ni dans l'historique) — il est affiché ici, dans le résultat de la Server Action, une seule fois.
 */
export function InvitationPilote({ demandePiloteId, whatsapp }: Props) {
  const action = creerInvitationAction.bind(null, demandePiloteId);
  const [state, formAction] = useActionState(action, {});

  if (state.invitationCreee) {
    const { url, expireLe } = state.invitationCreee;
    const numeroWa = whatsapp.replace(/[^\d]/g, "");
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border-strong bg-surface-muted p-3 text-body-sm">
        <p className="font-semibold">Lien créé, valable jusqu&apos;au {formatDate(toIsoDate(new Date(expireLe)))}</p>
        <p className="break-all text-ink-muted">{url}</p>
        <a
          href={`https://wa.me/${numeroWa}?text=${encodeURIComponent(messageWhatsapp(url))}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("primary", "sm", "self-start")}
        >
          Envoyer par WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {state.error && <Toast tone="danger" title={state.error} />}
      <SubmitButton variant="secondary" size="sm">
        Créer un lien d&apos;inscription
      </SubmitButton>
    </form>
  );
}
