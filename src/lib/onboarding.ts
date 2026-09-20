import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ETAPE_TERMINEE } from "@/lib/entreprise";
import { requireEntreprise } from "@/lib/session";

/** Pour les écrans d'onboarding qui exigent une entreprise : renvoie vers l'application si l'onboarding est terminé. */
export async function requireOnboardingEnCours() {
  const ctx = await requireEntreprise();
  const entreprise = await db.entreprise.findUniqueOrThrow({ where: { id: ctx.entrepriseId } });
  if (entreprise.etapeOnboarding >= ETAPE_TERMINEE) redirect("/tableau-de-bord");
  return { ...ctx, entreprise };
}
