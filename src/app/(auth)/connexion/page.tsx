import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  if (await getSession()) redirect("/tableau-de-bord");
  const { suite } = await searchParams;
  return (
    <Card className="flex flex-col gap-5">
      <h1 className="font-display text-h1 font-medium">Connexion</h1>
      <SignInForm suite={suite} />
      <p className="text-body-sm text-ink-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-primary underline underline-offset-2">
          Créer mon compte
        </Link>
      </p>
    </Card>
  );
}
