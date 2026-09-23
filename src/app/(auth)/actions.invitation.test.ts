import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { creerInvitation } from "@/lib/invitation-pilote";

// Inscription publique fermée pendant le pilote (INSCRIPTIONS_OUVERTES absent = fermé) : un jeton d'invitation valide,
// non expiré et pas encore utilisé est obligatoire. Vraie base et vrai Better Auth, comme actions.limites.test.ts.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
let enteteIp = "203.0.113.20";
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

const ADMIN = "test-invitation-action-admin";
const formulaire = (champs: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
};
const ipAlea = () => `203.1.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
const nouvelleDemande = () => ({ id: `test-inv-action-${randomBytes(4).toString("hex")}`, whatsapp: `+228${90000000 + Math.floor(Math.random() * 9999999)}` });
const inscriptionTest = (champs: Record<string, string>) => inscription({}, formulaire(champs)).catch((e: Error) => e) as Promise<{ error?: string; fieldErrors?: Record<string, string> }>;

let inscription: typeof import("./actions").inscription;
const demandesCreees = new Set<string>();
const emailsCrees = new Set<string>();

beforeAll(async () => {
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("INSCRIPTIONS_OUVERTES", "false");
  ({ inscription } = await import("./actions"));
  await db.utilisateur.create({ data: { id: ADMIN, nom: "Admin Test", email: `admin-invitation-action-${randomBytes(4).toString("hex")}@example.com`, role: "ADMIN" } });
});
beforeEach(() => {
  enteteIp = ipAlea();
});
afterAll(async () => {
  await db.invitationPilote.deleteMany({ where: { demandePiloteId: { in: [...demandesCreees] } } });
  await db.demandePilote.deleteMany({ where: { id: { in: [...demandesCreees] } } });
  await db.verification.deleteMany({ where: { identifier: { in: [...emailsCrees] } } });
  await db.utilisateur.deleteMany({ where: { email: { in: [...emailsCrees] } } });
  await db.utilisateur.deleteMany({ where: { id: ADMIN } });
  await db.$disconnect();
});

async function demande() {
  const d = nouvelleDemande();
  demandesCreees.add(d.id);
  await db.demandePilote.create({ data: { id: d.id, nomEntreprise: "PME Test", whatsapp: d.whatsapp, consentement: true } });
  return d.id;
}

function email() {
  const e = `test-invitation-action-${randomBytes(4).toString("hex")}@example.com`;
  emailsCrees.add(e);
  return e;
}

describe("inscription fermée pendant le pilote", () => {
  it("sans jeton : refusée, aucun compte créé", async () => {
    const e = email();
    const r = await inscriptionTest({ nom: "Kofi Test", email: e, password: "creancio-test-2026" });
    expect(r.error).toContain("invitation");
    expect(await db.utilisateur.findUnique({ where: { email: e } })).toBeNull();
  });

  it("jeton inconnu : refusée, même message", async () => {
    const e = email();
    const r = await inscriptionTest({ nom: "Kofi Test", email: e, password: "creancio-test-2026", invitation: "jeton-invente" });
    expect(r.error).toContain("invitation");
    expect(await db.utilisateur.findUnique({ where: { email: e } })).toBeNull();
  });

  it("jeton expiré : refusée", async () => {
    const demandeId = await demande();
    const c = await creerInvitation(demandeId, ADMIN);
    if (!c.ok) throw new Error("préparation impossible");
    await db.invitationPilote.updateMany({ where: { demandePiloteId: demandeId }, data: { expireLe: new Date(Date.now() - 1000) } });
    const e = email();
    const r = await inscriptionTest({ nom: "Kofi Test", email: e, password: "creancio-test-2026", invitation: c.jeton });
    expect(r.error).toContain("invitation");
    expect(await db.utilisateur.findUnique({ where: { email: e } })).toBeNull();
  });

  it("jeton valide : compte créé, jeton consommé, demande passée à INSCRITE", async () => {
    const demandeId = await demande();
    const c = await creerInvitation(demandeId, ADMIN);
    if (!c.ok) throw new Error("préparation impossible");
    const e = email();
    const r = await inscriptionTest({ nom: "Kofi Test", email: e, password: "creancio-test-2026", invitation: c.jeton });
    expect((r as unknown as Error).message).toBe("NEXT_REDIRECT /bienvenue");

    const utilisateur = await db.utilisateur.findUnique({ where: { email: e } });
    expect(utilisateur).not.toBeNull();
    const invitation = await db.invitationPilote.findFirst({ where: { demandePiloteId: demandeId } });
    expect(invitation?.utiliseParId).toBe(utilisateur!.id);
    expect(invitation?.utiliseLe).not.toBeNull();
    const demandeApres = await db.demandePilote.findUnique({ where: { id: demandeId } });
    expect(demandeApres?.statut).toBe("INSCRITE");
  });

  it("jeton déjà utilisé : refusé au second essai", async () => {
    const demandeId = await demande();
    const c = await creerInvitation(demandeId, ADMIN);
    if (!c.ok) throw new Error("préparation impossible");
    await inscriptionTest({ nom: "Kofi Test", email: email(), password: "creancio-test-2026", invitation: c.jeton });
    const e2 = email();
    const r2 = await inscriptionTest({ nom: "Kofi Test", email: e2, password: "creancio-test-2026", invitation: c.jeton });
    expect(r2.error).toContain("invitation");
    expect(await db.utilisateur.findUnique({ where: { email: e2 } })).toBeNull();
  });

  it("deux soumissions simultanées du même jeton : un seul compte créé", async () => {
    const demandeId = await demande();
    const c = await creerInvitation(demandeId, ADMIN);
    if (!c.ok) throw new Error("préparation impossible");
    const e1 = email();
    const e2 = email();
    const [r1, r2] = await Promise.all([
      inscriptionTest({ nom: "Kofi Test", email: e1, password: "creancio-test-2026", invitation: c.jeton }),
      inscriptionTest({ nom: "Ama Test", email: e2, password: "creancio-test-2026", invitation: c.jeton }),
    ]);
    const resultats = [r1, r2];
    const reussites = resultats.filter((r) => (r as unknown as Error).message === "NEXT_REDIRECT /bienvenue");
    const echecs = resultats.filter((r) => (r as { error?: string }).error?.includes("invitation"));
    expect(reussites).toHaveLength(1);
    expect(echecs).toHaveLength(1);
  });

  it("e-mail déjà pris après réservation : le jeton est libéré, un nouvel essai marche", async () => {
    const demandeId = await demande();
    const c = await creerInvitation(demandeId, ADMIN);
    if (!c.ok) throw new Error("préparation impossible");
    const existant = email();
    await db.utilisateur.create({ data: { nom: "Déjà là", email: existant, emailVerified: true } });

    const echoue = await inscriptionTest({ nom: "Kofi Test", email: existant, password: "creancio-test-2026", invitation: c.jeton });
    expect(echoue.fieldErrors?.email).toContain("existe déjà");

    // Le jeton n'a pas été consommé par cet échec : une nouvelle adresse peut encore s'en servir.
    const nouvelle = email();
    const reussi = await inscriptionTest({ nom: "Kofi Test", email: nouvelle, password: "creancio-test-2026", invitation: c.jeton });
    expect((reussi as unknown as Error).message).toBe("NEXT_REDIRECT /bienvenue");
  });
});
