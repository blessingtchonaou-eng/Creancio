import type { Metadata } from "next";
import { InvitationPilote } from "@/components/admin/invitation-pilote";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { db } from "@/lib/db";
import { formatDate, toIsoDate } from "@/lib/format";
import { formatTogoPhone } from "@/lib/phone";
import { requireAdminPlateforme } from "@/lib/session";

export const metadata: Metadata = { title: "Demandes de pilote", robots: { index: false, follow: false } };

const LIBELLES_VOLUME: Record<string, string> = {
  MOINS_DE_20: "Moins de 20 factures/mois",
  DE_20_A_100: "20 à 100 factures/mois",
  PLUS_DE_100: "Plus de 100 factures/mois",
};

const LIBELLES_STATUT: Record<string, string> = {
  NOUVELLE: "Nouvelle",
  CONTACTEE: "Contactée",
  INSCRITE: "Inscrite",
  ABANDONNEE: "Abandonnée",
  SUSPECTE: "Suspecte",
};

export default async function AdminPilotePage() {
  await requireAdminPlateforme();
  // Les demandes suspectes (limite dépassée côté formulaire) sont masquées par défaut : voir src/lib/limite-pilote.ts.
  // TODO(landing) : filtre par statut, y compris « voir les suspectes », et export CSV — reste à construire.
  const demandes = await db.demandePilote.findMany({ where: { statut: { not: "SUSPECTE" } }, orderBy: { createdAt: "desc" } });

  if (demandes.length === 0) {
    return (
      <Card>
        <EmptyState title="Aucune demande de pilote pour l'instant">Les demandes envoyées depuis la page d'accueil apparaîtront ici.</EmptyState>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-h1 font-medium">Demandes de pilote</h1>
      {demandes.map((demande) => (
        <Card key={demande.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{demande.nomEntreprise}</p>
            <span className="text-body-sm text-ink-muted">{LIBELLES_STATUT[demande.statut]}</span>
          </div>
          <p className="text-body-sm text-ink-muted">
            {formatTogoPhone(demande.whatsapp)} · {demande.ville}
            {demande.facturesParMois && ` · ${LIBELLES_VOLUME[demande.facturesParMois]}`}
          </p>
          <p className="text-body-sm text-ink-muted">Reçue le {formatDate(toIsoDate(demande.createdAt))}</p>
          {demande.note && <p className="text-body-sm">{demande.note}</p>}
          {(demande.statut === "NOUVELLE" || demande.statut === "CONTACTEE") && (
            <InvitationPilote demandePiloteId={demande.id} whatsapp={demande.whatsapp} />
          )}
        </Card>
      ))}
    </div>
  );
}
