"use client";

import { Plus, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Field } from "@/components/ui/field";
import { SearchInput } from "@/components/ui/search-input";
import { normaliserNom } from "@/lib/import/analyse";
import { formatTogoPhone } from "@/lib/phone";

export interface ClientPropose {
  id: string;
  nom: string;
  whatsapp: string;
}

/** Ce que l'utilisateur a décidé pour le client : en recherche, un client choisi, ou un nouveau client à créer. */
export type ClientChoisi = { mode: "cherche" } | { mode: "choisi"; client: ClientPropose } | { mode: "nouveau"; nom: string; whatsapp: string };

interface Props {
  clients: ClientPropose[];
  valeur: ClientChoisi;
  onChange: (valeur: ClientChoisi) => void;
  erreurs: { client?: string; nom?: string; whatsapp?: string };
}

const MAX_RESULTATS = 5;

/** Ce qui a été tapé devient le nom du nouveau client, ou son numéro si ce ne sont que des chiffres. */
function nouveauDepuis(texte: string): ClientChoisi {
  const numero = /^[\d\s+]+$/.test(texte);
  return { mode: "nouveau", nom: numero ? "" : texte, whatsapp: numero ? texte.replace(/^\+?228\s?/, "") : "" };
}

/** Cherche parmi les clients de l'entreprise (déjà chargés : ça marche sans connexion) ou crée un client sans quitter la saisie. */
export function ChoixClient({ clients, valeur, onChange, erreurs }: Props) {
  const [requete, setRequete] = useState("");

  const resultats = useMemo(() => {
    const q = normaliserNom(requete);
    const chiffres = requete.replace(/\D/g, "");
    if (q === "" && chiffres === "") return clients.slice(0, MAX_RESULTATS);
    return clients.filter((c) => normaliserNom(c.nom).includes(q) || (chiffres.length >= 2 && c.whatsapp.includes(chiffres))).slice(0, MAX_RESULTATS);
  }, [clients, requete]);

  if (valeur.mode === "choisi") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm font-semibold text-ink">Client</span>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border-strong bg-surface p-3">
          <p className="flex min-w-0 items-center gap-3">
            <UserRound className="size-5 shrink-0 text-ink-muted" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{valeur.client.nom}</span>
              <span className="tabular block text-body-sm text-ink-muted">{formatTogoPhone(valeur.client.whatsapp)}</span>
            </span>
          </p>
          <button type="button" onClick={() => onChange({ mode: "cherche" })} className="h-11 shrink-0 rounded-md px-3 text-body-sm font-semibold text-primary hover:bg-surface-muted">
            Changer
          </button>
        </div>
      </div>
    );
  }

  if (valeur.mode === "nouveau") {
    return (
      <fieldset className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-3">
        <legend className="px-1 text-body-sm font-semibold text-ink">Nouveau client</legend>
        <Field id="saisie-nom" label="Nom du client" autoComplete="off" value={valeur.nom} onChange={(e) => onChange({ ...valeur, nom: e.target.value })} error={erreurs.nom} />
        <Field
          id="saisie-whatsapp"
          label="Numéro WhatsApp"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          prefix="+228"
          placeholder="90 12 34 56"
          value={valeur.whatsapp}
          onChange={(e) => onChange({ ...valeur, whatsapp: e.target.value })}
          error={erreurs.whatsapp}
          help="C'est sur ce numéro que les relances seront envoyées."
        />
        <button type="button" onClick={() => onChange({ mode: "cherche" })} className="h-11 self-start rounded-md px-3 text-body-sm font-semibold text-primary hover:bg-surface">
          Choisir un client qui existe déjà
        </button>
      </fieldset>
    );
  }

  const nom = requete.trim();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="saisie-client" className="text-body-sm font-semibold text-ink">
        Client
      </label>
      <SearchInput
        id="saisie-client"
        placeholder="Nom ou numéro du client"
        value={requete}
        onChange={(e) => setRequete(e.target.value)}
        autoComplete="off"
        aria-invalid={erreurs.client ? true : undefined}
        className={erreurs.client ? "border-danger" : undefined}
      />
      <ul className="flex flex-col overflow-hidden rounded-md border border-border bg-surface">
        {resultats.map((c) => (
          <li key={c.id} className="border-b border-border last:border-b-0">
            <button type="button" onClick={() => onChange({ mode: "choisi", client: c })} className="flex min-h-12 w-full items-center justify-between gap-3 px-3.5 py-2 text-left hover:bg-surface-muted">
              <span className="truncate font-semibold">{c.nom}</span>
              <span className="tabular shrink-0 text-body-sm text-ink-muted">{formatTogoPhone(c.whatsapp)}</span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => onChange(nouveauDepuis(nom))}
            className="flex min-h-12 w-full items-center gap-2 px-3.5 py-2 text-left font-semibold text-primary hover:bg-surface-muted"
          >
            <Plus className="size-4 shrink-0" aria-hidden />
            {nom === "" ? "Créer un nouveau client" : `Créer « ${nom} »`}
          </button>
        </li>
      </ul>
      {resultats.length === 0 && nom !== "" && <p className="text-body-sm text-ink-muted">Aucun client ne correspond. Créez-le ci-dessus.</p>}
      {erreurs.client && (
        <p role="alert" className="text-body-sm text-danger">
          {erreurs.client}
        </p>
      )}
    </div>
  );
}
