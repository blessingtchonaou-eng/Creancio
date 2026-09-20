"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { fieldErrorsFrom, stringValues, type FormState } from "@/lib/form-state";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

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

  try {
    await auth.api.signUpEmail({
      body: { name: parsed.data.nom, email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
  } catch (e) {
    if (e instanceof APIError) {
      if (e.statusCode === 429) return { error: TROP_DE_TENTATIVES, values };
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

  try {
    await auth.api.signInEmail({ body: { email: parsed.data.email, password: parsed.data.password }, headers: await headers() });
  } catch (e) {
    if (e instanceof APIError) {
      if (e.statusCode === 429) return { error: TROP_DE_TENTATIVES, values };
      // Même message que l'e-mail existe ou non : on ne révèle pas qui a un compte.
      return { error: "E-mail ou mot de passe incorrect. Vérifiez-les, puis réessayez.", values };
    }
    throw e;
  }
  redirect(safeNext(formData.get("suite")));
}

export async function deconnexion() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/connexion");
}
