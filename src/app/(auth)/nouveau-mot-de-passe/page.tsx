import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/feedback";

// Le jeton est dans l'adresse : jamais transmis à un site tiers (pas de « Referer »), jamais indexé.
export const metadata: Metadata = { title: "Nouveau mot de passe", referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function NouveauMotDePassePage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;

  // Better Auth renvoie ici avec ?error=INVALID_TOKEN quand le lien est expiré, déjà utilisé ou inventé.
  if (error || !token) {
    return (
      <ErrorState
        title="Ce lien a expiré ou a déjà été utilisé"
        action={
          <ButtonLink href="/mot-de-passe-oublie" size="lg" className="mt-2">
            Recevoir un nouveau lien
          </ButtonLink>
        }
      >
        Un lien ne marche qu&apos;une fois et pendant 1 heure. Demandez-en un nouveau : l&apos;ancien ne sert plus.
      </ErrorState>
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-h1 font-medium">Nouveau mot de passe</h1>
        <p className="mt-1 text-body-sm text-ink-muted">Choisissez un mot de passe que vous n&apos;utilisez nulle part ailleurs. Vous serez déconnecté de vos autres appareils.</p>
      </div>
      <ResetPasswordForm token={token} />
    </Card>
  );
}
