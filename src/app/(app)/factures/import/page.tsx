import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Importer des factures" };

// Page provisoire : remplacée par l'import Excel à l'étape 5.
export default function ImportPage() {
  return (
    <>
      <h1 className="font-display text-h1 font-medium">Importer des factures</h1>
      <EmptyState
        title="Écran en cours de construction"
        action={
          <ButtonLink href="/tableau-de-bord" variant="secondary">
            Retour au tableau de bord
          </ButtonLink>
        }
      >
        L&apos;import de fichiers Excel arrive bientôt.
      </EmptyState>
    </>
  );
}
