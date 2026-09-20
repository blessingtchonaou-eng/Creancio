"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";

export default function TableauDeBordError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="Le tableau de bord ne s'affiche pas"
      action={
        <Button variant="secondary" onClick={reset} className="mt-2">
          Réessayer
        </Button>
      }
    >
      Vérifiez votre connexion, puis réessayez.
    </ErrorState>
  );
}
