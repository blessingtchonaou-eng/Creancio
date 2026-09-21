"use client";

import { useActionState, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Toast } from "@/components/ui/feedback";
import { formaterSaisieMontant } from "@/lib/factures-saisie";
import type { FormState } from "@/lib/form-state";
import { ChoixClient, type ClientChoisi, type ClientPropose } from "./choix-client";

export interface FactureInitiale {
  numero: string;
  montant: string; // « 1 250 000 »
  dateFacture: string; // AAAA-MM-JJ
  echeance: string; // AAAA-MM-JJ
  client: ClientPropose;
}

interface Props {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  clients: ClientPropose[];
  initial: FactureInitiale;
  /** Ce qui est déjà payé : le montant ne peut pas descendre en dessous. */
  dejaPaye: string | null;
  dateEstimee: boolean;
  retour: string;
}

/** Modifier une facture : mêmes champs et mêmes règles que la saisie rapide. Le client se change parmi ceux qui existent déjà. */
export function FactureForm({ action, clients, initial, dejaPaye, dateEstimee, retour }: Props) {
  const [state, formAction] = useActionState(action, {});
  const err = state.fieldErrors ?? {};
  const v = state.values;
  const [montant, setMontant] = useState(v?.montant ?? initial.montant);
  const [client, setClient] = useState<ClientChoisi>({ mode: "choisi", client: initial.client });
  const clientId = client.mode === "choisi" ? client.client.id : "";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      {state.error && <Toast tone="danger" title={state.error} />}

      <Field label="Numéro de facture" name="numero" autoComplete="off" defaultValue={v?.numero ?? initial.numero} error={err.numero} />

      <ChoixClient clients={clients} valeur={client} onChange={setClient} erreurs={{ client: err.client }} creation={false} />
      <input type="hidden" name="clientId" value={clientId} />

      <Field
        label="Montant"
        name="montant"
        inputMode="numeric"
        autoComplete="off"
        suffix="FCFA"
        value={montant}
        onChange={(e) => setMontant(formaterSaisieMontant(e.target.value))}
        error={err.montant}
        help={dejaPaye ? `Déjà payé : ${dejaPaye} FCFA. Le montant ne peut pas être plus bas.` : undefined}
      />

      <Field
        label="Date de la facture"
        name="dateFacture"
        type="date"
        defaultValue={v?.dateFacture ?? initial.dateFacture}
        error={err.dateFacture}
        warning={dateEstimee ? "Cette date est estimée (elle n'était pas dans le fichier importé). Corrigez-la si besoin." : undefined}
      />
      <Field label="Échéance" name="echeance" type="date" defaultValue={v?.echeance ?? initial.echeance} error={err.echeance} />

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <SubmitButton size="lg" className="sm:flex-1">
          Enregistrer les changements
        </SubmitButton>
        <ButtonLink href={retour} variant="secondary" size="lg">
          Retour à la facture
        </ButtonLink>
      </div>
    </form>
  );
}
