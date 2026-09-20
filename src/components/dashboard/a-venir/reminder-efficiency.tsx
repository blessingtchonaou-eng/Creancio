// À VENIR — pas encore branché. Cette mise en forme (anneau « payées / lues / non lues ») resservira quand les relances
// existeront (étapes 7-8 du planning, WhatsApp + planificateur). D'ici là, le tableau de bord affiche un EmptyState.
import { Card } from "@/components/ui/card";

interface Results { sent: number; paid: number; readPending: number; unread: number }

export function ReminderEfficiency({ results }: { results: Results }) {
  const { sent, paid, readPending, unread } = results;
  const pPaid = Math.round((paid / sent) * 100);
  const pRead = Math.round((readPending / sent) * 100);
  const cut1 = pPaid;
  const cut2 = pPaid + pRead;
  const legend = [
    { glyph: "✓", label: "Payées après relance", value: paid, color: "bg-success" },
    { glyph: "◉", label: "Lues, en attente", value: readPending, color: "bg-mustard" },
    { glyph: "○", label: "Non lues", value: unread, color: "bg-border-strong" },
  ];
  return (
    <Card className="flex items-center gap-5">
      <div
        role="img"
        aria-label={`Sur ${sent} relances : ${paid} payées, ${readPending} lues en attente, ${unread} non lues`}
        className="flex size-27 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(var(--color-success) 0 ${cut1}%, var(--color-mustard) ${cut1}% ${cut2}%, var(--color-border-strong) ${cut2}% 100%)`,
        }}
      >
        <div className="flex size-19 flex-col items-center justify-center rounded-full bg-surface">
          <span className="font-display text-xl">{pPaid} %</span>
          <span className="text-[0.625rem] text-ink-muted">payées</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-body-sm">
        <h2 className="font-display text-[1.0625rem]">Efficacité des relances</h2>
        <p className="text-caption text-ink-muted">{sent} relances envoyées ce mois</p>
        <ul className="flex flex-col gap-1">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-2 text-caption whitespace-nowrap">
              <span className={`size-2.5 shrink-0 rounded-[3px] ${l.color}`} aria-hidden />
              <span aria-hidden>{l.glyph}</span>
              {l.label}
              <span className="tabular ml-auto pl-2 font-semibold">{l.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
