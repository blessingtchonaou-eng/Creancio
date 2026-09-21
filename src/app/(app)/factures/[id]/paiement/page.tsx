import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { enregistrerPaiementAction } from "@/app/(app)/factures/[id]/actions";
import { PaiementForm } from "@/components/factures/paiement-form";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { PEUT_RECEVOIR_PAIEMENT } from "@/lib/facture-regles";
import { trouverFacture } from "@/lib/factures-fiche";
import { formatFCFA } from "@/lib/format";
import { requireEntreprise } from "@/lib/session";
import { aujourdhuiIso } from "@/lib/status";

export const metadata: Metadata = { title: "Enregistrer un paiement" };
export const dynamic = "force-dynamic"; // identifiant d'envoi et date du jour neufs à chaque ouverture

export default async function PaiementPage({ params }: { params: Promise<{ id: string }> }) {
  const { entrepriseId } = await requireEntreprise();
  const { id } = await params;
  const aujourdhui = aujourdhuiIso();
  const facture = await trouverFacture(entrepriseId, id, aujourdhui);
  if (!facture) notFound();
  // Rien à encaisser (payée, annulée) : retour à la fiche, qui explique pourquoi.
  if (facture.resteDu <= 0 || !PEUT_RECEVOIR_PAIEMENT.includes(facture.statut)) redirect(`/factures/${facture.id}`);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <BackLink href={`/factures/${facture.id}`}>{facture.numero}</BackLink>
      <Card className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-h1 font-medium">Enregistrer un paiement</h1>
          <p className="mt-1 text-body-sm text-ink-muted">
            {facture.client.nom} · {facture.numero} · reste à payer {formatFCFA(facture.resteDu)}
          </p>
        </div>
        <PaiementForm
          action={enregistrerPaiementAction.bind(null, facture.id)}
          cle={randomUUID()}
          resteDu={facture.resteDu}
          aujourdhui={aujourdhui}
          dateFacture={facture.dateFacture}
          dateFactureEstimee={facture.dateFactureEstimee}
          retour={`/factures/${facture.id}`}
        />
      </Card>
    </div>
  );
}
