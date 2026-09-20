import type { Metadata } from "next";
import { FileSpreadsheet, PenLine } from "lucide-react";
import { passerEtapeFactures, terminerVersImport, terminerVersSaisie } from "@/app/(onboarding)/actions";
import { SkipButton } from "@/components/onboarding/step-nav";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireOnboardingEnCours } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Vos premières factures" };

export default async function PremieresFacturesPage() {
  await requireOnboardingEnCours();
  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/bienvenue/clients" />
      <ProgressBar current={3} total={3} label="Vos premières factures" />
      <Card className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-h1 font-medium">Ajoutez vos factures</h1>
          <p className="mt-1 text-body-sm text-ink-muted">Chargez toutes vos factures d&apos;un coup, ou saisissez-les une par une.</p>
        </div>
        <div className="flex flex-col gap-3">
          <form action={terminerVersImport}>
            <SubmitButton size="lg" className="w-full">
              <FileSpreadsheet className="size-5" aria-hidden />
              Importer un fichier Excel
            </SubmitButton>
          </form>
          <form action={terminerVersSaisie}>
            <SubmitButton size="lg" variant="secondary" className="w-full">
              <PenLine className="size-5" aria-hidden />
              Saisir une facture
            </SubmitButton>
          </form>
        </div>
      </Card>
      <SkipButton action={passerEtapeFactures} />
    </div>
  );
}
