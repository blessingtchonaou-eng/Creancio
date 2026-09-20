import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";

/** Retour à l'étape précédente. Rien n'est perdu : les informations déjà saisies sont conservées. */
export function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex h-11 items-center gap-1.5 self-start rounded-md pr-3 text-body-sm font-semibold text-ink-muted hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden />
      Retour
    </Link>
  );
}

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
