"use client";

import { CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FactureEnAttente } from "@/lib/file-attente";

interface Props {
  file: FactureEnAttente[];
  enLigne: boolean;
  envoiEnCours: boolean;
  onEnvoyer: () => void;
  onCorriger: (cle: string) => void;
  onSupprimer: (cle: string) => void;
}

/** Factures gardées sur ce téléphone en attendant la connexion, avec celles que le serveur a refusées. */
export function FileAttente({ file, enLigne, envoiEnCours, onEnvoyer, onCorriger, onSupprimer }: Props) {
  if (file.length === 0) return null;
  const enAttente = file.filter((f) => !f.erreur).length;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-h2 font-medium">
            <CloudUpload className="size-5 text-ink-muted" aria-hidden />
            {enAttente > 0 ? `${enAttente} ${enAttente > 1 ? "factures attendent" : "facture attend"} d'être envoyée${enAttente > 1 ? "s" : ""}` : "À corriger avant l'envoi"}
          </h2>
          <p className="text-body-sm text-ink-muted">
            {enAttente > 0 && (enLigne ? "Envoi en cours dès que possible." : "Elles sont gardées sur ce téléphone et partiront dès que la connexion revient.")}
          </p>
        </div>
        {enAttente > 0 && enLigne && (
          <Button variant="secondary" onClick={onEnvoyer} loading={envoiEnCours}>
            Envoyer maintenant
          </Button>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {file.map((f) => (
          <li key={f.saisie.cle} className="flex flex-col gap-2 rounded-md border border-border p-3">
            <p className="font-semibold">{f.resume}</p>
            {f.erreur ? <p className="text-body-sm text-danger">{f.erreur}</p> : <p className="text-body-sm text-ink-muted">En attente d&apos;envoi</p>}
            <div className="flex flex-wrap gap-2">
              {f.erreur && (
                <Button size="sm" variant="secondary" onClick={() => onCorriger(f.saisie.cle)}>
                  Corriger cette facture
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onSupprimer(f.saisie.cle)}>
                Supprimer
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
