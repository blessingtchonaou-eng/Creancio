import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, PauseCircle, PenLine, PlayCircle, Plus } from "lucide-react";
import { annulerFactureAction, reprendreAction, suspendreAction } from "@/app/(app)/factures/[id]/actions";
import { BlocRelancesAVenir } from "@/components/dashboard/bloc-relances-a-venir";
import { HistoriquePaiements } from "@/components/factures/historique-paiements";
import { ActionConfirmee } from "@/components/ui/action-confirmee";
import { BackLink } from "@/components/ui/back-link";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Toast } from "@/components/ui/feedback";
import { StatusBadge } from "@/components/ui/status-badge";
import { PEUT_RECEVOIR_PAIEMENT, PEUT_SUSPENDRE } from "@/lib/facture-regles";
import { trouverFacture } from "@/lib/factures-fiche";
import { formatDate, formatFCFA } from "@/lib/format";
import { MESSAGES_FICHE, lireMessage } from "@/lib/messages-fiche";
import { requireEntreprise } from "@/lib/session";

export const metadata: Metadata = { title: "Fiche facture" };

function Ligne({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-body-sm text-ink-muted">{libelle}</dt>
      <dd className="tabular font-semibold sm:text-right">{children}</dd>
    </div>
  );
}

export default async function FacturePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { entrepriseId, role } = await requireEntreprise();
  const { id } = await params;
  // Filtré par entreprise : la facture d'une autre entreprise donne une page introuvable (404), sans rien révéler.
  const facture = await trouverFacture(entrepriseId, id);
  if (!facture) notFound();
  const message = lireMessage((await searchParams).message);

  const estAdmin = role === "ADMIN";
  const annulee = facture.statut === "ANNULEE";
  const peutPayer = !annulee && facture.resteDu > 0 && PEUT_RECEVOIR_PAIEMENT.includes(facture.statut);
  const paiementsActifs = facture.paiements.filter((p) => !p.annule);
  const aPaiementMobileMoney = paiementsActifs.some((p) => !p.manuel);

  return (
    <>
      <BackLink href="/factures">Factures</BackLink>

      {message && <Toast tone="success" title={MESSAGES_FICHE[message]} />}
      {annulee && <Toast tone="info" title="Cette facture est annulée">Elle reste visible, mais elle ne se modifie plus et ne reçoit plus de paiement.</Toast>}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-h1 font-medium break-all">{facture.numero}</h1>
              <StatusBadge status={facture.statut} />
            </div>
            <p className="text-body">
              <Link href={`/clients/${facture.client.id}`} className="inline-flex min-h-11 items-center font-semibold break-words text-primary hover:text-primary-strong">
                {facture.client.nom}
              </Link>
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-body-sm text-ink-muted">Reste à payer</p>
            <p className="tabular font-display text-[2rem] leading-tight">{formatFCFA(facture.resteDu)}</p>
            {facture.joursRetard !== null && (
              <p className="text-body-sm font-semibold">
                ! {facture.joursRetard === 1 ? "1 jour de retard" : `${facture.joursRetard} jours de retard`}
              </p>
            )}
          </div>
        </div>

        {!annulee && (
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            {peutPayer && (
              <ButtonLink href={`/factures/${facture.id}/paiement`}>
                <Plus className="size-4" aria-hidden />
                Enregistrer un paiement
              </ButtonLink>
            )}
            <ButtonLink href={`/factures/${facture.id}/modifier`} variant="secondary">
              <PenLine className="size-4" aria-hidden />
              Modifier la facture
            </ButtonLink>
            {facture.statut === "SUSPENDUE" && (
              <ActionConfirmee
                action={reprendreAction.bind(null, facture.id)}
                label="Reprendre les relances"
                icon={<PlayCircle className="size-4" aria-hidden />}
                question={`Reprendre les relances de la facture ${facture.numero} ?`}
                explication="Les relances de cette facture pourront de nouveau être envoyées."
                confirmLabel="Oui, reprendre les relances"
              />
            )}
            {PEUT_SUSPENDRE.includes(facture.statut) && (
              <ActionConfirmee
                action={suspendreAction.bind(null, facture.id)}
                label="Suspendre les relances"
                icon={<PauseCircle className="size-4" aria-hidden />}
                question={`Suspendre les relances de la facture ${facture.numero} ?`}
                explication="Aucune relance ne sera envoyée pour cette facture tant que vous ne les reprenez pas. Le reste à payer ne change pas."
                confirmLabel="Oui, suspendre les relances"
              />
            )}
            {estAdmin && paiementsActifs.length === 0 && (
              <ActionConfirmee
                action={annulerFactureAction.bind(null, facture.id)}
                label="Annuler la facture"
                icon={<Ban className="size-4" aria-hidden />}
                question={`Annuler la facture ${facture.numero} ?`}
                explication="Une facture annulée reste visible mais ne se modifie plus. Cette action est définitive."
                confirmLabel="Oui, annuler la facture"
                variant="danger"
              />
            )}
          </div>
        )}
        {estAdmin && !annulee && paiementsActifs.length > 0 && (
          <p className="text-body-sm text-ink-muted">
            {aPaiementMobileMoney ? "Cette facture a reçu un paiement Mobile Money : elle ne peut pas être annulée." : "Pour annuler cette facture, annulez d'abord ses paiements."}
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <CardTitle>Détail</CardTitle>
        <dl className="flex flex-col gap-2.5">
          <Ligne libelle="Montant total">{formatFCFA(facture.montant)}</Ligne>
          <Ligne libelle="Déjà payé">{formatFCFA(facture.montantPaye)}</Ligne>
          <Ligne libelle="Reste à payer">{formatFCFA(facture.resteDu)}</Ligne>
          <Ligne libelle="Date de facture">
            {formatDate(facture.dateFacture)}
            {facture.dateFactureEstimee && <span className="block text-body-sm font-normal text-ink-muted">Date estimée : elle n&apos;était pas dans le fichier importé. Modifiez la facture pour la corriger.</span>}
          </Ligne>
          <Ligne libelle="Échéance">
            {formatDate(facture.echeance)}
            {facture.joursRetard !== null && <span className="block text-body-sm font-normal text-ink-muted">{facture.joursRetard === 1 ? "1 jour de retard" : `${facture.joursRetard} jours de retard`}</span>}
          </Ligne>
        </dl>
      </Card>

      <div className="flex flex-col gap-3">
        <CardTitle>Paiements</CardTitle>
        <HistoriquePaiements facture={facture} peutAnnuler={estAdmin} />
      </div>

      <BlocRelancesAVenir titre="Relances" />
    </>
  );
}
