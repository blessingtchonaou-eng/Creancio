import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { db } from "@/lib/db";
import { requireEntreprise } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Redirige vers /connexion (pas de session) ou /bienvenue (pas d'entreprise) avant tout affichage.
  const { user, entrepriseId } = await requireEntreprise();
  const entreprise = await db.entreprise.findUniqueOrThrow({ where: { id: entrepriseId }, select: { raisonSociale: true } });

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1280px] flex-col gap-5 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pb-8">
      <AppHeader userName={user.name} companyName={entreprise.raisonSociale} />
      <main id="contenu" className="flex flex-col gap-5">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
