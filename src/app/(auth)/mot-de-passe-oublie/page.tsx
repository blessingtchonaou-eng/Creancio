import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOubliePage() {
  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-h1 font-medium">Mot de passe oublié</h1>
        <p className="mt-1 text-body-sm text-ink-muted">Saisissez l&apos;adresse e-mail de votre compte. Nous vous envoyons un lien pour choisir un nouveau mot de passe.</p>
      </div>
      <ForgotPasswordForm />
      <p className="text-body-sm text-ink-muted">
        <Link href="/connexion" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2">
          Retour à la connexion
        </Link>
      </p>
    </Card>
  );
}
