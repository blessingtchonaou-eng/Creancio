import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownUp, FileUp, Plus } from "lucide-react";
import { ListeFactures } from "@/components/factures/liste-factures";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { FiltresLiens } from "@/components/ui/filtres-liens";
import { Pagination } from "@/components/ui/pagination";
import { RechercheUrl } from "@/components/ui/recherche-url";
import { FILTRE_PAR_DEFAUT, FILTRES, listerFactures, lireFiltre, lireTri, type FiltreFacture, type TriEcheance } from "@/lib/factures-liste";
import { requireEntreprise } from "@/lib/session";
import { aujourdhuiIso } from "@/lib/status";

export const metadata: Metadata = { title: "Factures" };

type Parametres = Promise<Record<string, string | string[] | undefined>>;
const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const libelleFiltre = (f: FiltreFacture) => FILTRES.find((x) => x.valeur === f)!.libelle;

export default async function FacturesPage({ searchParams }: { searchParams: Parametres }) {
  const { entrepriseId } = await requireEntreprise();
  const params = await searchParams;
  const q = premier(params.q) ?? "";
  const filtre = lireFiltre(premier(params.statut));
  const tri = lireTri(premier(params.tri));
  const recherche = q.trim();

  const { lignes, total, page, nbPages, comptes, filtreApplique } = await listerFactures(
    entrepriseId,
    { q, filtre, tri, page: Number(premier(params.page) ?? "1") },
    aujourdhuiIso(),
  );

  /** Adresse de l'écran : les réglages par défaut (« À encaisser », plus ancienne d'abord) ne s'écrivent pas. */
  const href = ({ statut = filtre, ordre = tri, mot = recherche, p = 1 }: { statut?: FiltreFacture; ordre?: TriEcheance; mot?: string; p?: number } = {}) => {
    const parametres = new URLSearchParams();
    if (mot) parametres.set("q", mot);
    if (statut !== FILTRE_PAR_DEFAUT) parametres.set("statut", statut);
    if (ordre === "desc") parametres.set("tri", "desc");
    if (p > 1) parametres.set("page", String(p));
    const texte = parametres.toString();
    return texte ? `/factures?${texte}` : "/factures";
  };

  const boutons = (
    <div className="flex flex-wrap gap-2.5">
      <ButtonLink href="/factures/nouvelle">
        <Plus className="size-4" aria-hidden />
        Saisir une facture
      </ButtonLink>
      <ButtonLink href="/factures/import" variant="secondary">
        <FileUp className="size-4" aria-hidden />
        Importer des factures
      </ButtonLink>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h1 font-medium">Factures</h1>
        {boutons}
      </div>

      {comptes.toutes === 0 && !recherche ? (
        <EmptyState title="Aucune facture pour l'instant">
          Saisissez une première facture, ou importez d&apos;un coup toutes vos factures depuis un fichier Excel ou CSV.
        </EmptyState>
      ) : (
        <>
          <RechercheUrl defaultValue={q} placeholder="Numéro de facture ou nom du client" />

          {recherche ? (
            <p className="text-body-sm text-ink-muted">
              Recherche dans toutes vos factures{filtre !== "toutes" && `, le filtre « ${libelleFiltre(filtre)} » est mis de côté`}.{" "}
              <Link href={href({ mot: "" })} className="inline-flex min-h-11 items-center font-medium text-primary hover:text-primary-strong">
                Effacer la recherche
              </Link>
            </p>
          ) : (
            <FiltresLiens
              label="Filtrer par statut"
              filtres={FILTRES.map((f) => ({
                href: href({ statut: f.valeur }),
                label: f.libelle,
                glyph: f.glyphe,
                count: comptes[f.valeur],
                active: f.valeur === filtreApplique,
              }))}
            />
          )}

          {total === 0 ? (
            recherche ? (
              <EmptyState
                title={`Aucune facture pour « ${recherche} »`}
                action={
                  <ButtonLink href={href({ mot: "" })} variant="secondary" className="mt-2">
                    Effacer la recherche
                  </ButtonLink>
                }
              >
                Vérifiez le numéro de la facture ou l&apos;orthographe du nom du client.
              </EmptyState>
            ) : (
              <EmptyState
                title={filtre === "a_encaisser" ? "Rien à encaisser" : `Aucune facture « ${libelleFiltre(filtre)} »`}
                action={
                  filtre !== "toutes" && (
                    <ButtonLink href={href({ statut: "toutes" })} variant="secondary" className="mt-2">
                      Voir toutes les factures
                    </ButtonLink>
                  )
                }
              >
                {filtre === "a_encaisser" ? "Toutes vos factures sont payées ou annulées." : "Choisissez un autre statut pour voir vos factures."}
              </EmptyState>
            )
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-4">
                <p className="text-body-sm text-ink-muted" aria-live="polite">
                  {total === 1 ? "1 facture" : `${total} factures`}
                  {recherche ? ` pour « ${recherche} »` : filtreApplique !== "toutes" && ` · ${libelleFiltre(filtreApplique)}`}
                </p>
                <Link
                  href={href({ ordre: tri === "asc" ? "desc" : "asc" })}
                  className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-medium text-primary hover:text-primary-strong"
                >
                  <ArrowDownUp className="size-4" aria-hidden />
                  Échéance : {tri === "asc" ? "la plus ancienne d'abord" : "la plus récente d'abord"}
                </Link>
              </div>
              <ListeFactures lignes={lignes} legende="Liste des factures" />
              <Pagination page={page} nbPages={nbPages} hrefPour={(p) => href({ p })} />
            </>
          )}
        </>
      )}
    </>
  );
}
