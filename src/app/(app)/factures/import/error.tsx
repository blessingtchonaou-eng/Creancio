"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";

export default function ImportError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="L'import ne s'affiche pas"
      action={
        <Button variant="secondary" onClick={reset} className="mt-2">
          Réessayer
        </Button>
      }
    >
      Vos factures n&apos;ont pas été modifiées. Vérifiez votre connexion, puis réessayez.
    </ErrorState>
  );
}
