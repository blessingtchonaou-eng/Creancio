import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { creerInvitation } from "@/lib/invitation-pilote";
import { BASE_URL, serveurAccessible } from "./session";

// Écran /inscription pendant la fermeture publique : ce que voit un visiteur selon le jeton dans l'adresse.
const ADMIN = "test-inscription-page-admin";
const DEMANDE = "test-inscription-page-demande";

async function page(chemin: string) {
  return fetch(`${BASE_URL}${chemin}`, { redirect: "manual" });
}

describe("/inscription : jeton d'invitation (HTTP)", () => {
  let jetonValide: string;

  beforeAll(async () => {
    await serveurAccessible();
    await db.invitationPilote.deleteMany({ where: { demandePiloteId: DEMANDE } });
    await db.demandePilote.deleteMany({ where: { id: DEMANDE } });
    await db.utilisateur.deleteMany({ where: { id: ADMIN } });
    await db.utilisateur.create({ data: { id: ADMIN, nom: "Admin Test", email: `admin-inscription-page-${randomBytes(4).toString("hex")}@example.com`, role: "ADMIN" } });
    await db.demandePilote.create({ data: { id: DEMANDE, nomEntreprise: "PME Page Test", whatsapp: "+22890000009", consentement: true } });
    const c = await creerInvitation(DEMANDE, ADMIN);
    if (!c.ok) throw new Error("préparation impossible");
    jetonValide = c.jeton;
  });
  afterAll(async () => {
    await db.invitationPilote.deleteMany({ where: { demandePiloteId: DEMANDE } });
    await db.demandePilote.deleteMany({ where: { id: DEMANDE } });
    await db.utilisateur.deleteMany({ where: { id: ADMIN } });
    await db.$disconnect();
  });

  it("sans jeton : pas de formulaire, message de fermeture", async () => {
    const r = await page("/inscription");
    const html = await r.text();
    expect(html).toContain("Les inscriptions sont fermées pendant la phase pilote.");
    expect(html).not.toContain('name="password"');
  });

  it("jeton invalide : message d'erreur, pas de formulaire", async () => {
    const r = await page("/inscription?invitation=jeton-invente");
    const html = await r.text();
    expect(html).toContain("Ce lien d&#x27;invitation n&#x27;est plus valide.");
    expect(html).not.toContain('name="password"');
  });

  it("jeton valide : le formulaire s'affiche", async () => {
    const r = await page(`/inscription?invitation=${encodeURIComponent(jetonValide)}`);
    const html = await r.text();
    expect(html).toContain('name="password"');
    expect(html).toContain(`value="${jetonValide}"`);
  });

  it("Referrer-Policy est posé sur /inscription (jeton jamais transmis à un site tiers)", async () => {
    const r = await page("/inscription");
    expect(r.headers.get("referrer-policy")).toBe("no-referrer");
    // Cache-Control est déclaré à "no-store" (next.config.ts, comme /nouveau-mot-de-passe) mais Next.js impose le sien
    // aux pages dynamiques : la valeur sur le fil est "no-cache, must-revalidate", pas "no-store" (voir TODO-PRODUCTION.md).
    // Ça reste non mis en cache sans revalidation : pas de risque de servir une copie périmée, mais pas une interdiction
    // stricte de stockage.
    expect(r.headers.get("cache-control")).toContain("no-cache");
  });
});
