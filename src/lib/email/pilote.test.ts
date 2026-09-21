import { describe, expect, it } from "vitest";
import { choisirPilote, lireExpediteur } from "./pilote";

describe("choix du pilote d'envoi d'e-mails", () => {
  it("hors production, « console » par défaut", () => {
    expect(choisirPilote({ NODE_ENV: "development" })).toEqual({ pilote: "console", problemes: [] });
    expect(choisirPilote({ NODE_ENV: "test", EMAIL_DRIVER: "" })).toEqual({ pilote: "console", problemes: [] });
    expect(choisirPilote({ NODE_ENV: "development", EMAIL_DRIVER: "mailpit" })).toEqual({ pilote: "mailpit", problemes: [] });
  });

  it("hors production, un pilote réel est refusé même avec une clé : rien ne part pour de vrai", () => {
    for (const p of ["resend", "brevo"]) {
      const r = choisirPilote({ NODE_ENV: "development", EMAIL_DRIVER: p, RESEND_API_KEY: "re_cle", BREVO_API_KEY: "xkey", EMAIL_FROM: "Créancio <a@b.tg>" });
      expect(r.pilote).toBe("console");
      expect(r.problemes[0]).toContain("réservés à la production");
    }
    expect(choisirPilote({ NODE_ENV: "development", EMAIL_DRIVER: "inconnu" }).problemes[0]).toContain("inconnu");
  });

  it("en production, refuse : pilote vide, « console », « mailpit », inconnu", () => {
    for (const d of [undefined, "", "console", "mailpit", "sendgrid"]) {
      expect(choisirPilote({ NODE_ENV: "production", EMAIL_DRIVER: d, EMAIL_FROM: "Créancio <a@b.tg>" }).problemes.length, String(d)).toBeGreaterThan(0);
    }
  });

  it("en production, un pilote réel exige sa clé ET l'adresse d'expédition", () => {
    expect(choisirPilote({ NODE_ENV: "production", EMAIL_DRIVER: "resend", RESEND_API_KEY: "re_cle", EMAIL_FROM: "Créancio <a@b.tg>" })).toEqual({ pilote: "resend", problemes: [] });
    expect(choisirPilote({ NODE_ENV: "production", EMAIL_DRIVER: "resend", RESEND_API_KEY: "", EMAIL_FROM: "Créancio <a@b.tg>" }).problemes[0]).toContain("RESEND_API_KEY");
    expect(choisirPilote({ NODE_ENV: "production", EMAIL_DRIVER: "brevo", BREVO_API_KEY: "  ", EMAIL_FROM: "Créancio <a@b.tg>" }).problemes[0]).toContain("BREVO_API_KEY");
    expect(choisirPilote({ NODE_ENV: "production", EMAIL_DRIVER: "resend", RESEND_API_KEY: "re_cle" }).problemes[0]).toContain("EMAIL_FROM");
    // La clé d'un autre service ne compte pas
    expect(choisirPilote({ NODE_ENV: "production", EMAIL_DRIVER: "resend", BREVO_API_KEY: "xkey", EMAIL_FROM: "a@b.tg" }).problemes[0]).toContain("RESEND_API_KEY");
  });
});

describe("adresse d'expédition", () => {
  it("lit « Nom <adresse> », avec ou sans guillemets, ou une adresse seule", () => {
    expect(lireExpediteur("Créancio <ne-pas-repondre@creancio.tg>")).toEqual({ nom: "Créancio", email: "ne-pas-repondre@creancio.tg" });
    expect(lireExpediteur('"Créancio Togo" <a@b.tg>')).toEqual({ nom: "Créancio Togo", email: "a@b.tg" });
    expect(lireExpediteur("a@b.tg")).toEqual({ nom: "Créancio", email: "a@b.tg" });
    expect(lireExpediteur("pas une adresse")).toBeNull();
  });
});
