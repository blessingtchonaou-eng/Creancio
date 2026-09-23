import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

// Action réelle et vraie base ; seul le contrôle d'accès est simulé (il est testé à part : configuration.test.ts, tests HTTP).
let estAdmin = true;
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/lib/session", () => ({
  requireAdminPlateforme: async () => {
    if (!estAdmin) throw new Error("NEXT_NOT_FOUND");
    return { id: "admin-test" };
  },
}));

const { mettreAJourDemandeAction } = await import("./actions");
const DEMANDE = "test-admin-action-demande";
const formulaire = (statut: string, note: string) => {
  const f = new FormData();
  f.set("statut", statut);
  f.set("note", note);
  return f;
};

beforeEach(async () => {
  estAdmin = true;
  await db.demandePilote.deleteMany({ where: { id: DEMANDE } });
  await db.demandePilote.create({ data: { id: DEMANDE, nomEntreprise: "Boutique Test", whatsapp: "+22890000077", consentement: true } });
});
afterAll(async () => {
  await db.demandePilote.deleteMany({ where: { id: DEMANDE } });
  await db.$disconnect();
});

describe("mise à jour d'une demande (statut et note)", () => {
  it("un non-administrateur est refusé et rien ne change", async () => {
    estAdmin = false;
    await expect(mettreAJourDemandeAction(DEMANDE, {}, formulaire("INSCRITE", "piraté"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(await db.demandePilote.findUnique({ where: { id: DEMANDE } })).toMatchObject({ statut: "NOUVELLE", note: null });
  });

  it("statut et note enregistrés ; texte hostile gardé tel quel (il sera affiché échappé)", async () => {
    const note = `<script>alert("x")</script>\nRappeler "lundi" & =cmd`;
    expect(await mettreAJourDemandeAction(DEMANDE, {}, formulaire("SUSPECTE", note))).toEqual({ success: "Demande mise à jour." });
    expect(await db.demandePilote.findUnique({ where: { id: DEMANDE } })).toMatchObject({ statut: "SUSPECTE", note });
  });

  it("note de plus de 500 caractères ou statut inconnu : refusés, rien ne change", async () => {
    const r = await mettreAJourDemandeAction(DEMANDE, {}, formulaire("PIRATE", "x".repeat(501)));
    expect(r.fieldErrors).toEqual({ statut: "Choisissez un statut dans la liste.", note: "La note ne peut pas dépasser 500 caractères." });
    expect((await db.demandePilote.findUnique({ where: { id: DEMANDE } }))?.statut).toBe("NOUVELLE");
  });

  it("note vide : effacée ; demande inconnue : introuvable", async () => {
    await mettreAJourDemandeAction(DEMANDE, {}, formulaire("CONTACTEE", "à effacer"));
    await mettreAJourDemandeAction(DEMANDE, {}, formulaire("CONTACTEE", "   "));
    expect((await db.demandePilote.findUnique({ where: { id: DEMANDE } }))?.note).toBeNull();
    await expect(mettreAJourDemandeAction("inconnue", {}, formulaire("CONTACTEE", ""))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
