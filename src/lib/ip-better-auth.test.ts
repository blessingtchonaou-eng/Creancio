import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Preuve du problème : en production, derrière un proxy inverse, l'en-tête x-forwarded-for contient plusieurs adresses
// (« client, proxy »). Better Auth, sans configuration, ne sait alors pas lire l'IP (résultat null) et met TOUS les visiteurs
// dans le même compartiment de limite (clé « no-trusted-ip » : node_modules/better-auth/dist/api/rate-limiter/index.mjs).
// En développement, il se rabat sur 127.0.0.1 : le problème ne se voit donc jamais sur un poste de travail.
// Better Auth lit NODE_ENV une seule fois, à son chargement : on l'interroge dans un processus Node séparé.
function getIpEn(env: "production" | "development", entetes: Record<string, string>): string | null {
  const script = `
    const { getIP } = await import("@better-auth/core/utils/ip");
    console.log(JSON.stringify(getIP(new Headers(${JSON.stringify(entetes)}), {})));
  `;
  const sortie = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { ...process.env, NODE_ENV: env, TEST: "" },
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return JSON.parse(sortie.trim().split("\n").pop()!);
}

describe("lecture de l'IP par Better Auth, sans configuration", () => {
  it("production, x-forwarded-for à plusieurs adresses : IP illisible (null)", () => {
    expect(getIpEn("production", { "x-forwarded-for": "203.0.113.7, 10.0.0.1" })).toBeNull();
    expect(getIpEn("production", { "x-forwarded-for": "203.0.113.7,10.0.0.1,10.0.0.2" })).toBeNull();
  });

  it("production, aucun en-tête : IP illisible (null)", () => {
    expect(getIpEn("production", {})).toBeNull();
  });

  it("production, une seule adresse : lue normalement", () => {
    expect(getIpEn("production", { "x-forwarded-for": "203.0.113.7" })).toBe("203.0.113.7");
  });

  it("développement : repli sur 127.0.0.1, ce qui masque le problème", () => {
    expect(getIpEn("development", { "x-forwarded-for": "203.0.113.7, 10.0.0.1" })).toBe("127.0.0.1");
    expect(getIpEn("development", {})).toBe("127.0.0.1");
  });

  it("deux visiteurs différents derrière le même proxy obtiennent la même clé de limite (compartiment commun)", () => {
    const a = getIpEn("production", { "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    const b = getIpEn("production", { "x-forwarded-for": "198.51.100.9, 10.0.0.1" });
    expect(a ?? "no-trusted-ip").toBe(b ?? "no-trusted-ip");
    expect(a).toBeNull();
  });
});
