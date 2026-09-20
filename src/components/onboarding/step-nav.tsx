import { SubmitButton } from "@/components/ui/submit-button";

/** « Passer pour l'instant » : toujours visible sous le formulaire de l'étape. */
export function SkipButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <SubmitButton variant="secondary" className="w-full">
        Passer pour l&apos;instant
      </SubmitButton>
    </form>
  );
}
