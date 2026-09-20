import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Session lue en base, une seule fois par requête. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Utilisateur connecté, sinon redirection vers /connexion. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  return session.user;
}

/**
 * Point d'entrée unique pour tout écran ou action qui touche aux données d'une entreprise.
 * L'entrepriseId vient toujours d'ici, jamais du navigateur : c'est ce qui garantit l'isolation entre entreprises.
 * Tant que l'utilisateur n'a pas d'entreprise, il est renvoyé vers /bienvenue.
 */
export async function requireEntreprise() {
  const user = await requireUser();
  if (!user.entrepriseId) redirect("/bienvenue");
  return { user, entrepriseId: user.entrepriseId, role: user.role as "ADMIN" | "COLLABORATEUR" };
}

/** Comme requireEntreprise, réservé aux administrateurs. */
export async function requireAdmin() {
  const ctx = await requireEntreprise();
  if (ctx.role !== "ADMIN") redirect("/tableau-de-bord");
  return ctx;
}
