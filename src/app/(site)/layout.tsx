import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSession } from "@/lib/session";

// Site public : pas de navigation de l'application, pas de requireEntreprise(). Un visiteur connecté n'est pas redirigé.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const connecte = Boolean(await getSession());
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader connecte={connecte} />
      <main id="contenu" className="flex flex-col">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
