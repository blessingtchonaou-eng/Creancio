"use client";

import { useActionState, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";
import { AVERTISSEMENT_DATE_ESTIMEE, OPERATEURS_MANUELS } from "@/lib/facture-regles";
import { formaterSaisieMontant } from "@/lib/factures-saisie";
import { formatFCFA } from "@/lib/format";
import type { FormState } from "@/lib/form-state";
import { cn } from "@/lib/cn";

interface Props {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Identifiant tiré à l'ouverture de la page : un double clic ne crée pas deux paiements. */
  cle: string;
  resteDu: number;
  /** AAAA-MM-JJ */
  aujourdhui: string;
  dateFacture: string;
  dateFactureEstimee: boolean;
  retour: string;
}

/** Enregistrer un paiement reçu à la main : montant (pré-rempli avec le reste dû), date, mode de paiement, référence facultative. */
export function PaiementForm({ action, cle, resteDu, aujourdhui, dateFacture, dateFactureEstimee, retour }: Props) {
  const [state, formAction] = useActionState(action, {});
  const err = state.fieldErrors ?? {};
  const [montant, setMontant] = useState(state.values?.montant ?? formaterSaisieMontant(String(resteDu)));
  const [date, setDate] = useState(state.values?.date ?? aujourdhui);
  const operateur = state.values?.operateur ?? "ESPECES";

  const chiffres = montant.replace(/\D/g, "");
  const avertissementDate = dateFactureEstimee && date !== "" && date < dateFacture ? AVERTISSEMENT_DATE_ESTIMEE : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.error && <Toast tone="danger" title={state.error} />}
      <input type="hidden" name="cle" value={cle} />

      <Field
        label="Montant reçu"
        name="montant"
        inputMode="numeric"
        autoComplete="off"
        suffix="FCFA"
        value={montant}
        onChange={(e) => setMontant(formaterSaisieMontant(e.target.value))}
        error={err.montant}
        help={`Il reste ${formatFCFA(resteDu)} à payer.`}
      />

      <Field
        label="Date du paiement"
        name="date"
        type="date"
        value={date}
        max={aujourdhui}
        onChange={(e) => setDate(e.target.value)}
        error={err.date}
        warning={avertissementDate}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-body-sm font-semibold text-ink">Reçu par</legend>
        <div className="grid grid-cols-2 gap-2">
          {OPERATEURS_MANUELS.map((o) => (
            <label
              key={o.valeur}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-md border border-border-strong bg-surface px-3.5 text-base font-medium",
                "has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-surface-muted has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/15",
              )}
            >
              <input type="radio" name="operateur" value={o.valeur} defaultChecked={o.valeur === operateur} className="size-4 accent-primary" />
              {o.libelle}
            </label>
          ))}
        </div>
        {err.operateur && (
          <p role="alert" className="text-body-sm text-danger">
            {err.operateur}
          </p>
        )}
      </fieldset>

      <Field label="Référence (facultative)" name="reference" autoComplete="off" defaultValue={state.values?.reference} error={err.reference} help="Numéro de reçu, de virement ou de transaction, si vous en avez un." />

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <SubmitButton size="lg" className="sm:flex-1">
          {chiffres === "" ? "Enregistrer le paiement" : `Enregistrer le paiement de ${formaterSaisieMontant(chiffres)} FCFA`}
        </SubmitButton>
        <ButtonLink href={retour} variant="secondary" size="lg">
          Retour à la facture
        </ButtonLink>
      </div>
    </form>
  );
}
