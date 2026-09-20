"use client";

import { useActionState, useState } from "react";
import { enregistrerEntreprise } from "@/app/(onboarding)/actions";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";
import { AVERTISSEMENT_NIF, ressembleAUnNif } from "@/lib/validation/nif";

interface Props {
  /** Valeurs déjà enregistrées, quand on revient sur cette étape. */
  initial?: { raisonSociale: string; nif: string; telephone: string };
}

export function EntrepriseForm({ initial }: Props) {
  const [state, action] = useActionState(enregistrerEntreprise, {});
  const err = state.fieldErrors ?? {};
  const val = (name: keyof NonNullable<Props["initial"]>) => state.values?.[name] ?? initial?.[name];

  // Le NIF inhabituel déclenche un avertissement, jamais un refus : l'envoi reste possible.
  const [nif, setNif] = useState(val("nif") ?? "");
  const [nifQuitte, setNifQuitte] = useState(false);
  const avertirNif = nifQuitte && !ressembleAUnNif(nif);

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <Toast tone="danger" title={state.error} />}
      <Field label="Nom de l'entreprise" name="raisonSociale" autoComplete="organization" defaultValue={val("raisonSociale")} error={err.raisonSociale} />
      <Field
        label="NIF (facultatif)"
        name="nif"
        value={nif}
        onChange={(e) => setNif(e.target.value)}
        onBlur={() => setNifQuitte(true)}
        error={err.nif}
        warning={avertirNif ? AVERTISSEMENT_NIF : undefined}
        help="Numéro d'identification fiscale de l'OTR. Vous pourrez l'ajouter plus tard."
      />
      <Field
        label="Téléphone de l'entreprise (facultatif)"
        name="telephone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        prefix="+228"
        placeholder="90 12 34 56"
        defaultValue={val("telephone")}
        error={err.telephone}
      />
      <SubmitButton size="lg">{initial ? "Enregistrer et continuer" : "Enregistrer mon entreprise"}</SubmitButton>
    </form>
  );
}
