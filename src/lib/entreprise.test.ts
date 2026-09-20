import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { creerEntrepriseEtRattacher } from "./entreprise";

// Test d'intégration : nécessite la base de développement (docker compose up -d).
const EMAIL = ["test-rattachement-a@example.com", "test-rattachement-b@example.com"];
const donnees = (nom: string) => ({ raisonSociale: nom, nif: null, telephone: "+22890123456" });

async function nettoyer() {
  const users = await db.utilisateur.findMany({ where: { email: { in: EMAIL } }, select: { entrepriseId: true } });
  await db.utilisateur.deleteMany({ where: { email: { in: EMAIL } } });
  await db.entreprise.deleteMany({ where: { id: { in: users.map((u) => u.entrepriseId).filter((x): x is string => !!x) } } });
  await db.entreprise.deleteMany({ where: { raisonSociale: { startsWith: "Test rattachement" } } });
}

describe("creerEntrepriseEtRattacher", () => {
  beforeAll(nettoyer);
  afterAll(async () => {
    await nettoyer();
    await db.$disconnect();
  });

  it("crée l'entreprise et fait de l'utilisateur son ADMIN", async () => {
    const u = await db.utilisateur.create({ data: { nom: "A", email: EMAIL[0] } });
    expect(u.role).toBe("COLLABORATEUR");
    expect(u.entrepriseId).toBeNull();

    expect(await creerEntrepriseEtRattacher(u.id, donnees("Test rattachement A"))).toBe(true);

    const apres = await db.utilisateur.findUniqueOrThrow({ where: { id: u.id }, include: { entreprise: true } });
    expect(apres.role).toBe("ADMIN");
    expect(apres.entreprise?.raisonSociale).toBe("Test rattachement A");
  });

  it("refuse un second rattachement et ne crée aucune entreprise en plus", async () => {
    const u = await db.utilisateur.findUniqueOrThrow({ where: { email: EMAIL[0] } });
    const avant = await db.entreprise.count();

    expect(await creerEntrepriseEtRattacher(u.id, donnees("Test rattachement A bis"))).toBe(false);

    expect(await db.entreprise.count()).toBe(avant);
    const apres = await db.utilisateur.findUniqueOrThrow({ where: { id: u.id } });
    expect(apres.entrepriseId).toBe(u.entrepriseId);
  });

  it("deux envois simultanés ne créent qu'une seule entreprise", async () => {
    const u = await db.utilisateur.create({ data: { nom: "B", email: EMAIL[1] } });
    const avant = await db.entreprise.count();

    const r = await Promise.all([
      creerEntrepriseEtRattacher(u.id, donnees("Test rattachement B1")),
      creerEntrepriseEtRattacher(u.id, donnees("Test rattachement B2")),
    ]);

    expect(r.filter(Boolean)).toHaveLength(1);
    expect(await db.entreprise.count()).toBe(avant + 1);
  });

  it("ne touche pas au rôle ni à l'entreprise des autres utilisateurs", async () => {
    const admin = await db.utilisateur.findUniqueOrThrow({ where: { email: "demo@creancio.tg" } });
    expect(admin.entrepriseId).toBe("demo-entreprise");
    expect(await creerEntrepriseEtRattacher(admin.id, donnees("Test rattachement C"))).toBe(false);
    expect((await db.utilisateur.findUniqueOrThrow({ where: { id: admin.id } })).entrepriseId).toBe("demo-entreprise");
  });
});
