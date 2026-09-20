"use client";

import { useActionState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";
import type { FormState } from "@/lib/form-state";
import { formatTogoPhone } from "@/lib/phone";

export interface ClientInitial {
  nom: string;
  whatsapp: string; // sans le +228 : « 90 12 34 56 »
  email: string;
}

interface Props {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  /** Libellé du bouton de confirmation quand le numéro est déjà utilisé. */
  confirmLabel?: string;
  /** Question posée après « est déjà celui de … ». */
  confirmQuestion?: string;
  initial?: ClientInitial;
  /** Proposer d'ouvrir la fiche du client qui a déjà ce numéro (impossible pendant l'onboarding). */
  ouvrirFiche?: boolean;
}

const guillemets = (nom: string) => `« ${nom} »`;

function liste(noms: string[]) {
  const q = noms.map(guillemets);
  return q.length <= 1 ? (q[0] ?? "") : `${q.slice(0, -1).join(", ")} et ${q.at(-1)}`;
}

/** Formulaire d'un client, partagé par l'onboarding, la création et la modification. */
export function ClientForm({ action, submitLabel, confirmLabel = "Créer quand même", confirmQuestion = "Créer quand même un second client ?", initial, ouvrirFiche = true }: Props) {
  const [state, formAction] = useActionState(action, {});
  const err = state.fieldErrors ?? {};
  const val = (name: keyof ClientInitial) => state.values?.[name] ?? initial?.[name];
  const doublon = state.doublon;
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

      {doublon && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg bg-st-partial-bg p-4 text-st-partial-fg">
          <p className="font-semibold">
            Le numéro {formatTogoPhone(doublon.whatsapp)} est déjà celui de {liste(doublon.clients.map((c) => c.nom))}. {confirmQuestion}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {ouvrirFiche &&
              doublon.clients.map((c) => (
                <ButtonLink key={c.id} href={`/clients/${c.id}`} variant="secondary">
                  Ouvrir la fiche de {c.nom}
                </ButtonLink>
              ))}
            {/* La valeur porte le numéro confirmé : si on le modifie ensuite, la confirmation ne vaut plus. */}
            <SubmitButton name="confirmerNumero" value={doublon.whatsapp}>
              {confirmLabel}
            </SubmitButton>
          </div>
        </div>
      )}

      <SubmitButton size="lg" variant={doublon ? "secondary" : "primary"}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
