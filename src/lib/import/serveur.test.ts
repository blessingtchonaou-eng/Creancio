import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { NOUVEAU_CLIENT } from "./analyse";
import { analyserPourEntreprise, importerFactures } from "./serveur";
import type { LigneBrute } from "./types";

// Test d'intégration : nécessite la base de développement (docker compose up -d).
const A = "test-import-a";
const B = "test-import-b";

const ligne = (n: number, surcharge: Partial<LigneBrute> = {}): LigneBrute => ({
  ligne: n,
  numero: `FA-T-${String(n).padStart(4, "0")}`,
  client: `Client ${n % 50}`,
  telephone: `9000${String(n % 50).padStart(4, "0")}`,
  montant: "150 000",
  dateFacture: "",
  echeance: "25/10/2099",
  email: "",
  ...surcharge,
});

async function nettoyer() {
  await db.entreprise.deleteMany({ where: { id: { in: [A, B] } } });
}

describe("importerFactures", () => {
  beforeAll(async () => {
    await nettoyer();
    await db.entreprise.createMany({ data: [A, B].map((id) => ({ id, raisonSociale: `Test ${id}`, etapeOnboarding: 4 })) });
  });
  afterAll(async () => {
    await nettoyer();
    await db.$disconnect();
  });

  it("importe 500 lignes en moins de 30 secondes, un client par couple nom/numéro", async () => {
    const fichier = Array.from({ length: 500 }, (_, i) => ligne(i + 1));
    const debut = Date.now();
    const r = await importerFactures(A, fichier, {});
    const duree = Date.now() - debut;
    expect(r).toEqual({ importees: 500, aCorriger: 0, dejaImportees: 0, clientsCrees: 50 });
    expect(duree).toBeLessThan(30_000);
    expect(await db.facture.count({ where: { entrepriseId: A } })).toBe(500);
    expect(await db.client.count({ where: { entrepriseId: A } })).toBe(50);
  });

  it("est rejouable : le même fichier ne crée ni facture ni client en double", async () => {
    const fichier = Array.from({ length: 500 }, (_, i) => ligne(i + 1));
    const r = await importerFactures(A, fichier, {});
    expect(r).toEqual({ importees: 0, aCorriger: 0, dejaImportees: 500, clientsCrees: 0 });
    expect(await db.facture.count({ where: { entrepriseId: A } })).toBe(500);
    expect(await db.client.count({ where: { entrepriseId: A } })).toBe(50);
  });

  it("n'importe jamais une ligne en erreur, et importe les autres", async () => {
    const fichier = [
      ligne(1001),
      ligne(1002, { montant: "12,5" }),
      ligne(1003, { echeance: "31/02/2026" }),
      ligne(1004, { telephone: "12345" }),
      ligne(1005, { numero: "" }),
      ligne(1006, { numero: "FA-T-1001" }), // numéro répété dans le fichier
    ];
    const r = await importerFactures(A, fichier, {});
    expect(r).toMatchObject({ importees: 1, aCorriger: 5, dejaImportees: 0 });
    const numeros = (await db.facture.findMany({ where: { entrepriseId: A, numero: { in: ["FA-T-1001", "FA-T-1002", "FA-T-1003", "FA-T-1004", "FA-T-1006"] } } })).map((f) => f.numero);
    expect(numeros).toEqual(["FA-T-1001"]);
  });

  it("donne le statut selon l'échéance : échue si elle est passée, à venir sinon", async () => {
    await importerFactures(A, [ligne(2001, { echeance: "01/01/2020" }), ligne(2002, { echeance: "01/01/2099" })], {});
    const statuts = Object.fromEntries((await db.facture.findMany({ where: { entrepriseId: A, numero: { in: ["FA-T-2001", "FA-T-2002"] } } })).map((f) => [f.numero, f.statut]));
    expect(statuts).toEqual({ "FA-T-2001": "ECHUE", "FA-T-2002": "A_VENIR" });
  });

  it("enregistre la date de facture fournie, ou le jour de l'import quand elle est vide", async () => {
    await importerFactures(A, [ligne(2101, { dateFacture: "01/09/2026", echeance: "01/10/2026" }), ligne(2102, { echeance: "01/10/2026" })], {});
    const trouvees = await db.facture.findMany({ where: { entrepriseId: A, numero: { in: ["FA-T-2101", "FA-T-2102"] } } });
    const par = Object.fromEntries(trouvees.map((f) => [f.numero, f.dateFacture.toISOString().slice(0, 10)]));
    expect(par["FA-T-2101"]).toBe("2026-09-01");
    expect(par["FA-T-2102"]).toBe(new Date().toISOString().slice(0, 10));
  });

  it("marque la date de facture comme estimée quand elle manque (exclue du délai moyen de paiement)", async () => {
    await importerFactures(A, [ligne(2201, { dateFacture: "01/09/2026", echeance: "01/10/2026" }), ligne(2202, { echeance: "01/10/2026" })], {});
    const trouvees = await db.facture.findMany({ where: { entrepriseId: A, numero: { in: ["FA-T-2201", "FA-T-2202"] } } });
    const estimee = Object.fromEntries(trouvees.map((f) => [f.numero, f.dateFactureEstimee]));
    expect(estimee).toEqual({ "FA-T-2201": false, "FA-T-2202": true });
  });

  it("ISOLATION : le même numéro de facture est libre dans une autre entreprise, et ses clients restent les siens", async () => {
    const r = await importerFactures(B, [ligne(1, { client: "Client 1" })], {});
    expect(r).toMatchObject({ importees: 1, dejaImportees: 0, clientsCrees: 1 });
    const analyse = await analyserPourEntreprise(B, [ligne(2)], {});
    expect(analyse.lignes[0].statut).toBe("prete"); // FA-T-0002 existe chez A, pas chez B
    const clientsB = await db.client.findMany({ where: { entrepriseId: B } });
    expect(clientsB).toHaveLength(1);
  });

  it("ISOLATION : un client d'une autre entreprise ne peut pas être choisi", async () => {
    const clientA = await db.client.findFirstOrThrow({ where: { entrepriseId: A, nom: "Client 7" } });
    // Chez B, « Client 7 » avec un autre numéro serait ambigu s'il existait ; ici on force un choix avec l'identifiant d'un client de A.
    await db.client.create({ data: { entrepriseId: B, nom: "Client 7", whatsapp: "+22870000007" } });
    const brute = ligne(3001, { client: "Client 7", telephone: "70000008" });
    const sansChoix = await analyserPourEntreprise(B, [brute], {});
    expect(sansChoix.lignes[0].statut).toBe("a_choisir");
    const cle = sansChoix.lignes[0].cleClient!;
    const choixEtranger = await analyserPourEntreprise(B, [brute], { [cle]: clientA.id });
    expect(choixEtranger.lignes[0].statut).toBe("a_choisir");
    const r = await importerFactures(B, [brute], { [cle]: clientA.id });
    expect(r).toMatchObject({ importees: 0, aCorriger: 1 });
    expect(await db.facture.count({ where: { entrepriseId: B, clientId: clientA.id } })).toBe(0);
  });

  it("client à choisir : l'import applique le choix (client existant ou nouveau client)", async () => {
    const existant = await db.client.findFirstOrThrow({ where: { entrepriseId: B, nom: "Client 7" } });
    const brute = (n: number) => ligne(n, { client: "Client 7", telephone: "70000008" });
    const cle = (await analyserPourEntreprise(B, [brute(3101)], {})).lignes[0].cleClient!;

    expect(await importerFactures(B, [brute(3101)], { [cle]: existant.id })).toMatchObject({ importees: 1, clientsCrees: 0 });
    expect(await db.facture.count({ where: { entrepriseId: B, clientId: existant.id, numero: "FA-T-3101" } })).toBe(1);

    expect(await importerFactures(B, [brute(3102)], { [cle]: NOUVEAU_CLIENT })).toMatchObject({ importees: 1, clientsCrees: 1 });
    const nouveau = await db.facture.findFirstOrThrow({ where: { entrepriseId: B, numero: "FA-T-3102" }, include: { client: true } });
    expect(nouveau.client.id).not.toBe(existant.id);
    expect(nouveau.client.whatsapp).toBe("+22870000008");
  });

  it("l'import n'écrit pas la valeur envoyée par le navigateur : les montants viennent de l'analyse", async () => {
    await importerFactures(A, [ligne(4001, { montant: "1 250 000 FCFA", echeance: "05-11-2099" })], {});
    const f = await db.facture.findFirstOrThrow({ where: { entrepriseId: A, numero: "FA-T-4001" } });
    expect(f.montant).toBe(1_250_000);
    expect(f.montantPaye).toBe(0);
    expect(f.echeance.toISOString().slice(0, 10)).toBe("2099-11-05");
  });
});
