import { hashPassword } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { BASE_URL, seConnecter, serveurAccessible } from "./session";

// Après connexion, un utilisateur sans entreprise : l'administrateur de la plateforme arrive sur /admin/pilote,
// un utilisateur ordinaire garde le parcours actuel (/bienvenue).
// PRÉREQUIS : le serveur doit connaître ADMIN_TEST comme administrateur de la plateforme. Lancez-le avec
//   ADMIN_PLATEFORME_EMAILS="admin-plateforme-test@example.com" npm run dev
// (ajoutez vos propres adresses après une virgule si besoin).
const ADMIN_TEST = { id: "test-admin-plateforme", email: "admin-plateforme-test@example.com", nom: "Admin Plateforme Test" };
const ORDINAIRE_TEST = { id: "test-sans-entreprise", email: "sans-entreprise-test@example.com", nom: "Gérant Sans Entreprise" };
const MOT_DE_PASSE = process.env.DEMO_PASSWORD ?? "creancio-demo-2026";

async function nettoyer() {
  await db.utilisateur.deleteMany({ where: { id: { in: [ADMIN_TEST.id, ORDINAIRE_TEST.id] } } });
}

function destination(r: Response) {
  return new URL(r.headers.get("location") ?? "", BASE_URL).pathname;
}

describe("utilisateur sans entreprise : destination après connexion (HTTP)", () => {
  beforeAll(async () => {
    await serveurAccessible();
    await nettoyer();
    const motDePasse = await hashPassword(MOT_DE_PASSE);
    for (const u of [ADMIN_TEST, ORDINAIRE_TEST]) {
      await db.utilisateur.create({
        data: { id: u.id, nom: u.nom, email: u.email, emailVerified: true, comptes: { create: { accountId: u.id, providerId: "credential", password: motDePasse } } },
      });
    }
  });
  afterAll(async () => {
    await nettoyer();
    await db.$disconnect();
  });

  it("administrateur de la plateforme : /admin/pilote, jamais l'onboarding", async () => {
    const page = await seConnecter(ADMIN_TEST.email);

    const admin = await page("/admin/pilote");
    if (admin.status === 404) {
      throw new Error(`Le serveur ne connaît pas ${ADMIN_TEST.email} comme administrateur : relancez-le avec ADMIN_PLATEFORME_EMAILS="${ADMIN_TEST.email}" npm run dev`);
    }
    expect(admin.status).toBe(200);
    const html = await admin.text();
    expect(html).toContain("Me déconnecter");
    expect(html).not.toContain("Retour à l&#x27;application"); // sans entreprise, ce lien le renverrait ici

    // Destination par défaut après connexion (/tableau-de-bord), un autre écran de l'application, et l'onboarding.
    for (const chemin of ["/tableau-de-bord", "/factures", "/bienvenue"]) {
      const r = await page(chemin);
      expect(r.status, chemin).toBe(307);
      expect(destination(r), chemin).toBe("/admin/pilote");
    }
  });

  it("utilisateur ordinaire sans entreprise : comportement inchangé (/bienvenue)", async () => {
    const page = await seConnecter(ORDINAIRE_TEST.email);

    const r = await page("/tableau-de-bord");
    expect(r.status).toBe(307);
    expect(destination(r)).toBe("/bienvenue");
    expect((await page("/bienvenue")).status).toBe(200);
    expect((await page("/admin/pilote")).status).toBe(404);
  });
});
