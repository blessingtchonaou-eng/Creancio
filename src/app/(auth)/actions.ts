"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { appelerRoute } from "@/lib/auth-route";
import { fieldErrorsFrom, stringValues, type FormState } from "@/lib/form-state";
import { lireIpClient } from "@/lib/ip-client";
import { attenteAvantTentative, enregistrerEchec, MESSAGE_TROP_DE_TENTATIVES, reussite } from "@/lib/limites-auth";
import { requireUser } from "@/lib/session";
import { demandeReinitialisationSchema, nouveauMotDePasseSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";

const TROP_DE_TENTATIVES = "Trop d'essais. Attendez une minute, puis réessayez.";

/** N'accepte qu'un chemin interne (« /factures »), jamais une adresse externe. */
function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/tableau-de-bord";
}

export async function inscription(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = stringValues(formData);
  delete values.password;
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  // Limite sur les échecs (par IP, par couple IP + adresse, par adresse) : auth.api ne passe pas par le limiteur du routeur.
  const entetes = await headers();
  const ip = lireIpClient(entetes);
  const attente = await attenteAvantTentative("inscription", ip, parsed.data.email);
  if (attente) return { error: MESSAGE_TROP_DE_TENTATIVES, values };

  try {
    await auth.api.signUpEmail({
      body: { name: parsed.data.nom, email: parsed.data.email, password: parsed.data.password, callbackURL: "/tableau-de-bord" },
      headers: entetes,
    });
  } catch (e) {
    if (e instanceof APIError) {
      await enregistrerEchec("inscription", ip, parsed.data.email);
      const code = (e.body as { code?: string } | undefined)?.code ?? "";
      if (code.includes("USER_ALREADY_EXISTS")) {
        return { fieldErrors: { email: "Un compte existe déjà avec cet e-mail. Connectez-vous à la place." }, values };
      }
      return { error: "Le compte n'a pas pu être créé. Vérifiez les champs, puis réessayez.", values };
    }
    throw e;
  }
  redirect("/bienvenue");
}

export async function connexion(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = stringValues(formData);
  delete values.password;
  delete values.suite;
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  // Limite sur les échecs (par IP, par couple IP + adresse, par adresse) : auth.api ne passe pas par le limiteur du routeur.
  // Même message de refus que le compte existe ou non.
  const entetes = await headers();
  const ip = lireIpClient(entetes);
  const attente = await attenteAvantTentative("connexion", ip, parsed.data.email);
  if (attente) return { error: MESSAGE_TROP_DE_TENTATIVES, values };

  try {
    await auth.api.signInEmail({ body: { email: parsed.data.email, password: parsed.data.password }, headers: entetes });
  } catch (e) {
    if (e instanceof APIError) {
      await enregistrerEchec("connexion", ip, parsed.data.email);
      // Même message que l'e-mail existe ou non : on ne révèle pas qui a un compte.
      return { error: "E-mail ou mot de passe incorrect. Vérifiez-les, puis réessayez.", values };
    }
    throw e;
  }
  await reussite("connexion", ip, parsed.data.email);
  redirect(safeNext(formData.get("suite")));
}

export async function deconnexion() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/connexion");
}

// --- Mot de passe oublié ---------------------------------------------------------------------------------------------

/** Même phrase que le compte existe ou non : on ne révèle pas qui a un compte. */
const MESSAGE_LIEN_ENVOYE = "Si un compte existe avec cette adresse, un e-mail vient de partir.";

export async function demanderReinitialisation(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = stringValues(formData);
  const parsed = demandeReinitialisationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };

  // Par le routeur : la limite de débit de la route publique s'applique aussi ici.
  const r = await appelerRoute("/request-password-reset", { email: parsed.data.email, redirectTo: "/nouveau-mot-de-passe" });
  if (r.status === 429) return { error: TROP_DE_TENTATIVES, values };
  if (r.status >= 500) return { error: "La demande n'a pas pu être envoyée. Réessayez dans un instant.", values };
  return { success: MESSAGE_LIEN_ENVOYE, values };
}

export async function reinitialiserMotDePasse(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = nouveauMotDePasseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    // Un jeton absent est un lien cassé, pas une faute de saisie.
    if (fieldErrors.token) redirect("/nouveau-mot-de-passe?error=INVALID_TOKEN");
    return { fieldErrors };
  }
  const r = await appelerRoute("/reset-password", { newPassword: parsed.data.password, token: parsed.data.token });
  if (r.status === 429) return { error: TROP_DE_TENTATIVES };
  if (r.status === 200) redirect("/connexion?message=mot-de-passe-modifie");
  // Lien expiré, déjà utilisé ou inventé : la page dit quoi faire.
  redirect("/nouveau-mot-de-passe?error=INVALID_TOKEN");
}

// --- Confirmation de l'adresse e-mail ---------------------------------------------------------------------------------

export async function renvoyerVerification(): Promise<FormState> {
  const user = await requireUser();
  if (user.emailVerified) return { success: "Votre adresse e-mail est déjà confirmée." };
  const r = await appelerRoute("/send-verification-email", { email: user.email, callbackURL: "/tableau-de-bord" });
  if (r.status === 429) return { error: TROP_DE_TENTATIVES };
  if (!r.ok) return { error: "L'e-mail n'a pas pu être envoyé. Réessayez dans un instant." };
  return { success: `E-mail envoyé à ${user.email}. Pensez à regarder dans vos courriers indésirables.` };
}
