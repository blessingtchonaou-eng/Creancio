import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { avancerOnboarding, ETAPE_CLIENT, ETAPE_FACTURES, ETAPE_TERMINEE, urlEtape } from "./entreprise";
import { clientSchema } from "./validation/client";
import { entrepriseSchema } from "./validation/entreprise";

// Test d'intégration : nécessite la base de développement (docker compose up -d).
const IDS = ["test-avance-a", "test-avance-b"];

describe("avancerOnboarding", () => {
  beforeAll(async () => {
    await db.entreprise.deleteMany({ where: { id: { in: IDS } } });
    await db.entreprise.createMany({ data: IDS.map((id) => ({ id, raisonSociale: `Test ${id}` })) });
  });
  afterAll(async () => {
    await db.entreprise.deleteMany({ where: { id: { in: IDS } } });
    await db.$disconnect();
  });

  const etape = async (id: string) => (await db.entreprise.findUniqueOrThrow({ where: { id } })).etapeOnboarding;

  it("commence à l'étape 2 (premier client)", async () => {
    expect(await etape(IDS[0])).toBe(ETAPE_CLIENT);
  });

  it("avance sans jamais reculer", async () => {
    await avancerOnboarding(IDS[0], ETAPE_TERMINEE);
    await avancerOnboarding(IDS[0], ETAPE_FACTURES);
    expect(await etape(IDS[0])).toBe(ETAPE_TERMINEE);
  });

  it("ne touche pas à l'onboarding d'une autre entreprise", async () => {
    expect(await etape(IDS[1])).toBe(ETAPE_CLIENT);
  });

  it("renvoie chaque étape vers son écran", () => {
    expect(urlEtape(1)).toBe("/bienvenue");
    expect(urlEtape(ETAPE_CLIENT)).toBe("/bienvenue/clients");
    expect(urlEtape(ETAPE_FACTURES)).toBe("/bienvenue/factures");
    expect(urlEtape(ETAPE_TERMINEE)).toBe("/tableau-de-bord");
  });
});

describe("schémas de l'onboarding", () => {
  it("entreprise : NIF facultatif mais validé s'il est saisi", () => {
    const base = { raisonSociale: "Mensah SARL", telephone: "90 12 34 56" };
    expect(entrepriseSchema.safeParse({ ...base, nif: "" }).data?.nif).toBeNull();
    expect(entrepriseSchema.safeParse({ ...base, nif: "1001234567" }).data?.nif).toBe("1001234567");
    expect(entrepriseSchema.safeParse({ ...base, nif: "ABC" }).success).toBe(false);
  });

  it("client : numéro normalisé en E.164, e-mail facultatif", () => {
    const ok = clientSchema.safeParse({ nom: "Kofi Agbo", whatsapp: "90 12 34 56", email: "" });
    expect(ok.data).toEqual({ nom: "Kofi Agbo", whatsapp: "+22890123456", email: null });
    expect(clientSchema.safeParse({ nom: "K", whatsapp: "90123456", email: "" }).success).toBe(false);
    expect(clientSchema.safeParse({ nom: "Kofi", whatsapp: "12345", email: "" }).success).toBe(false);
    expect(clientSchema.safeParse({ nom: "Kofi", whatsapp: "90123456", email: "pas-un-mail" }).success).toBe(false);
  });
});
