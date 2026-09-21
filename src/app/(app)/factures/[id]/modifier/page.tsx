import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { modifierFactureAction } from "@/app/(app)/factures/[id]/actions";
import { FactureForm } from "@/components/factures/facture-form";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { clientsPourSaisie } from "@/lib/factures";
import { trouverFacture } from "@/lib/factures-fiche";
import { formatAmount } from "@/lib/format";
import { formaterSaisieMontant } from "@/lib/factures-saisie";
import { requireEntreprise } from "@/lib/session";

export const metadata: Metadata = { title: "Modifier une facture" };

export default async function ModifierFacturePage({ params }: { params: Promise<{ id: string }> }) {
  const { entrepriseId } = await requireEntreprise();
  const { id } = await params;
  const facture = await trouverFacture(entrepriseId, id);
  if (!facture) notFound();
  // Une facture annulée ne se modifie plus : retour à la fiche.
  if (facture.statut === "ANNULEE") redirect(`/factures/${facture.id}`);
  const clients = await clientsPourSaisie(entrepriseId);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <BackLink href={`/factures/${facture.id}`}>{facture.numero}</BackLink>
      <Card className="flex flex-col gap-5">
        <h1 className="font-display text-h1 font-medium">Modifier la facture</h1>
        <FactureForm
          action={modifierFactureAction.bind(null, facture.id)}
          clients={clients}
          initial={{
            numero: facture.numero,
            montant: formaterSaisieMontant(String(facture.montant)),
            dateFacture: facture.dateFacture,
            echeance: facture.echeance,
            client: { id: facture.client.id, nom: facture.client.nom, whatsapp: facture.client.whatsapp },
          }}
          dejaPaye={facture.montantPaye > 0 ? formatAmount(facture.montantPaye) : null}
          dateEstimee={facture.dateFactureEstimee}
          retour={`/factures/${facture.id}`}
        />
      </Card>
    </div>
  );
}
