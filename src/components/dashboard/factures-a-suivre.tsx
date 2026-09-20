import Link from "next/link";
import { ListeFactures } from "@/components/factures/liste-factures";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import type { FactureASuivre } from "@/lib/tableau-de-bord";

/** Les factures encore dues, la plus en retard d'abord. La liste complète, avec filtres et recherche, est sur /factures. */
export function FacturesASuivre({ factures }: { factures: FactureASuivre[] }) {
  return (
    <Card className="flex min-w-0 flex-col gap-3">
      <CardTitle>Factures à suivre</CardTitle>
      {factures.length === 0 ? (
        <EmptyState title="Rien à encaisser">Toutes vos factures sont payées ou annulées.</EmptyState>
      ) : (
        <ListeFactures lignes={factures} legende="Factures à suivre en priorité" />
      )}
      <Link href="/factures" className="mt-auto inline-flex min-h-11 items-center self-start text-body-sm font-medium text-primary hover:text-primary-strong">
        Voir toutes les factures
      </Link>
    </Card>
  );
}
