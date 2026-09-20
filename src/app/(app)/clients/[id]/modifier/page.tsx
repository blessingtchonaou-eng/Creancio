import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { modifierClientAction } from "@/app/(app)/clients/actions";
import { ClientForm } from "@/components/clients/client-form";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";
import { trouverClient } from "@/lib/clients";
import { nationalTogoPhone } from "@/lib/phone";
import { requireEntreprise } from "@/lib/session";

export const metadata: Metadata = { title: "Modifier un client" };

export default async function ModifierClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { entrepriseId } = await requireEntreprise();
  const { id } = await params;
  const client = await trouverClient(entrepriseId, id);
  if (!client) notFound();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <BackLink href={`/clients/${client.id}`}>{client.nom}</BackLink>
      <Card className="flex flex-col gap-5">
        <h1 className="font-display text-h1 font-medium">Modifier le client</h1>
        <ClientForm
          action={modifierClientAction.bind(null, client.id)}
          submitLabel="Enregistrer les changements"
          confirmLabel="Enregistrer quand même"
          confirmQuestion="Enregistrer quand même ce numéro ?"
          initial={{ nom: client.nom, whatsapp: nationalTogoPhone(client.whatsapp), email: client.email ?? "" }}
        />
      </Card>
    </div>
  );
}
