import { Logo } from "@/components/layout/logo";
import { requireUser } from "@/lib/session";

// Accessible dès que l'utilisateur est connecté, même sans entreprise (c'est ici qu'il la crée).
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <Logo />
      <main id="contenu">{children}</main>
    </div>
  );
}
