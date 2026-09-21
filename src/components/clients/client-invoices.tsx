import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAmount, formatDate, formatFCFA, toIsoDate } from "@/lib/format";
import { resteDu as resteDuFacture } from "@/lib/facture-regles";
import type { FactureDuClient } from "@/lib/clients";

const resteDu = (f: FactureDuClient) => resteDuFacture(f.statut, f.montant, f.montantPaye);

/** Factures d'un client : cartes sur mobile, tableau à partir de 768 px. */
export function ClientInvoices({ factures }: { factures: FactureDuClient[] }) {
  return (
    <>
      <ul className="flex flex-col gap-2.5 md:hidden">
        {factures.map((f) => (
          <li key={f.id} className="relative flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-4 hover:bg-surface-muted">
            <div className="flex items-center justify-between gap-3">
              <Link href={`/factures/${f.id}`} className="font-semibold after:absolute after:inset-0">
                {f.numero}
              </Link>
              <StatusBadge status={f.statut} />
            </div>
            <div className="flex items-baseline justify-between gap-3 text-body-sm text-ink-muted">
              <span>Échéance {formatDate(toIsoDate(f.echeance))}</span>
              <span className="tabular font-display text-h3 text-ink">{formatFCFA(f.montant)}</span>
            </div>
            {f.montantPaye > 0 && resteDu(f) > 0 && <p className="text-body-sm text-ink-muted">Reste à payer : {formatFCFA(resteDu(f))}</p>}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
        <table className="w-full text-left text-body">
          <caption className="sr-only">Factures du client</caption>
          <thead className="bg-surface-muted text-body-sm text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Numéro</th>
              <th scope="col" className="px-4 py-3 font-semibold">Échéance</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Montant (FCFA)</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Reste à payer</th>
              <th scope="col" className="px-4 py-3 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {factures.map((f) => (
              <tr key={f.id} className="relative border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3 font-semibold">
                  <Link href={`/factures/${f.id}`} className="after:absolute after:inset-0">
                    {f.numero}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(toIsoDate(f.echeance))}</td>
                <td className="tabular px-4 py-3 text-right">{formatAmount(f.montant)}</td>
                <td className="tabular px-4 py-3 text-right">{formatAmount(resteDu(f))}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={f.statut} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
