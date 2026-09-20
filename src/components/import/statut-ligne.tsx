import { cn } from "@/lib/cn";
import type { StatutLigne } from "@/lib/import/analyse";

const META: Record<StatutLigne, { libelle: string; glyphe: string; classes: string }> = {
  prete: { libelle: "Prête", glyphe: "✓", classes: "bg-st-paid-bg text-st-paid-fg" },
  erreur: { libelle: "À corriger", glyphe: "!", classes: "bg-st-overdue-bg text-st-overdue-fg" },
  a_choisir: { libelle: "Client à choisir", glyphe: "◐", classes: "bg-st-partial-bg text-st-partial-fg" },
  deja_importee: { libelle: "Déjà importée", glyphe: "‖", classes: "bg-st-paused-bg text-st-paused-fg" },
};

/** État d'une ligne de l'aperçu : symbole + texte + couleur, comme les statuts de facture. */
export function StatutLigneBadge({ statut, className }: { statut: StatutLigne; className?: string }) {
  const m = META[statut];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold", m.classes, className)}>
      <span aria-hidden>{m.glyphe}</span>
      {m.libelle}
    </span>
  );
}
