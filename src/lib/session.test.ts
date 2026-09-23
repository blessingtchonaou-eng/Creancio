import { afterEach, describe, expect, it, vi } from "vitest";

type Utilisateur = { email: string; emailVerified: boolean; entrepriseId: string | null; role?: string };

// requireEntreprise() sans entreprise : l'administrateur de la plateforme part vers /admin/pilote, tous les autres vers /bienvenue.
async function requireEntrepriseAvec(user: Utilisateur, liste: string) {
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
  vi.doMock("@/lib/auth", () => ({ auth: { api: { getSession: async () => ({ user: { role: "ADMIN", ...user } }) } } }));
  const { requireEntreprise } = await import("./session");
  return requireEntreprise();
}

const LISTE = "moi@exemple.tg";

describe("requireEntreprise : utilisateur sans entreprise", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("administrateur de la plateforme (listé, adresse confirmée) : renvoyé vers /admin/pilote", async () => {
    await expect(requireEntrepriseAvec({ email: "moi@exemple.tg", emailVerified: true, entrepriseId: null }, LISTE)).rejects.toThrow("NEXT_REDIRECT /admin/pilote");
  });

  it("utilisateur ordinaire : renvoyé vers /bienvenue (comportement inchangé)", async () => {
    await expect(requireEntrepriseAvec({ email: "gerant@exemple.tg", emailVerified: true, entrepriseId: null }, LISTE)).rejects.toThrow("NEXT_REDIRECT /bienvenue");
  });

  it("adresse listée mais pas encore confirmée : pas administrateur, renvoyé vers /bienvenue", async () => {
    await expect(requireEntrepriseAvec({ email: "moi@exemple.tg", emailVerified: false, entrepriseId: null }, LISTE)).rejects.toThrow("NEXT_REDIRECT /bienvenue");
  });

  it("liste vide : personne n'est administrateur, renvoyé vers /bienvenue", async () => {
    await expect(requireEntrepriseAvec({ email: "moi@exemple.tg", emailVerified: true, entrepriseId: null }, "")).rejects.toThrow("NEXT_REDIRECT /bienvenue");
  });

  it("administrateur de la plateforme qui a une entreprise : accès normal à l'application", async () => {
    await expect(requireEntrepriseAvec({ email: "moi@exemple.tg", emailVerified: true, entrepriseId: "ent-1" }, LISTE)).resolves.toMatchObject({ entrepriseId: "ent-1" });
  });
});
