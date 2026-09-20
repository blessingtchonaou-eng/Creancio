import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { ClientList } from "@/components/clients/client-list";
import { ClientSearch } from "@/components/clients/client-search";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { listerClients } from "@/lib/clients";
import { requireEntreprise } from "@/lib/session";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { entrepriseId } = await requireEntreprise();
  const { q = "", page = "1" } = await searchParams;
  const { lignes, total, page: pageCourante, nbPages } = await listerClients(entrepriseId, { q, page: Number(page) });
  const recherche = q.trim();

  const hrefPage = (p: number) => `/clients?${new URLSearchParams({ ...(recherche ? { q: recherche } : {}), page: String(p) })}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h1 font-medium">Clients</h1>
        <ButtonLink href="/clients/nouveau">
          <Plus className="size-4" aria-hidden />
          Ajouter un client
        </ButtonLink>
      </div>

      {total === 0 && !recherche ? (
        <EmptyState
          title="Aucun client pour l'instant"
          action={
            <ButtonLink href="/clients/nouveau" className="mt-2">
              Ajouter un client
            </ButtonLink>
          }
        >
          Ajoutez un client pour lui envoyer des relances. Vous pouvez aussi importer vos factures : les clients sont créés avec elles.
        </EmptyState>
      ) : (
        <>
          <ClientSearch defaultValue={q} />
          {total === 0 ? (
            <EmptyState
              title={`Aucun client pour « ${recherche} »`}
              action={
                <ButtonLink href="/clients" variant="secondary" className="mt-2">
                  Voir tous les clients
                </ButtonLink>
              }
            >
              Vérifiez l&apos;orthographe du nom ou les chiffres du numéro.
            </EmptyState>
          ) : (
            <>
              <p className="text-body-sm text-ink-muted" aria-live="polite">
                {total === 1 ? "1 client" : `${total} clients`}
                {recherche && ` pour « ${recherche} »`}
              </p>
              <ClientList lignes={lignes} />
              <Pagination page={pageCourante} nbPages={nbPages} hrefPour={hrefPage} />
            </>
          )}
        </>
      )}
    </>
  );
}
