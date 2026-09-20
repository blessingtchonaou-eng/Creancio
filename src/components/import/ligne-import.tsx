"use client";

import { X } from "lucide-react";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { NOUVEAU_CLIENT, type LigneAnalysee } from "@/lib/import/analyse";
import type { Colonne } from "@/lib/import/colonnes";
import type { LigneBrute } from "@/lib/import/types";
import { formatTogoPhone } from "@/lib/phone";
import { StatutLigneBadge } from "./statut-ligne";

interface Props {
  brute: LigneBrute;
  analyse: LigneAnalysee | undefined;
  choix: string | undefined;
  /** Le fichier a une colonne « Date de facture » (sinon l'aperçu l'explique une fois, en haut). */
  colonneDateFacture: boolean;
  onModifier: (champ: Colonne, valeur: string) => void;
  onChoisir: (cle: string, valeur: string) => void;
  onRetirer: () => void;
}

const bordure = {
  erreur: "border-danger",
  a_choisir: "border-st-partial-fg",
  prete: "border-border",
  deja_importee: "border-border bg-surface-muted",
} as const;

/** Une ligne du fichier : ses cellules modifiables, ses erreurs, et le choix du client quand il est ambigu. */
export function LigneImport({ brute, analyse, choix, colonneDateFacture, onModifier, onChoisir, onRetirer }: Props) {
  const statut = analyse?.statut ?? "erreur";
  const erreurs = analyse?.erreurs ?? {};
  const figee = statut === "deja_importee";
  const champ = (nom: Colonne, libelle: string, extra: { placeholder?: string; inputMode?: "numeric" | "tel" | "text"; warning?: string } = {}) => (
    <Field
      label={libelle}
      value={brute[nom]}
      onChange={(e) => onModifier(nom, e.target.value)}
      error={erreurs[nom]}
      disabled={figee}
      autoComplete="off"
      {...extra}
    />
  );

  return (
    <li className={cn("flex flex-col gap-3 rounded-lg border-2 bg-surface p-3 sm:p-4", bordure[statut])}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-body-sm font-semibold text-ink-muted">Ligne {brute.ligne}</span>
          <StatutLigneBadge statut={statut} />
        </p>
        <button
          type="button"
          onClick={onRetirer}
          className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-body-sm font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-4" aria-hidden />
          Retirer
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {champ("numero", "Numéro de facture")}
        {champ("client", "Client")}
        {champ("telephone", "Téléphone WhatsApp", { inputMode: "tel", placeholder: "90 12 34 56" })}
        {champ("montant", "Montant (FCFA)", { inputMode: "numeric" })}
        {champ("echeance", "Échéance", { placeholder: "25/10/2026" })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {champ("dateFacture", "Date de facture", {
          placeholder: "Aujourd'hui",
          warning: colonneDateFacture && analyse?.dateFactureParDefaut && !erreurs.dateFacture ? "Case vide : la date du jour est utilisée." : undefined,
        })}
        {(brute.email !== "" || erreurs.email) && champ("email", "E-mail", { inputMode: "text" })}
      </div>

      {statut === "a_choisir" && analyse?.candidats && analyse.cleClient && (
        <div className="flex flex-col gap-1.5 rounded-md bg-st-partial-bg p-3 text-st-partial-fg">
          <label htmlFor={`choix-${brute.ligne}`} className="text-body-sm font-semibold">
            {analyse.noteClient}. De quel client s&apos;agit-il ?
          </label>
          <select
            id={`choix-${brute.ligne}`}
            value={choix ?? ""}
            onChange={(e) => onChoisir(analyse.cleClient!, e.target.value)}
            className="h-12 rounded-md border border-border-strong bg-surface px-3 text-base text-ink"
          >
            <option value="" disabled>
              Choisir un client…
            </option>
            {analyse.candidats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom} · {formatTogoPhone(c.whatsapp)}
              </option>
            ))}
            <option value={NOUVEAU_CLIENT}>Créer un nouveau client</option>
          </select>
        </div>
      )}
      {statut !== "a_choisir" && analyse?.noteClient && statut !== "deja_importee" && (
        <p className="text-body-sm text-ink-muted">
          {analyse.noteClient}
          {analyse.client?.type === "existant" && ` : ${analyse.client.nom}`}
        </p>
      )}
      {figee && <p className="text-body-sm text-ink-muted">Cette facture est déjà enregistrée : elle ne sera pas importée une deuxième fois.</p>}
    </li>
  );
}
