import type { Metadata } from "next";
import { SaisieRapide } from "@/components/factures/saisie-rapide";
import { BackLink } from "@/components/ui/back-link";
import { ButtonLink } from "@/components/ui/button";
import { clientsPourSaisie, numeroSuggere } from "@/lib/factures";
import { versISO } from "@/lib/factures-saisie";
import { requireEntreprise } from "@/lib/session";

export const metadata: Metadata = { title: "Nouvelle facture" };

export default async function NouvelleFacturePage() {
  const { entrepriseId } = await requireEntreprise();
  const aujourdhui = new Date();
  const [clients, numero] = await Promise.all([clientsPourSaisie(entrepriseId), numeroSuggere(entrepriseId, aujourdhui.getUTCFullYear())]);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
      <BackLink href="/factures">Factures</BackLink>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h1 font-medium">Nouvelle facture</h1>
        <ButtonLink href="/factures/import" variant="ghost">
          Importer un fichier Excel
        </ButtonLink>
      </div>
      <SaisieRapide entrepriseId={entrepriseId} clients={clients} numeroSuggere={numero} aujourdhui={versISO(aujourdhui)} />
    </div>
  );
}
