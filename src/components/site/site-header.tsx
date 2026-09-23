import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { buttonClasses } from "@/components/ui/button";
import { landing } from "@/content/landing";
import { CONTENEUR } from "./commun";

/** En-tête public : un visiteur connecté voit « Mon espace » à la place de « Se connecter » (pas de redirection). */
export function SiteHeader({ connecte }: { connecte: boolean }) {
  const { entete } = landing;
  return (
    <header className={`${CONTENEUR} flex items-center justify-between gap-4 py-4 md:py-6`}>
      <Link href="/" className="flex min-h-11 items-center text-ink">
        <Logo />
      </Link>
      <nav aria-label="Sections de la page" className="hidden gap-8 text-body lg:flex">
        {entete.liens.map((lien) => (
          <a key={lien.ancre} href={`#${lien.ancre}`} className="flex min-h-11 items-center text-ink hover:text-primary">
            {lien.libelle}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <Link href={connecte ? "/tableau-de-bord" : "/connexion"} className="flex min-h-11 items-center px-1 font-medium text-ink hover:text-primary md:px-2">
          {connecte ? entete.monEspace : entete.seConnecter}
        </Link>
        <a href="#pilote" className={buttonClasses("primary", "md", "hidden lg:inline-flex")}>
          {entete.rejoindre}
        </a>
      </div>
    </header>
  );
}
