import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Nouvelle facture" };

// Page provisoire : remplacée par la saisie rapide à l'étape 6.
export default function NouvelleFacturePage() {
  return (
    <>
      <h1 className="font-display text-h1 font-medium">Nouvelle facture</h1>
      <EmptyState
        title="Écran en cours de construction"
        action={
          <ButtonLink href="/tableau-de-bord" variant="secondary">
            Retour au tableau de bord
          </ButtonLink>
        }
      >
        La saisie rapide d&apos;une facture arrive bientôt.
      </EmptyState>
    </>
  );
}
