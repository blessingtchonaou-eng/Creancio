import type { ReactNode } from "react";
import { landing, type Livraison } from "@/content/landing";
import { cn } from "@/lib/cn";

/** Largeur et marges de la page d'accueil (maquette : 1280 px, marges de 64 px en bureau, 20 px sur téléphone). */
export const CONTENEUR = "mx-auto w-full max-w-[1280px] px-5 md:px-16";

/** Texte de landing.ts : la variante `court` (maquette mobile) sous 768 px quand elle existe, le texte complet au-delà. */
export function Adaptatif({ texte, court }: { texte: string; court?: string }) {
  if (!court) return <>{texte}</>;
  return (
    <>
      <span className="md:hidden">{court}</span>
      <span className="hidden md:inline">{texte}</span>
    </>
  );
}

/** Étiquette des promesses pas encore livrées. */
export function EnPreparation({ livraison }: { livraison: Livraison }) {
  if (livraison === "livre") return null;
  return (
    <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-caption font-semibold text-ink-muted">
      {landing.enPreparation}
    </span>
  );
}

export function Surtitre({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[0.8125rem] font-semibold tracking-[1px] text-primary uppercase md:text-body-sm", className)}>{children}</p>;
}

export function TitreSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("font-display text-[2rem] leading-[1.12] font-medium md:text-display md:leading-[1.1] md:tracking-[-0.8px]", className)}>
      {children}
    </h2>
  );
}
