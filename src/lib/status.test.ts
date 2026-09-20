import { describe, expect, it } from "vitest";
import { aujourdhuiIso, dateDuJour, statutAffiche } from "./status";

describe("statutAffiche", () => {
  const AUJOURDHUI = "2026-09-20";

  it("une facture « À venir » dont l'échéance est passée s'affiche « Échue »", () => {
    expect(statutAffiche("A_VENIR", "2026-09-19", AUJOURDHUI)).toBe("ECHUE");
    expect(statutAffiche("A_VENIR", new Date("2026-01-01"), AUJOURDHUI)).toBe("ECHUE");
  });

  it("le jour de l'échéance, la facture est encore « À venir »", () => {
    expect(statutAffiche("A_VENIR", "2026-09-20", AUJOURDHUI)).toBe("A_VENIR");
    expect(statutAffiche("A_VENIR", "2026-09-21", AUJOURDHUI)).toBe("A_VENIR");
  });

  it("les autres statuts ne changent jamais, même échéance passée", () => {
    for (const s of ["ECHUE", "EN_RELANCE", "PARTIELLEMENT_PAYEE", "PAYEE", "SUSPENDUE", "ANNULEE"] as const) {
      expect(statutAffiche(s, "2020-01-01", AUJOURDHUI)).toBe(s);
    }
  });

  it("aujourdhuiIso donne le jour UTC (le Togo est à UTC+0), et dateDuJour revient à minuit UTC", () => {
    expect(aujourdhuiIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateDuJour("2026-09-20").toISOString()).toBe("2026-09-20T00:00:00.000Z");
  });
});
