import type { Metadata } from "next";
import { creerClientAction } from "@/app/(app)/clients/actions";
import { ClientForm } from "@/components/clients/client-form";
import { BackLink } from "@/components/ui/back-link";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ajouter un client" };

export default function NouveauClientPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <BackLink href="/clients">Clients</BackLink>
      <Card className="flex flex-col gap-5">
        <h1 className="font-display text-h1 font-medium">Ajouter un client</h1>
        <ClientForm action={creerClientAction} submitLabel="Ajouter ce client" />
      </Card>
    </div>
  );
}
