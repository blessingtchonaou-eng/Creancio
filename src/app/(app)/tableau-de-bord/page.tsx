import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { KpiCard } from "@/components/ui/kpi-card";
import { PriorityInvoices } from "@/components/dashboard/priority-invoices";
import { ReminderEfficiency } from "@/components/dashboard/reminder-efficiency";
import { ActiveScenario } from "@/components/dashboard/active-scenario";
import { formatFCFA } from "@/lib/format";
import { requireEntreprise } from "@/lib/session";
import { ACTIVE_SCENARIO, INVOICES, KPIS, OUTSTANDING_TOTAL, REMINDER_RESULTS } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Tableau de bord" };
export const dynamic = "force-dynamic"; // date du jour à chaque visite

export default async function DashboardPage() {
  const { user } = await requireEntreprise();
  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-body-sm text-ink-muted">Bonjour {user.name.split(" ")[0]}, nous sommes {today}</p>
          <h1 className="mt-1 font-display text-[2rem] leading-tight font-medium tracking-tight sm:text-display">
            Vous attendez <span className="tabular whitespace-nowrap text-primary">{formatFCFA(OUTSTANDING_TOTAL)}</span>
          </h1>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <form action="/factures" role="search" className="sm:w-72">
            <SearchInput name="q" placeholder="Client, n° de facture…" />
          </form>
          <button type="button" className="inline-flex h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-4 text-body-sm font-medium">
            <CalendarDays className="size-4 text-ink-muted" aria-hidden />
            01/09 – 19/09/2026
          </button>
        </div>
      </div>

      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </section>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          <PriorityInvoices invoices={INVOICES} />
        </div>
        <aside className="flex flex-col gap-4 lg:w-[350px] lg:shrink-0">
          <ReminderEfficiency results={REMINDER_RESULTS} />
          <ActiveScenario steps={ACTIVE_SCENARIO} />
        </aside>
      </div>
    </>
  );
}
