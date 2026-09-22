import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { LIMITES, MESSAGE_TROP_DE_TENTATIVES, clesLimites } from "@/lib/limites-auth";

// Les actions réelles (connexion, inscription), avec la vraie base et le vrai Better Auth ; seuls les modules propres à Next
// (en-têtes de la requête, cookies, redirection) sont simulés. On vérifie que les limites s'appliquent bien à ces actions,
// que auth.api appelle sans passer par le limiteur du routeur.
// Chaque vérification de mot de passe coûte ~100 ms (scrypt) : les boucles d'échecs dépassent le délai par défaut de 5 s.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
let enteteIp = "203.0.113.10";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": enteteIp, origin: "http://localhost:3000" }),
  cookies: async () => ({ set: () => undefined, get: () => undefined, getAll: () => [], has: () => false, delete: () => undefined }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const MOT_DE_PASSE = "creancio-test-2026";
const EMAIL_EXISTANT = `test-action-limite-${randomBytes(4).toString("hex")}@example.com`;
const formulaire = (champs: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
};
const cles = new Set<string>();
const suivre = (op: "connexion" | "inscription", ip: string, email: string) => Object.values(clesLimites(op, ip, email)).forEach((c) => cles.add(c));
const ipAlea = () => `203.0.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
const NOUVEL_EMAIL = () => `test-action-limite-${randomBytes(4).toString("hex")}@example.com`;

let connexion: typeof import("./actions").connexion;
let inscription: typeof import("./actions").inscription;

beforeAll(async () => {
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  ({ connexion, inscription } = await import("./actions"));
  const u = await db.utilisateur.create({ data: { nom: "Test Limite", email: EMAIL_EXISTANT, emailVerified: true, role: "COLLABORATEUR" } });
  await db.compte.create({ data: { userId: u.id, accountId: u.id, providerId: "credential", password: await hashPassword(MOT_DE_PASSE) } });
});
beforeEach(() => {
  enteteIp = ipAlea();
});
afterAll(async () => {
  await db.verification.deleteMany({ where: { identifier: { contains: "test-action-limite-" } } });
  await db.utilisateur.deleteMany({ where: { email: { startsWith: "test-action-limite-" } } });
  await db.limiteDebit.deleteMany({ where: { cle: { in: [...cles] } } });
  await db.$disconnect();
});

const tentative = (email: string, motDePasse: string) => connexion({}, formulaire({ email, password: motDePasse })).catch((e: Error) => e);

describe("action connexion", () => {
  it("le 11e échec d'un même couple IP + adresse est refusé, avec le même message que pour un compte inconnu", async () => {
    const ip = enteteIp;
    suivre("connexion", ip, EMAIL_EXISTANT);
    for (let i = 0; i < LIMITES.couple.max; i++) {
      const r = (await tentative(EMAIL_EXISTANT, "mauvais-mot-de-passe")) as { error?: string };
      expect(r.error, `essai ${i + 1}`).toContain("incorrect");
    }
    const bloque = (await tentative(EMAIL_EXISTANT, "mauvais-mot-de-passe")) as { error?: string };
    expect(bloque.error).toBe(MESSAGE_TROP_DE_TENTATIVES);
    // Même une bonne réponse est refusée tant que le couple est bloqué
    expect(((await tentative(EMAIL_EXISTANT, MOT_DE_PASSE)) as { error?: string }).error).toBe(MESSAGE_TROP_DE_TENTATIVES);

    // Adresse inconnue : le même blocage, le même message
    const inconnue = NOUVEL_EMAIL();
    suivre("connexion", ip, inconnue);
    for (let i = 0; i < LIMITES.couple.max; i++) await tentative(inconnue, "mauvais-mot-de-passe");
    expect(((await tentative(inconnue, "mauvais-mot-de-passe")) as { error?: string }).error).toBe(MESSAGE_TROP_DE_TENTATIVES);
  });

  it("depuis une autre IP, la même adresse peut encore se connecter (bonne réponse → redirection)", async () => {
    enteteIp = ipAlea();
    suivre("connexion", enteteIp, EMAIL_EXISTANT);
    const r = await tentative(EMAIL_EXISTANT, MOT_DE_PASSE);
    expect(r).toBeInstanceOf(Error);
    expect((r as Error).message).toBe("NEXT_REDIRECT /tableau-de-bord");
  });

  it("une réussite ne consomme aucune limite et remet le couple à zéro", async () => {
    const ip = enteteIp;
    const email = NOUVEL_EMAIL();
    const u = await db.utilisateur.create({ data: { nom: "Test Limite", email, emailVerified: true, role: "COLLABORATEUR" } });
    await db.compte.create({ data: { userId: u.id, accountId: u.id, providerId: "credential", password: await hashPassword(MOT_DE_PASSE) } });
    suivre("connexion", ip, email);
    for (let i = 0; i < 3; i++) await tentative(email, "mauvais-mot-de-passe");
    await tentative(email, MOT_DE_PASSE); // réussite
    const compteur = async (cle: string) => (await db.limiteDebit.findUnique({ where: { cle } }))?.compteur ?? 0;
    const k = clesLimites("connexion", ip, email);
    expect(await compteur(k.couple)).toBe(0); // remis à zéro
    expect(await compteur(k.ip)).toBe(3); // les échecs restent comptés pour l'IP
    expect(await compteur(k.adresse)).toBe(3);
  });
});

describe("action inscription", () => {
  it("les échecs (adresse déjà prise) sont comptés et finissent par être refusés, avec un message unique", async () => {
    const ip = enteteIp;
    suivre("inscription", ip, EMAIL_EXISTANT);
    const essai = () => inscription({}, formulaire({ nom: "Kofi Test", email: EMAIL_EXISTANT, password: MOT_DE_PASSE })).catch((e: Error) => e) as Promise<{ error?: string; fieldErrors?: Record<string, string> }>;
    for (let i = 0; i < LIMITES.couple.max; i++) expect((await essai()).fieldErrors?.email, `essai ${i + 1}`).toContain("existe déjà");
    expect((await essai()).error).toBe(MESSAGE_TROP_DE_TENTATIVES);
  });
});
