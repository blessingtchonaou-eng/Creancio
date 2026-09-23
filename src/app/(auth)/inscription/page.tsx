import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/feedback";
import { inscriptionsOuvertes } from "@/lib/inscriptions";
import { verifierInvitation } from "@/lib/invitation-pilote";
import { getSession } from "@/lib/session";

// Le jeton d'invitation est dans l'adresse : jamais transmis à un site tiers (en-tête Referer), jamais indexé.
// Referrer-Policy et Cache-Control sont aussi déclarés dans next.config.ts (comme /nouveau-mot-de-passe) ; Next.js
// impose son propre Cache-Control aux pages dynamiques, qui l'emporte sur le fil (voir TODO-PRODUCTION.md).
export const metadata: Metadata = { title: "Créer mon compte", referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function InscriptionPage({ searchParams }: { searchParams: Promise<{ invitation?: string }> }) {
  if (await getSession()) redirect("/tableau-de-bord");
  const { invitation } = await searchParams;

  let contenu: React.ReactNode;
  if (inscriptionsOuvertes()) {
    contenu = <SignUpForm />;
  } else {
    const { valide } = await verifierInvitation(invitation ?? null);
    if (!invitation) {
      contenu = (
        <ErrorState title="Les inscriptions sont fermées pendant la phase pilote.">
          Vous voulez essayer Créancio ?{" "}
          <Link href="/#pilote" className="font-semibold text-primary underline underline-offset-2">
            Laissez vos coordonnées ici
          </Link>
          , notre équipe vous recontacte.
        </ErrorState>
      );
    } else if (!valide) {
      contenu = <ErrorState title="Ce lien d'invitation n'est plus valide.">Demandez-en un nouveau à l'équipe Créancio.</ErrorState>;
    } else {
      contenu = <SignUpForm invitation={invitation} />;
    }
  }

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-h1 font-medium">Créer mon compte</h1>
        <p className="mt-1 text-body-sm text-ink-muted">Trois minutes pour commencer à relancer vos clients.</p>
      </div>
      {contenu}
      <p className="text-body-sm text-ink-muted">
        Vous avez déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-primary underline underline-offset-2">
          Me connecter
        </Link>
      </p>
    </Card>
  );
}
