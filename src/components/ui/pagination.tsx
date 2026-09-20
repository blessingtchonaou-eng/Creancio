import { Button, ButtonLink } from "@/components/ui/button";

interface Props {
  page: number;
  nbPages: number;
  /** Pagination par liens (page rendue par le serveur). */
  hrefPour?: (page: number) => string;
  /** Pagination par boutons (liste gérée dans le navigateur). */
  surChangement?: (page: number) => void;
}

/** « Précédent / Page 2 sur 5 / Suivant ». N'affiche rien s'il n'y a qu'une page. */
export function Pagination({ page, nbPages, hrefPour, surChangement }: Props) {
  if (nbPages <= 1) return null;

  const bouton = (cible: number, libelle: string) =>
    hrefPour ? (
      <ButtonLink href={hrefPour(cible)} variant="secondary">
        {libelle}
      </ButtonLink>
    ) : (
      <Button type="button" variant="secondary" onClick={() => surChangement?.(cible)}>
        {libelle}
      </Button>
    );

  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      {page > 1 ? bouton(page - 1, "Précédent") : <span className="w-24" />}
      <span className="text-body-sm text-ink-muted">
        Page {page} sur {nbPages}
      </span>
      {page < nbPages ? bouton(page + 1, "Suivant") : <span className="w-24" />}
    </nav>
  );
}
