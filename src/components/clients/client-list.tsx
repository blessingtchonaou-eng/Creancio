import Link from "next/link";
import { formatFCFA } from "@/lib/format";
import { formatTogoPhone } from "@/lib/phone";
import type { LigneClient } from "@/lib/clients";
import { cn } from "@/lib/cn";

const libelleFactures = (n: number) => (n === 0 ? "Rien à payer" : n === 1 ? "1 facture à payer" : `${n} factures à payer`);

function TotalDu({ ligne }: { ligne: LigneClient }) {
  return <span className={cn("tabular font-display text-h3", ligne.totalDu === 0 && "text-ink-muted")}>{formatFCFA(ligne.totalDu)}</span>;
}

function EnPause({ ligne }: { ligne: LigneClient }) {
  return ligne.relancesEnPause ? <span className="text-caption font-semibold text-ink-muted">‖ Relances en pause</span> : null;
}

/** Cartes sur mobile, tableau à partir de 768 px. Chaque ligne ouvre la fiche du client. */
export function ClientList({ lignes }: { lignes: LigneClient[] }) {
  return (
    <>
      <ul className="flex flex-col gap-2.5 md:hidden">
        {lignes.map((c) => (
          <li key={c.id}>
            <Link href={`/clients/${c.id}`} className="flex min-h-16 flex-col gap-1 rounded-lg border border-border bg-surface p-4 hover:bg-surface-muted">
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0 font-semibold break-words">{c.nom}</span>
                <TotalDu ligne={c} />
              </span>
              <span className="flex items-center justify-between gap-3 text-body-sm text-ink-muted">
                <span>{formatTogoPhone(c.whatsapp)}</span>
                <span>{libelleFactures(c.nbFacturesDues)}</span>
              </span>
              <EnPause ligne={c} />
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
        <table className="w-full text-left text-body">
          <caption className="sr-only">Liste des clients</caption>
          <thead className="bg-surface-muted text-body-sm text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Client</th>
              <th scope="col" className="px-4 py-3 font-semibold">WhatsApp</th>
              <th scope="col" className="px-4 py-3 font-semibold">Factures</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Total dû</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((c) => (
              <tr key={c.id} className="relative border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/clients/${c.id}`} className="font-semibold after:absolute after:inset-0">
                    {c.nom}
                  </Link>
                  <EnPause ligne={c} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatTogoPhone(c.whatsapp)}</td>
                <td className="px-4 py-3 text-ink-muted">{libelleFactures(c.nbFacturesDues)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <TotalDu ligne={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
