import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, PenLine, Phone, Plus } from "lucide-react";
import { ClientInvoices } from "@/components/clients/client-invoices";
import { BackLink } from "@/components/ui/back-link";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { trouverClient } from "@/lib/clients";
import { formatFCFA } from "@/lib/format";
import { formatTogoPhone } from "@/lib/phone";
import { requireEntreprise } from "@/lib/session";

export const metadata: Metadata = { title: "Fiche client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { entrepriseId } = await requireEntreprise();
  const { id } = await params;
  // Filtré par entreprise : l'identifiant d'un client d'une autre entreprise donne une page introuvable.
  const client = await trouverClient(entrepriseId, id);
  if (!client) notFound();

  return (
    <>
      <BackLink href="/clients">Clients</BackLink>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-stretch">
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-display text-h1 font-medium break-words">{client.nom}</h1>
            <ButtonLink href={`/clients/${client.id}/modifier`} variant="secondary">
              <PenLine className="size-4" aria-hidden />
              Modifier
            </ButtonLink>
          </div>
          <ul className="flex flex-col gap-1.5 text-body text-ink-muted">
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" aria-hidden />
              <span className="text-ink">{formatTogoPhone(client.whatsapp)}</span>
            </li>
            {client.email && (
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" aria-hidden />
                <span className="text-ink break-all">{client.email}</span>
              </li>
            )}
            {client.relancesEnPause && <li className="text-body-sm font-semibold">‖ Les relances sont en pause pour ce client.</li>}
          </ul>
        </Card>

        <Card className="flex flex-col justify-center gap-1 lg:min-w-72">
          <p className="text-body-sm text-ink-muted">Total dû</p>
          <p className="tabular font-display text-[2rem] leading-tight">{formatFCFA(client.totalDu)}</p>
          <p className="text-body-sm text-ink-muted">
            {client.nbFacturesDues === 0 ? "Aucune facture à payer" : client.nbFacturesDues === 1 ? "1 facture à payer" : `${client.nbFacturesDues} factures à payer`}
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Factures</CardTitle>
          <ButtonLink href="/factures/nouvelle" variant="secondary" size="sm">
            <Plus className="size-4" aria-hidden />
            Ajouter une facture
          </ButtonLink>
        </div>
        {client.factures.length === 0 ? (
          <EmptyState title="Aucune facture pour ce client">Ajoutez une facture pour commencer à suivre ce qu&apos;il vous doit.</EmptyState>
        ) : (
          <ClientInvoices factures={client.factures} />
        )}
      </div>
    </>
  );
}
