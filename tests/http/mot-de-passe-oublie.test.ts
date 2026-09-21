import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { BASE_URL, anonyme, seConnecter, serveurAccessible } from "./session";

// Mot de passe oublié, vu depuis le navigateur. Les utilisateurs de test sont créés directement en base (pas d'appel à /sign-up).
// Une seule connexion pour toute la suite (beforeAll) : la session sert à vérifier qu'elle est révoquée après la réinitialisation.
// Les jetons des scénarios sont insérés en base : ils évitent de dépasser la limite de 3 demandes par minute et par IP.
// Chaque appel direct à la route utilise une adresse IP différente (en-tête x-forwarded-for) : la limite par IP n'est alors pas
// ce qui arrête les demandes, seule l'est la limite par adresse e-mail.
const MOT_DE_PASSE = process.env.DEMO_PASSWORD ?? "creancio-demo-2026";
const NOUVEAU = "Nouveau-mdp-2026!";
const EMAILS = ["test-mdp-oublie@example.com", "test-mdp-inconnu@example.com", "test-mdp-limite@example.com"];

const ipAleatoire = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;

function demanderLien(email: string, ip = ipAleatoire()) {
  return fetch(`${BASE_URL}/api/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL, "x-forwarded-for": ip },
    body: JSON.stringify({ email, redirectTo: "/nouveau-mot-de-passe" }),
  });
}

function reinitialiser(token: string, newPassword: string) {
  return fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL, "x-forwarded-for": ipAleatoire() },
    body: JSON.stringify({ token, newPassword }),
  });
}

const lienDuMail = (token: string) => fetch(`${BASE_URL}/api/auth/reset-password/${token}?callbackURL=${encodeURIComponent("/nouveau-mot-de-passe")}`, { redirect: "manual", headers: { "x-forwarded-for": ipAleatoire() } });

async function creerJeton(userId: string, token: string, expiresAt: Date) {
  await db.verification.create({ data: { identifier: `reset-password:${token}`, value: userId, expiresAt } });
}
const dansUneHeure = () => new Date(Date.now() + 3_600_000);
const nbJetons = (userId: string) => db.verification.count({ where: { identifier: { startsWith: "reset-password:" }, value: userId } });

describe("mot de passe oublié (HTTP)", () => {
  let session: Awaited<ReturnType<typeof seConnecter>>;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    await serveurAccessible();
    await db.utilisateur.deleteMany({ where: { email: { in: EMAILS } } });
    const hache = await hashPassword(MOT_DE_PASSE);
    for (const email of EMAILS) {
      const u = await db.utilisateur.create({ data: { nom: "Test Oubli", email, emailVerified: true, role: "COLLABORATEUR" } });
      // Comme dans le seed : l'identifiant du compte est celui de l'utilisateur (Better Auth refuse la connexion sinon).
      await db.compte.create({ data: { userId: u.id, accountId: u.id, providerId: "credential", password: hache } });
      ids[email] = u.id;
    }
    session = await seConnecter(EMAILS[0]); // la seule connexion de la suite
  });
  afterAll(async () => {
    await db.verification.deleteMany({ where: { value: { in: Object.values(ids) } } });
    await db.utilisateur.deleteMany({ where: { email: { in: EMAILS } } });
    await db.$disconnect();
  });

  const sessionActive = async () => {
    const r = await session("/api/auth/get-session");
    const corps = await r.text();
    return corps !== "null" && corps.trim() !== "" && (JSON.parse(corps)?.user?.email ?? null) === EMAILS[0];
  };

  it("les pages sont publiques et affichent leur texte en français", async () => {
    const demande = await anonyme("/mot-de-passe-oublie");
    expect(demande.status).toBe(200);
    expect(await demande.text()).toContain("Recevoir le lien");
    const connexion = await (await anonyme("/connexion")).text();
    expect(connexion).toContain("Mot de passe oublié ?");
  });

  it("adresse connue et adresse inconnue : exactement la même réponse", async () => {
    const connue = await demanderLien(EMAILS[0]);
    const inconnue = await demanderLien("personne-ne-porte-cette-adresse@example.com");
    expect(connue.status).toBe(200);
    expect(inconnue.status).toBe(connue.status);
    expect(await inconnue.text()).toBe(await connue.text());
    // Un jeton pour le compte qui existe, aucun pour l'autre
    expect(await nbJetons(ids[EMAILS[0]])).toBe(1);
    expect(await db.verification.count({ where: { value: "personne-ne-porte-cette-adresse@example.com" } })).toBe(0);
  });

  it("lien valide : la page s'ouvre, le mot de passe change, toutes les sessions sont révoquées", async () => {
    const token = `test-mdp-valide-${randomBytes(6).toString("hex")}`;
    await creerJeton(ids[EMAILS[0]], token, dansUneHeure());
    expect(await sessionActive()).toBe(true);

    // Le lien du mail vérifie le jeton SANS le consommer (un antivirus qui ouvre le lien ne le brûle pas)…
    const lien = await lienDuMail(token);
    expect(lien.status).toBe(302);
    expect(lien.headers.get("location")).toContain(`/nouveau-mot-de-passe?token=${token}`);
    const page = await anonyme(`/nouveau-mot-de-passe?token=${token}`);
    expect(page.status).toBe(200);
    expect(page.headers.get("referrer-policy")).toBe("no-referrer");
    // Jamais mis en cache : « no-store » en production, « no-cache » en développement (Next impose sa valeur).
    expect(page.headers.get("cache-control")).toMatch(/no-store|no-cache/);
    expect(await page.text()).toContain("Enregistrer le nouveau mot de passe");
    expect((await lienDuMail(token)).headers.get("location")).toContain(`token=${token}`);

    // …c'est l'envoi du formulaire qui le consomme.
    expect((await reinitialiser(token, NOUVEAU)).status).toBe(200);
    const compte = await db.compte.findFirstOrThrow({ where: { userId: ids[EMAILS[0]], providerId: "credential" } });
    expect(await verifierMotDePasse(compte.password!, NOUVEAU)).toBe(true);
    expect(await verifierMotDePasse(compte.password!, MOT_DE_PASSE)).toBe(false);

    // Sessions révoquées : le cookie de la connexion faite avant ne fonctionne plus
    expect(await sessionActive()).toBe(false);
    expect(await db.session.count({ where: { userId: ids[EMAILS[0]] } })).toBe(0);
  });

  it("lien réutilisé : refusé, le mot de passe ne bouge pas", async () => {
    const token = `test-mdp-reutilise-${randomBytes(6).toString("hex")}`;
    await creerJeton(ids[EMAILS[0]], token, dansUneHeure());
    expect((await reinitialiser(token, "Premier-mdp-2026!")).status).toBe(200);
    const avant = (await db.compte.findFirstOrThrow({ where: { userId: ids[EMAILS[0]], providerId: "credential" } })).password!;

    const encore = await reinitialiser(token, "Deuxieme-mdp-2026!");
    expect(encore.status).toBe(400);
    expect((await db.compte.findFirstOrThrow({ where: { userId: ids[EMAILS[0]], providerId: "credential" } })).password).toBe(avant);
    // Le lien d'un jeton consommé mène à la page « expiré ou déjà utilisé »
    expect((await lienDuMail(token)).headers.get("location")).toContain("error=INVALID_TOKEN");
  });

  it("lien expiré : refusé, le mot de passe ne bouge pas", async () => {
    const token = `test-mdp-expire-${randomBytes(6).toString("hex")}`;
    await creerJeton(ids[EMAILS[0]], token, new Date(Date.now() - 60_000));
    const avant = (await db.compte.findFirstOrThrow({ where: { userId: ids[EMAILS[0]], providerId: "credential" } })).password!;

    expect((await lienDuMail(token)).headers.get("location")).toContain("error=INVALID_TOKEN");
    expect((await reinitialiser(token, "Expire-mdp-2026!")).status).toBe(400);
    expect((await db.compte.findFirstOrThrow({ where: { userId: ids[EMAILS[0]], providerId: "credential" } })).password).toBe(avant);
  });

  it("la page d'un lien invalide explique quoi faire", async () => {
    for (const chemin of ["/nouveau-mot-de-passe?error=INVALID_TOKEN", "/nouveau-mot-de-passe"]) {
      const r = await anonyme(chemin);
      expect(r.status, chemin).toBe(200);
      const html = await r.text();
      expect(html, chemin).toContain("Ce lien a expiré ou a déjà été utilisé");
      expect(html, chemin).toContain("Recevoir un nouveau lien");
    }
  });

  it("un mot de passe trop court est refusé et ne consomme pas le lien", async () => {
    const token = `test-mdp-court-${randomBytes(6).toString("hex")}`;
    await creerJeton(ids[EMAILS[1]], token, dansUneHeure());
    expect((await reinitialiser(token, "court")).status).toBe(400);
    expect(await db.verification.count({ where: { identifier: `reset-password:${token}` } })).toBe(1);
  });

  it("route appelée 4 fois pour la même adresse depuis 4 IP différentes : 3 jetons au plus, réponses identiques", async () => {
    const reponses: { status: number; corps: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await demanderLien(EMAILS[2]);
      reponses.push({ status: r.status, corps: await r.text() });
    }
    expect(new Set(reponses.map((r) => `${r.status} ${r.corps}`)).size).toBe(1); // rien ne distingue la 4e
    expect(reponses[0].status).toBe(200);
    expect(await nbJetons(ids[EMAILS[2]])).toBe(3);
    // Et une 5e demande, encore d'une autre IP, n'en crée pas non plus
    await demanderLien(EMAILS[2]);
    expect(await nbJetons(ids[EMAILS[2]])).toBe(3);
  });

  it("limite par adresse IP : la 4e demande d'une même IP dans la minute reçoit 429", async () => {
    const ip = ipAleatoire();
    const statuts: number[] = [];
    for (let i = 0; i < 4; i++) statuts.push((await demanderLien("personne-ne-porte-cette-adresse@example.com", ip)).status);
    expect(statuts).toEqual([200, 200, 200, 429]);
  });
});

/** Compare à un hachage scrypt de Better Auth. */
async function verifierMotDePasse(hash: string, motDePasse: string) {
  return verifyPassword({ hash, password: motDePasse });
}
