import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { estAdminPlateforme } from "@/lib/admin-plateforme";
import { requireUser } from "@/lib/session";

// Accessible dès que l'utilisateur est connecté, même sans entreprise (c'est ici qu'il la crée).
// Exception : l'administrateur de la plateforme sans entreprise n'a rien à faire ici, il part vers /admin/pilote.
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.entrepriseId && estAdminPlateforme(user.email, user.emailVerified)) redirect("/admin/pilote");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <Logo />
      <main id="contenu">{children}</main>
    </div>
  );
}
