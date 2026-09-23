import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { empreinte } from "@/lib/limite-debit";
import { palierPilote } from "./limite-pilote";

// Base réelle (creancio_dev), comme limites-auth.test.ts : une IP aléatoire par test, tout est nettoyé à la fin.
const ipAlea = () => `198.51.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
const cleCreees = new Set<string>();

afterAll(async () => {
  await db.limiteDebit.deleteMany({ where: { cle: { in: [...cleCreees] } } });
  await db.$disconnect();
});

async function nFois(ip: string, n: number) {
  cleCreees.add(`pilote:ip:${empreinte(ip)}`);
  let dernier: Awaited<ReturnType<typeof palierPilote>> = "normal";
  for (let i = 0; i < n; i++) dernier = await palierPilote(ip);
  return dernier;
}

describe("limite du formulaire pilote, par IP, à trois paliers", () => {
  it("jusqu'à 20 envois par heure : normal", async () => {
    const ip = ipAlea();
    expect(await nFois(ip, 20)).toBe("normal");
  });

  it("de 21 à 100 : suspect", async () => {
    const ip = ipAlea();
    expect(await nFois(ip, 21)).toBe("suspect");
    expect(await nFois(ip, 79)).toBe("suspect"); // 21 + 79 = 100
  });

  it("au-delà de 100 : bloqué", async () => {
    const ip = ipAlea();
    expect(await nFois(ip, 101)).toBe("bloque");
  });

  it("des IP différentes ont des compteurs séparés", async () => {
    const a = ipAlea();
    const b = ipAlea();
    expect(await nFois(a, 101)).toBe("bloque");
    expect(await nFois(b, 1)).toBe("normal");
  });

  it("sans IP lisible, un compteur commun « ip-inconnue » (pas d'absence de limite)", async () => {
    cleCreees.add(`pilote:ip:${empreinte("ip-inconnue")}`);
    const a = await palierPilote(null);
    expect(["normal", "suspect", "bloque"]).toContain(a);
  });
});
