"use client";

import { useActionState, useState } from "react";
import { analyserFichier } from "@/app/(app)/factures/import/actions";
import { ApercuImport } from "./apercu-import";
import { ImportDepot } from "./import-depot";

/** Deux temps : choisir le fichier, puis vérifier et corriger l'aperçu avant d'importer. */
export function ImportWizard() {
  const [etat, action, enCours] = useActionState(analyserFichier, {});
  const [abandonne, setAbandonne] = useState<string>();

  if (etat.cle && etat.cle !== abandonne && etat.lecture && etat.analyse) {
    return (
      <ApercuImport key={etat.cle} nomFichier={etat.nomFichier ?? "fichier"} lecture={etat.lecture} analyseInitiale={etat.analyse} onAutreFichier={() => setAbandonne(etat.cle)} />
    );
  }
  return <ImportDepot action={action} enCours={enCours} erreur={etat.error} />;
}
