import type { Metadata } from "next";
import { ajouterPremierClient, passerEtapeClient } from "@/app/(onboarding)/actions";
import { ClientForm } from "@/components/clients/client-form";
import { SkipButton } from "@/components/onboarding/step-nav";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireOnboardingEnCours } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Votre premier client" };

export default async function PremierClientPage() {
  await requireOnboardingEnCours();
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/bienvenue" />
      <ProgressBar current={2} total={3} label="Votre premier client" />
      <Card className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-h1 font-medium">Ajoutez un client</h1>
          <p className="mt-1 text-body-sm text-ink-muted">Choisissez un client qui vous doit de l&apos;argent. Vous en ajouterez d&apos;autres ensuite.</p>
        </div>
        <ClientForm action={ajouterPremierClient} submitLabel="Ajouter ce client" ouvrirFiche={false} />
      </Card>
      <SkipButton action={passerEtapeClient} />
    </div>
  );
}
