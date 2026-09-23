"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";

export default function AdminPiloteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="Les demandes ne s'affichent pas"
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
