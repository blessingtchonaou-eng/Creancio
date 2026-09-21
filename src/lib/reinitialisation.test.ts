import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { preparerReinitialisation, preparerVerification } from "./auth-courriels";
import { db } from "./db";
import { MAX_LIENS_PAR_HEURE, autoriserLien, reserverEnvoiVerification } from "./reinitialisation";

const USER = "test-reinit-utilisateur";
const AUTRE = "test-reinit-autre";
const jeton = (n: number, u = USER) => `test-reinit-${u}-${n}`;

const nettoyer = () =>
  db.verification.deleteMany({ where: { OR: [{ identifier: { startsWith: "reset-password:test-reinit-" } }, { identifier: { startsWith: "limite-verification:test-reinit-" } }] } });
const creerJeton = (n: number, u = USER, creeLe = new Date()) =>
  db.verification.create({ data: { identifier: `reset-password:${jeton(n, u)}`, value: u, expiresAt: new Date(Date.now() + 3_600_000), createdAt: creeLe } });
const nbJetons = (u = USER) => db.verification.count({ where: { identifier: { startsWith: "reset-password:test-reinit-" }, value: u } });

beforeEach(async () => {
  await nettoyer();
});
afterAll(async () => {
  await nettoyer();
  await db.$disconnect();
});

describe("limite de liens de réinitialisation par adresse", () => {
  it("les 3 premiers liens de l'heure sont autorisés", async () => {
    for (let n = 1; n <= MAX_LIENS_PAR_HEURE; n++) {
      await creerJeton(n);
      expect(await autoriserLien(USER, jeton(n))).toBe(true);
    }
    expect(await nbJetons()).toBe(3);
  });

  it("le 4e est refusé ET son jeton est retiré : il ne reste que 3 jetons valables", async () => {
    for (let n = 1; n <= 3; n++) await creerJeton(n);
    await creerJeton(4);
    expect(await autoriserLien(USER, jeton(4))).toBe(false);
    expect(await nbJetons()).toBe(3);
    expect(await db.verification.count({ where: { identifier: `reset-password:${jeton(4)}` } })).toBe(0);
  });

  it("aucun e-mail n'est préparé au-delà de 3 (et un est préparé en dessous)", async () => {
    const user = { id: USER, name: "Kofi Agbo", email: "kofi@exemple.tg" };
    for (let n = 1; n <= 3; n++) {
      await creerJeton(n);
      expect(await preparerReinitialisation({ user, url: `https://x.tg/${n}`, token: jeton(n) })).toMatchObject({ a: "kofi@exemple.tg" });
    }
    await creerJeton(4);
    expect(await preparerReinitialisation({ user, url: "https://x.tg/4", token: jeton(4) })).toBeNull();
  });

  it("les jetons de plus d'une heure ne comptent plus", async () => {
    const ancien = new Date(Date.now() - 61 * 60_000);
    for (let n = 1; n <= 3; n++) await creerJeton(n, USER, ancien);
    await creerJeton(4);
    expect(await autoriserLien(USER, jeton(4))).toBe(true);
  });

  it("la limite est propre à chaque adresse", async () => {
    for (let n = 1; n <= 3; n++) await creerJeton(n);
    await creerJeton(1, AUTRE);
    expect(await autoriserLien(AUTRE, jeton(1, AUTRE))).toBe(true);
    expect(await nbJetons(USER)).toBe(3);
  });
});

describe("limite de mails de confirmation d'adresse", () => {
  it("3 par heure, puis refus", async () => {
    for (let i = 0; i < 3; i++) expect(await reserverEnvoiVerification("test-reinit-v")).toBe(true);
    expect(await reserverEnvoiVerification("test-reinit-v")).toBe(false);
    expect(await preparerVerification({ user: { id: "test-reinit-v", name: "A", email: "a@b.tg" }, url: "https://x.tg" })).toBeNull();
    expect(await reserverEnvoiVerification("test-reinit-v2")).toBe(true);
  });

  it("l'heure passée, le registre se libère", async () => {
    for (let i = 0; i < 3; i++) await reserverEnvoiVerification("test-reinit-v3", new Date(Date.now() - 2 * 3_600_000));
    expect(await reserverEnvoiVerification("test-reinit-v3")).toBe(true);
  });
});
