import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Créer mon compte" };

export default async function InscriptionPage() {
  if (await getSession()) redirect("/tableau-de-bord");
  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-h1 font-medium">Créer mon compte</h1>
        <p className="mt-1 text-body-sm text-ink-muted">Trois minutes pour commencer à relancer vos clients.</p>
      </div>
      <SignUpForm />
      <p className="text-body-sm text-ink-muted">
        Vous avez déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-primary underline underline-offset-2">
          Me connecter
        </Link>
      </p>
    </Card>
  );
}
