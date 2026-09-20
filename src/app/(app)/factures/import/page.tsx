import type { Metadata } from "next";
import { Download } from "lucide-react";
import { ImportWizard } from "@/components/import/import-wizard";
import { BackLink } from "@/components/ui/back-link";
import { buttonClasses } from "@/components/ui/button";
import { requireEntreprise } from "@/lib/session";

export const metadata: Metadata = { title: "Importer des factures" };

export default async function ImportPage() {
  await requireEntreprise();
  return (
    <>
      <BackLink href="/factures">Factures</BackLink>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-h1 font-medium">Importer des factures</h1>
          <p className="mt-1 max-w-xl text-body-sm text-ink-muted">
            Déposez un fichier Excel ou CSV. Les clients qui n&apos;existent pas encore sont créés avec leurs factures. Vous vérifiez tout avant d&apos;importer.
          </p>
        </div>
        {/* Un vrai lien <a> : c'est un téléchargement, pas une navigation. */}
        <a href="/factures/import/modele" download className={buttonClasses("secondary", "md")}>
          <Download className="size-4" aria-hidden />
          Télécharger le modèle
        </a>
      </div>
      <ImportWizard />
    </>
  );
}
