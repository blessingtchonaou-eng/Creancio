import type { Metadata } from "next";
import { FileUp, Plus } from "lucide-react";
import { BlocRelancesAVenir } from "@/components/dashboard/bloc-relances-a-venir";
import { FacturesASuivre } from "@/components/dashboard/factures-a-suivre";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { KpiCard, KpiCardVide } from "@/components/ui/kpi-card";
import { SearchInput } from "@/components/ui/search-input";
import { formatAmount, formatFCFA } from "@/lib/format";
import { requireEntreprise } from "@/lib/session";
import { aujourdhuiIso } from "@/lib/status";
import { chargerTableauDeBord, type TableauDeBord } from "@/lib/tableau-de-bord";
import type { Kpi } from "@/lib/types";

export const metadata: Metadata = { title: "Tableau de bord" };
export const dynamic = "force-dynamic"; // date du jour à chaque visite

const pluriel = (n: number, un: string, plusieurs: string) => (n === 1 ? `1 ${un}` : `${n} ${plusieurs}`);

function kpiEnRetard({ enRetard }: TableauDeBord): Kpi {
  return {
    id: "retard",
    label: "En retard",
    value: formatAmount(enRetard.montant),
    unit: "FCFA",
    delta: enRetard.nb === 0 ? "Aucune facture en retard" : pluriel(enRetard.nb, "facture échue", "factures échues"),
    trend: enRetard.nb === 0 ? "good" : "bad",
  };
}

function kpiEncaisse({ encaisse }: TableauDeBord): Kpi {
  const { ceMois, moisPrecedent, nbPaiementsMoisPrecedent } = encaisse;
  // On ne compare qu'à un mois où il y a eu des paiements : sinon le pourcentage n'aurait pas de sens.
  const evolution = nbPaiementsMoisPrecedent > 0 && moisPrecedent > 0 ? Math.round(((ceMois - moisPrecedent) / moisPrecedent) * 100) : null;
  return {
    id: "encaisse",
    label: "Encaissé ce mois",
    value: formatAmount(ceMois),
    unit: "FCFA",
    delta: evolution === null ? "Depuis le 1er du mois" : `${evolution > 0 ? "+" : ""}${evolution} % par rapport au mois dernier`,
    trend: evolution === null || evolution === 0 ? "neutral" : evolution > 0 ? "good" : "bad",
  };
}

function kpiDelai({ delaiMoyen }: TableauDeBord): Kpi | null {
  if (delaiMoyen.jours === null) return null;
  const { jours, nb, nonCompteesDateEstimee } = delaiMoyen;
  const exclues = nonCompteesDateEstimee > 0 ? ` · ${pluriel(nonCompteesDateEstimee, "facture sans date d'émission non comptée", "factures sans date d'émission non comptées")}` : "";
  return {
    id: "delai",
    label: "Délai moyen de paiement",
    value: String(jours),
    unit: jours <= 1 ? "jour" : "jours",
    delta: `sur ${pluriel(nb, "facture payée", "factures payées")}${exclues}`,
    trend: "neutral",
  };
}

export default async function DashboardPage() {
  const { entrepriseId, user } = await requireEntreprise();
  const aujourdhui = aujourdhuiIso();
  const donnees = await chargerTableauDeBord(entrepriseId, aujourdhui);
  const jour = new Date(`${aujourdhui}T00:00:00.000Z`);
  const dateLongue = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(jour);
  const mois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(jour);
  const prenom = user.name.split(" ")[0];

  if (donnees.nbFactures === 0) {
    return (
      <>
        <div>
          <p className="text-body-sm text-ink-muted">Bonjour {prenom}, nous sommes {dateLongue}</p>
          <h1 className="mt-1 font-display text-[2rem] leading-tight font-medium tracking-tight sm:text-display">Aucune facture pour l&apos;instant</h1>
        </div>
        <EmptyState
          title="Ajoutez vos premières factures"
          action={
            <div className="mt-2 flex flex-wrap justify-center gap-2.5">
              <ButtonLink href="/factures/nouvelle">
                <Plus className="size-4" aria-hidden />
                Saisir une facture
              </ButtonLink>
              <ButtonLink href="/factures/import" variant="secondary">
                <FileUp className="size-4" aria-hidden />
                Importer des factures
              </ButtonLink>
            </div>
          }
        >
          Votre tableau de bord affichera ce que vos clients vous doivent dès qu&apos;une facture est enregistrée.
        </EmptyState>
      </>
    );
  }

  const delai = kpiDelai(donnees);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-body-sm text-ink-muted">Bonjour {prenom}, nous sommes {dateLongue}</p>
          <h1 className="mt-1 font-display text-[2rem] leading-tight font-medium tracking-tight sm:text-display">
            {donnees.encours.nb === 0 ? (
              "Vous n'attendez aucun paiement"
            ) : (
              <>
                Vous attendez <span className="tabular whitespace-nowrap text-primary">{formatFCFA(donnees.encours.montant)}</span>
              </>
            )}
          </h1>
        </div>
        <form action="/factures" role="search" className="sm:w-72">
          <SearchInput name="q" placeholder="Client, n° de facture…" />
        </form>
      </div>

      <section aria-label={`Indicateurs clés, ${mois}`} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard kpi={kpiEnRetard(donnees)} />
        {delai ? <KpiCard kpi={delai} /> : <KpiCardVide label="Délai moyen de paiement" message="Disponible dès la première facture payée" />}
        <KpiCard kpi={kpiEncaisse(donnees)} />
        <KpiCardVide label="Relances WhatsApp aujourd'hui" message="Disponible dès les premières relances" />
      </section>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          <FacturesASuivre factures={donnees.aSuivre} />
        </div>
        <aside className="flex flex-col gap-4 lg:w-[350px] lg:shrink-0">
          <BlocRelancesAVenir titre="Efficacité des relances" />
          <BlocRelancesAVenir titre="Scénario de relance actif" />
        </aside>
      </div>
    </>
  );
}
