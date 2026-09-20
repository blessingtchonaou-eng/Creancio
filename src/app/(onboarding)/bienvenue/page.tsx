import type { Metadata } from "next";
import { EntrepriseForm } from "@/components/onboarding/entreprise-form";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatTogoPhone } from "@/lib/phone";
import { requireOnboardingEnCours } from "@/lib/onboarding";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function BienvenuePage() {
  const user = await requireUser();
  // Sans entreprise : première visite. Avec entreprise : retour depuis l'étape 2, on réaffiche ses informations.
  const entreprise = user.entrepriseId ? (await requireOnboardingEnCours()).entreprise : null;
  return (
    <div className="flex flex-col gap-4">
      <ProgressBar current={1} total={3} label="Votre entreprise" />
      <Card className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-h1 font-medium">Bienvenue, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-body-sm text-ink-muted">Dites-nous qui vous êtes. Ces informations apparaîtront sur vos relances.</p>
        </div>
        <EntrepriseForm
          initial={
            entreprise
              ? {
              raisonSociale: entreprise.raisonSociale,
              nif: entreprise.nif ?? "",
              telephone: entreprise.telephone ? formatTogoPhone(entreprise.telephone).replace(/^\+228\s?/, "") : "",
                }
              : undefined
          }
        />
      </Card>
    </div>
  );
}
