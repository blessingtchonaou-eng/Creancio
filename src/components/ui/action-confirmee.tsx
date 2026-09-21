"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button, type Variant } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";
import type { FormState } from "@/lib/form-state";

interface Props {
  /** Action serveur, déjà liée à ce qu'elle vise (facture, paiement). Elle redirige quand tout s'est bien passé. */
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Bouton qui ouvre la confirmation : il dit ce qu'il fait (« Annuler la facture »). */
  label: string;
  icon?: ReactNode;
  /** La question posée (« Annuler la facture FA-2026-0007 ? »). */
  question: string;
  /** Ce que la confirmation change, en une ou deux phrases. */
  explication?: string;
  /** Bouton qui confirme : il dit ce qu'il fait (« Oui, annuler la facture »). */
  confirmLabel: string;
  variant?: Variant;
  /** Demande un motif (champ « motif » du formulaire). */
  motif?: { label: string; aide: string; max: number };
  className?: string;
}

/**
 * Une action qui change quelque chose demande d'abord confirmation, dans un encadré à la suite du bouton (pas de fenêtre
 * par-dessus la page : plus simple à lire et à toucher sur un téléphone). Le motif, s'il est demandé, part avec la confirmation.
 */
export function ActionConfirmee({ action, label, icon, question, explication, confirmLabel, variant = "secondary", motif, className }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [state, formAction] = useActionState(action, {});

  if (!ouvert) {
    return (
      <Button type="button" variant={variant === "danger" ? "secondary" : variant} onClick={() => setOuvert(true)} className={className} aria-expanded={false}>
        {icon}
        {label}
      </Button>
    );
  }

  return (
    <form action={formAction} noValidate className="flex w-full flex-col gap-3 rounded-lg border border-border-strong bg-surface-muted p-4">
      <p className="font-semibold" id="confirmation-question">
        {question}
      </p>
      {explication && <p className="text-body-sm text-ink-muted">{explication}</p>}
      {state.error && <Toast tone="danger" title={state.error} />}
      {motif && <Field label={motif.label} name="motif" autoComplete="off" maxLength={motif.max} help={motif.aide} error={state.fieldErrors?.motif} autoFocus />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton variant={variant}>{confirmLabel}</SubmitButton>
        <Button type="button" variant="secondary" onClick={() => setOuvert(false)} autoFocus={!motif}>
          Non, garder
        </Button>
      </div>
    </form>
  );
}
