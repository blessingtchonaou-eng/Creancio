"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { demanderPilote } from "@/app/(site)/actions";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Toast } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { CONSENTEMENT_ACTUEL, CONSENTEMENTS, landing } from "@/content/landing";

/** Marche sans JavaScript (formulaire classique) ; avec JavaScript, le bouton affiche l'envoi en cours. */
export function FormulairePilote({ jeton, champPiege, succes }: { jeton: string; champPiege: string; succes: string }) {
  const [state, action] = useActionState(demanderPilote, {});
  const f = landing.pilote.formulaire;

  if (state.success === succes) {
    return (
      <div role="status" className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <p className="font-display text-h2 font-medium">{landing.pilote.succes.titre}</p>
        <p className="text-body text-ink-muted">{landing.pilote.succes.texte}</p>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3.5">
      <input type="hidden" name="jeton" value={state.jeton ?? jeton} />
      {/* Champ piège : invisible pour un humain, rempli par les robots. */}
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Site web
          <input type="text" name={champPiege} tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error && <Toast tone="danger" title={state.error} />}
      <Field
        label={f.nomEntreprise}
        name="nomEntreprise"
        placeholder={f.nomEntrepriseExemple}
        autoComplete="organization"
        maxLength={120}
        defaultValue={v.nomEntreprise}
        error={err.nomEntreprise}
      />
      <Field
        label={f.whatsapp}
        name="whatsapp"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        prefix={f.indicatif}
        placeholder="90 12 34 56"
        defaultValue={v.whatsapp}
        error={err.whatsapp}
      />
      <SelectField
        label={f.facturesParMois.libelle}
        precision={f.facturesParMois.aide}
        name="facturesParMois"
        defaultValue={v.facturesParMois ?? ""}
        error={err.facturesParMois}
      >
        <option value="">{f.facturesParMois.vide}</option>
        {f.facturesParMois.options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </SelectField>
      <CheckboxField name="consentement" value="oui" label={CONSENTEMENTS[CONSENTEMENT_ACTUEL]} defaultChecked={v.consentement === "oui"} error={err.consentement} />
      <SubmitButton size="lg" variant="inverse">
        {f.bouton}
      </SubmitButton>
      <p className="text-center text-[0.8125rem] text-ink-muted">
        {f.rappel} {f.sansEngagement}
      </p>
      <p className="text-center text-caption text-ink-muted">
        {f.donnees}{" "}
        <Link href="/confidentialite" className="font-semibold text-primary underline underline-offset-2">
          {f.lienDonnees}
        </Link>
      </p>
    </form>
  );
}
