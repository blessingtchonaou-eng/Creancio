"use client";

import { useActionState, useId } from "react";
import { mettreAJourDemandeAction } from "@/app/admin/pilote/actions";
import { Toast } from "@/components/ui/feedback";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { LIBELLES_STATUT, STATUTS_DEMANDE } from "@/lib/statuts-pilote";

/** Changement de statut et note d'une demande (formulaire classique, marche sans JavaScript). */
export function DemandePiloteForm({ demandePiloteId, statut, note }: { demandePiloteId: string; statut: string; note: string | null }) {
  const [state, action] = useActionState(mettreAJourDemandeAction.bind(null, demandePiloteId), {});
  const noteId = useId();
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-3 border-t border-border pt-3">
      {state.success && <Toast tone="success" title={state.success} />}
      <SelectField label="Statut" name="statut" defaultValue={state.values?.statut ?? statut} error={err.statut}>
        {STATUTS_DEMANDE.map((s) => (
          <option key={s} value={s}>
            {LIBELLES_STATUT[s]}
          </option>
        ))}
      </SelectField>
      <div>
        <label htmlFor={noteId} className="mb-1.5 block text-body-sm font-semibold text-ink">
          Note <span className="font-normal text-ink-muted">· 500 caractères au plus</span>
        </label>
        <textarea
          id={noteId}
          name="note"
          rows={2}
          maxLength={500}
          defaultValue={state.values?.note ?? note ?? ""}
          aria-invalid={err.note ? true : undefined}
          className="w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-base text-ink focus:border-2 focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none"
        />
        {err.note && <p className="mt-1.5 text-body-sm text-danger">{err.note}</p>}
      </div>
      <SubmitButton variant="secondary" size="md" className="self-start">
        Enregistrer le statut et la note
      </SubmitButton>
    </form>
  );
}
