import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAmount, formatDate, formatFCFA } from "@/lib/format";
import { resteDu as resteDuFacture } from "@/lib/facture-regles";
import type { LigneFacture } from "@/lib/factures-liste";

const resteDu = (f: LigneFacture) => resteDuFacture(f.statut, f.montant, f.montantPaye);

/**
 * Factures : cartes sur mobile, tableau à partir de 768 px. Toute la carte (ou toute la ligne) ouvre la fiche de la facture ;
 * le nom du client, lui, ouvre la fiche du client.
 */
export function ListeFactures({ lignes, legende }: { lignes: LigneFacture[]; legende: string }) {
  return (
    <>
      <ul className="flex flex-col gap-2.5 md:hidden">
        {lignes.map((f) => (
          <li key={f.id} className="relative flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 hover:bg-surface-muted">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/clients/${f.clientId}`} className="relative z-10 min-w-0 font-semibold break-words hover:text-primary">
                {f.clientNom}
              </Link>
              <span className="tabular shrink-0 font-display text-h3">{formatFCFA(f.montant)}</span>
            </div>
            <p className="text-body-sm text-ink-muted">
              <Link href={`/factures/${f.id}`} className="font-semibold text-ink after:absolute after:inset-0">
                {f.numero}
              </Link>{" "}
              · échéance {formatDate(f.echeance)}
            </p>
            {f.montantPaye > 0 && resteDu(f) > 0 && <p className="text-body-sm text-ink-muted">Reste à payer : {formatFCFA(resteDu(f))}</p>}
            <div className="mt-1">
              <StatusBadge status={f.statut} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
        <table className="w-full text-left text-body">
          <caption className="sr-only">{legende}</caption>
          <thead className="bg-surface-muted text-body-sm text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Client</th>
              <th scope="col" className="px-4 py-3 font-semibold">Échéance</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Montant (FCFA)</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Reste à payer</th>
              <th scope="col" className="px-4 py-3 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((f) => (
              <tr key={f.id} className="relative border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/clients/${f.clientId}`} className="relative z-10 font-semibold hover:text-primary">
                    {f.clientNom}
                  </Link>
                  <div className="text-caption">
                    <Link href={`/factures/${f.id}`} className="text-ink-muted after:absolute after:inset-0 hover:text-primary">
                      {f.numero}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(f.echeance)}</td>
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
