"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Toast } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { TAILLE_FICHIER_MAX } from "@/lib/import/types";

interface Props {
  action: (formData: FormData) => void;
  enCours: boolean;
  erreur?: string;
}

/** Zone de dépôt : glisser un fichier ou toucher pour le choisir. Le fichier part dès qu'il est choisi. */
export function ImportDepot({ action, enCours, erreur }: Props) {
  const formulaire = useRef<HTMLFormElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const [erreurLocale, setErreurLocale] = useState<string>();

  function envoyer(fichiers: FileList | null) {
    const fichier = fichiers?.[0];
    if (!fichier) return;
    if (fichier.size > TAILLE_FICHIER_MAX) {
      setErreurLocale("Ce fichier dépasse 2 Mo. Divisez-le en plusieurs fichiers.");
      if (champ.current) champ.current.value = "";
      return;
    }
    setErreurLocale(undefined);
    if (champ.current && champ.current.files !== fichiers) {
      const transfert = new DataTransfer();
      transfert.items.add(fichier);
      champ.current.files = transfert.files;
    }
    formulaire.current?.requestSubmit();
  }

  const message = erreurLocale ?? erreur;
  return (
    <div className="flex flex-col gap-4">
      {message && <Toast tone="danger" title={message} />}
      <form ref={formulaire} action={action}>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            envoyer(e.dataTransfer.files);
          }}
          className={cn(
            "flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
            survol ? "border-primary bg-surface-muted" : "border-border-strong bg-surface hover:bg-surface-muted",
            enCours && "pointer-events-none opacity-60",
          )}
        >
          {enCours ? <FileSpreadsheet className="size-10 animate-pulse text-primary" aria-hidden /> : <Upload className="size-10 text-primary" aria-hidden />}
          <span className="font-display text-h2">{enCours ? "Lecture du fichier…" : "Déposez votre fichier ici"}</span>
          <span className="max-w-sm text-body-sm text-ink-muted">Fichier Excel (.xlsx) ou CSV, 2 Mo au maximum. Vous pourrez tout vérifier avant d&apos;importer.</span>
          <span className={buttonClasses("primary", "lg", "mt-1")}>Choisir un fichier</span>
          <input ref={champ} type="file" name="fichier" accept=".xlsx,.csv" className="sr-only" onChange={(e) => envoyer(e.target.files)} />
        </label>
      </form>
    </div>
  );
}
