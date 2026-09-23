import Link from "next/link";
import { deconnexion } from "@/app/(auth)/actions";
import { Logo } from "@/components/layout/logo";
import { requireAdminPlateforme } from "@/lib/session";

// Administration de la plateforme (l'équipe Créancio) : mise en page sobre, sans navigation applicative.
// requireAdminPlateforme() ici bloque l'affichage ; chaque page et chaque action la rappellent (le layout ne suffit pas).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPlateforme();
  return (
    <div className="mx-auto flex min-h-dvh max-w-[960px] flex-col gap-5 px-4 pt-5 pb-10 sm:px-6">
      <header className="flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          {/* Sans entreprise, l'application renverrait ici : le lien n'aurait pas de sens. */}
          {admin.entrepriseId && (
            <Link href="/tableau-de-bord" className="text-body-sm font-semibold text-primary underline underline-offset-2">
              Retour à l&apos;application
            </Link>
          )}
          <form action={deconnexion}>
            <button type="submit" className="min-h-11 text-body-sm font-semibold text-ink-muted underline underline-offset-2 hover:text-ink">
              Me déconnecter
            </button>
          </form>
        </div>
      </header>
      <main id="contenu" className="flex flex-col gap-5">
        {children}
      </main>
    </div>
  );
}
