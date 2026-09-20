import { ButtonLink } from "@/components/ui/button";

/** « Précédent / Page 2 sur 5 / Suivant ». N'affiche rien s'il n'y a qu'une page. */
export function Pagination({ page, nbPages, hrefPour }: { page: number; nbPages: number; hrefPour: (page: number) => string }) {
  if (nbPages <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <ButtonLink href={hrefPour(page - 1)} variant="secondary">
          Précédent
        </ButtonLink>
      ) : (
        <span className="w-24" />
      )}
      <span className="text-body-sm text-ink-muted">
        Page {page} sur {nbPages}
      </span>
      {page < nbPages ? (
        <ButtonLink href={hrefPour(page + 1)} variant="secondary">
          Suivant
        </ButtonLink>
      ) : (
        <span className="w-24" />
      )}
    </nav>
  );
}
