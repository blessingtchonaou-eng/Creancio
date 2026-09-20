"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { FilterChips, type ChipOption } from "@/components/ui/filter-chips";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/feedback";
import { formatAmount, formatDate } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import type { StatutFacture } from "@/generated/prisma/enums";
import type { Invoice } from "@/lib/types";

type StatusFilter = Extract<StatutFacture, "ECHUE" | "EN_RELANCE" | "PARTIELLEMENT_PAYEE" | "PAYEE">;
type Filter = "toutes" | StatusFilter;
const FILTERS: StatusFilter[] = ["ECHUE", "EN_RELANCE", "PARTIELLEMENT_PAYEE", "PAYEE"];

export function PriorityInvoices({ invoices }: { invoices: Invoice[] }) {
  const [filter, setFilter] = useState<Filter>("toutes");

  const options: ChipOption<Filter>[] = useMemo(
    () => [
      { value: "toutes", label: "Toutes", count: invoices.length },
      ...FILTERS.map((s) => ({
        value: s,
        label: STATUS_META[s].short,
        glyph: STATUS_META[s].glyph,
        count: invoices.filter((i) => i.status === s).length,
      })),
    ],
    [invoices],
  );

  const rows = filter === "toutes" ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <Card className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <CardTitle>Factures prioritaires</CardTitle>
        <FilterChips label="Filtrer par statut" options={options} value={filter} onChange={setFilter} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucune facture dans ce filtre">Choisissez un autre statut pour voir vos factures.</EmptyState>
      ) : (
        <>
          {/* Desktop : tableau */}
          <table className="hidden w-full text-left text-body-sm md:table">
            <caption className="sr-only">Factures à suivre en priorité</caption>
            <thead>
              <tr className="border-b border-border text-caption text-ink-muted">
                <th scope="col" className="py-2 font-normal">Client</th>
                <th scope="col" className="py-2 font-normal">Échéance</th>
                <th scope="col" className="py-2 text-right font-normal">Montant (FCFA)</th>
                <th scope="col" className="py-2 pl-6 font-normal">Prochaine relance</th>
                <th scope="col" className="py-2 font-normal">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="border-b border-border/70 hover:bg-bg">
                  <td className="py-2.5">
                    <Link href={`/factures/${inv.id}`} className="font-semibold hover:text-primary">{inv.clientName}</Link>
                    <div className="text-caption text-ink-muted">{inv.number}</div>
                  </td>
                  <td>{formatDate(inv.dueDate)}</td>
                  <td className="tabular text-right font-medium">{formatAmount(inv.amount)}</td>
                  <td className="pl-6 text-ink-muted">{inv.nextReminder ?? "arrêtée"}</td>
                  <td><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile : cartes */}
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((inv) => (
              <li key={inv.id}>
                <Link href={`/factures/${inv.id}`} className="flex flex-col gap-1.5 rounded-md border border-border p-3.5 active:bg-bg">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-semibold">{inv.clientName}</p>
                    <p className="tabular shrink-0 font-semibold">{formatAmount(inv.amount)} F</p>
                  </div>
                  <p className="text-caption text-ink-muted">{inv.number} · échéance {formatDate(inv.dueDate)}</p>
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={inv.status} />
                    <span className="text-caption text-ink-muted">Relance : {inv.nextReminder ?? "arrêtée"}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link href="/factures" className="mt-auto self-start text-body-sm font-medium text-primary hover:text-primary-strong">
        Voir toutes les factures
      </Link>
    </Card>
  );
}
