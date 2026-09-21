import { XCircle } from "lucide-react";
import { annulerPaiementAction } from "@/app/(app)/factures/[id]/actions";
import { ActionConfirmee } from "@/components/ui/action-confirmee";
import { EmptyState } from "@/components/ui/feedback";
import { LIBELLE_OPERATEUR, MOTIF_MAX, MOTIF_MIN } from "@/lib/facture-regles";
import type { FicheFacture, LignePaiement } from "@/lib/factures-fiche";
import { cn } from "@/lib/cn";
import { formatAmount, formatDate, formatFCFA } from "@/lib/format";

interface Props {
  facture: FicheFacture;
  /** Vrai pour un administrateur : le bouton « Annuler ce paiement » n'existe pas pour les autres. */
  peutAnnuler: boolean;
}

const phraseAnnulation = (p: LignePaiement) =>
  p.annule ? `Annulé le ${formatDate(p.annule.le)}${p.annule.parPrenom ? ` par ${p.annule.parPrenom}` : ""}${p.annule.motif ? ` : ${p.annule.motif}` : ""}` : null;

/** Historique des paiements : un paiement annulé reste visible, barré, avec qui l'a annulé et pourquoi. */
export function HistoriquePaiements({ facture, peutAnnuler }: Props) {
  if (facture.paiements.length === 0) return <EmptyState title="Aucun paiement enregistré">Les paiements reçus pour cette facture apparaîtront ici.</EmptyState>;

  const annulable = (p: LignePaiement) => peutAnnuler && p.manuel && !p.annule && facture.statut !== "ANNULEE";
  const boutonAnnuler = (p: LignePaiement) => (
    <ActionConfirmee
      action={annulerPaiementAction.bind(null, facture.id, p.id)}
      label="Annuler ce paiement"
      icon={<XCircle className="size-4" aria-hidden />}
      question={`Annuler le paiement de ${formatFCFA(p.montant)} ?`}
      explication="Il reste visible dans l'historique, barré. Le reste à payer de la facture augmente d'autant."
      confirmLabel={`Oui, annuler le paiement de ${formatAmount(p.montant)} FCFA`}
      variant="danger"
      motif={{ label: "Pourquoi annuler ce paiement ?", aide: `De ${MOTIF_MIN} à ${MOTIF_MAX} caractères. Par exemple : faute de frappe sur le montant.`, max: MOTIF_MAX }}
    />
  );

  return (
    <>
      <ul className="flex flex-col gap-2.5 md:hidden">
        {facture.paiements.map((p) => (
          <li key={p.id} className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-4">
            <div className={cn("flex items-baseline justify-between gap-3", p.annule && "text-ink-muted line-through")}>
              <span className="font-semibold">{formatDate(p.payeLe)}</span>
              <span className="tabular font-display text-h3">{formatFCFA(p.montant)}</span>
            </div>
            <p className={cn("text-body-sm text-ink-muted", p.annule && "line-through")}>
              {LIBELLE_OPERATEUR[p.operateur]}
              {p.reference && ` · ${p.reference}`}
            </p>
            {p.manuel && <p className="text-caption text-ink-muted">Saisi à la main</p>}
            {p.annule && <p className="text-body-sm font-semibold">{phraseAnnulation(p)}</p>}
            {annulable(p) && <div className="mt-1">{boutonAnnuler(p)}</div>}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
        <table className="w-full text-left text-body">
          <caption className="sr-only">Paiements reçus pour cette facture</caption>
          <thead className="bg-surface-muted text-body-sm text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Date</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Montant (FCFA)</th>
              <th scope="col" className="px-4 py-3 font-semibold">Reçu par</th>
              <th scope="col" className="px-4 py-3 font-semibold">Référence</th>
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {facture.paiements.map((p) => (
              <tr key={p.id} className="border-t border-border align-top">
                <td className={cn("px-4 py-3 whitespace-nowrap", p.annule && "text-ink-muted line-through")}>{formatDate(p.payeLe)}</td>
                <td className={cn("tabular px-4 py-3 text-right", p.annule && "text-ink-muted line-through")}>{formatAmount(p.montant)}</td>
                <td className={cn("px-4 py-3", p.annule && "text-ink-muted line-through")}>
                  {LIBELLE_OPERATEUR[p.operateur]}
                  {p.manuel && <span className="block text-caption text-ink-muted no-underline">Saisi à la main</span>}
                </td>
                <td className={cn("px-4 py-3 break-all", p.annule && "text-ink-muted line-through")}>{p.reference ?? "—"}</td>
                <td className="px-4 py-3">
                  {p.annule && <span className="text-body-sm font-semibold">{phraseAnnulation(p)}</span>}
                  {annulable(p) && boutonAnnuler(p)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
