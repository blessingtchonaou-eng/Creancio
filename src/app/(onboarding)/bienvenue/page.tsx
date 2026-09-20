import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EntrepriseForm } from "@/components/onboarding/entreprise-form";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function BienvenuePage() {
  const user = await requireUser();
  if (user.entrepriseId) redirect("/tableau-de-bord");
  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-h1 font-medium">Bienvenue, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-body-sm text-ink-muted">Dites-nous qui vous êtes. Ces informations apparaîtront sur vos relances.</p>
      </div>
      <EntrepriseForm />
    </Card>
  );
}
