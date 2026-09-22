import { describe, expect, it, vi } from "vitest";
import { estAdminPlateforme, listeAdminsPlateforme } from "./admin-plateforme";
import { erreursConfiguration } from "./configuration";

describe("contrôles de démarrage", () => {
  it("développement : rien à signaler avec la configuration par défaut", () => {
    expect(erreursConfiguration({ NODE_ENV: "development" })).toEqual([]);
  });

  it("production sans clé d'envoi : démarrage refusé", () => {
    expect(erreursConfiguration({ NODE_ENV: "production", EMAIL_DRIVER: "resend" }).join(" ")).toContain("RESEND_API_KEY");
  });

  it("production complète : rien à signaler", () => {
    expect(erreursConfiguration({ NODE_ENV: "production", EMAIL_DRIVER: "resend", RESEND_API_KEY: "re_cle", EMAIL_FROM: "Créancio <a@b.tg>", CLIENT_IP_HEADER: "x-forwarded-for", TRUSTED_PROXY_COUNT: "1", ADMIN_PLATEFORME_EMAILS: "moi@exemple.tg, toi@exemple.tg" })).toEqual([]);
  });

  it("production sans configuration de l'IP du visiteur : démarrage refusé", () => {
    const base = { NODE_ENV: "production", EMAIL_DRIVER: "resend", RESEND_API_KEY: "re_cle", EMAIL_FROM: "Créancio <a@b.tg>" };
    const p = erreursConfiguration(base).join(" ");
    expect(p).toContain("CLIENT_IP_HEADER");
    expect(p).toContain("TRUSTED_PROXY_COUNT");
    expect(erreursConfiguration({ ...base, CLIENT_IP_HEADER: "x-forwarded-for", TRUSTED_PROXY_COUNT: "0" }).join(" ")).toContain("TRUSTED_PROXY_COUNT");
    expect(erreursConfiguration({ ...base, CLIENT_IP_HEADER: "x forwarded", TRUSTED_PROXY_COUNT: "1" }).join(" ")).toContain("CLIENT_IP_HEADER");
    expect(erreursConfiguration({ ...base, CLIENT_IP_HEADER: "x-real-ip", TRUSTED_PROXY_COUNT: "1" })).toEqual([]);
  });

  it("ADMIN_PLATEFORME_EMAILS : une entrée mal écrite est signalée (elle retirerait l'accès en silence)", () => {
    const p = erreursConfiguration({ NODE_ENV: "development", ADMIN_PLATEFORME_EMAILS: "moi@exemple.tg; toi@exemple.tg" });
    expect(p).toHaveLength(1);
    expect(p[0]).toContain("ADMIN_PLATEFORME_EMAILS");
    // Point-virgule sans espace : une seule entrée, invalide
    expect(erreursConfiguration({ NODE_ENV: "development", ADMIN_PLATEFORME_EMAILS: "moi@exemple.tg;toi@exemple.tg" })).toHaveLength(1);
    expect(erreursConfiguration({ NODE_ENV: "development", ADMIN_PLATEFORME_EMAILS: "moi@exemple" })).toHaveLength(1);
    expect(erreursConfiguration({ NODE_ENV: "development", ADMIN_PLATEFORME_EMAILS: "" })).toEqual([]); // vide = personne n'a accès, c'est sûr
  });
});

describe("administrateur de la plateforme", () => {
  const LISTE = "Moi@Exemple.tg , toi@exemple.tg,,";

  it("lit la liste sans tenir compte de la casse ni des espaces", () => {
    expect(listeAdminsPlateforme(LISTE)).toEqual({ adresses: ["moi@exemple.tg", "toi@exemple.tg"], invalides: [] });
  });

  it("exige l'adresse listée ET confirmée", () => {
    expect(estAdminPlateforme("moi@exemple.tg", true, LISTE)).toBe(true);
    expect(estAdminPlateforme("MOI@exemple.tg", true, LISTE)).toBe(true);
    expect(estAdminPlateforme("moi@exemple.tg", false, LISTE)).toBe(false); // non confirmée
    expect(estAdminPlateforme("intrus@exemple.tg", true, LISTE)).toBe(false); // non listée
    expect(estAdminPlateforme("moi@exemple.tg", true, "")).toBe(false); // liste vide
    expect(estAdminPlateforme("moi@exemple.tg", true, undefined)).toBe(false);
  });
});

describe("requireAdminPlateforme : non vérifié → 404", () => {
  async function avecSession(session: { user: { email: string; emailVerified: boolean } } | null, liste: string) {
    vi.resetModules();
    vi.stubEnv("ADMIN_PLATEFORME_EMAILS", liste);
    vi.doMock("server-only", () => ({}));
    vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
    vi.doMock("next/navigation", () => ({
      notFound: () => {
        throw new Error("NEXT_NOT_FOUND");
      },
      redirect: (url: string) => {
        throw new Error(`NEXT_REDIRECT ${url}`);
      },
    }));
    vi.doMock("@/lib/auth", () => ({ auth: { api: { getSession: async () => session } } }));
    const { requireAdminPlateforme } = await import("./session");
    return requireAdminPlateforme();
  }

  it("adresse listée mais non confirmée : page introuvable", async () => {
    await expect(avecSession({ user: { email: "moi@exemple.tg", emailVerified: false } }, "moi@exemple.tg")).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("adresse confirmée mais non listée : page introuvable", async () => {
    await expect(avecSession({ user: { email: "intrus@exemple.tg", emailVerified: true } }, "moi@exemple.tg")).rejects.toThrow("NEXT_NOT_FOUND");
  });
  it("adresse listée et confirmée : accès", async () => {
    await expect(avecSession({ user: { email: "moi@exemple.tg", emailVerified: true } }, "moi@exemple.tg")).resolves.toMatchObject({ email: "moi@exemple.tg" });
  });
  it("sans session : renvoi vers la connexion", async () => {
    await expect(avecSession(null, "moi@exemple.tg")).rejects.toThrow("NEXT_REDIRECT /connexion");
  });
});
