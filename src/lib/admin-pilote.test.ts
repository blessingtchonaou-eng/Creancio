import { describe, expect, it } from "vitest";
import { celluleCsv, lireFiltre, versCsv } from "./admin-pilote";

type Ligne = Parameters<typeof versCsv>[0][number];
const ligne = (d: Partial<Ligne>): Ligne => ({
  id: "d1",
  nomEntreprise: "Boutique Test",
  nomContact: null,
  whatsapp: "+22890123456",
  ville: "Lomé",
  facturesParMois: null,
  consentement: true,
  consentementVersion: "v1-2026-09-23",
  consentementLe: new Date("2026-09-23T10:00:00Z"),
  statut: "NOUVELLE",
  note: null,
  createdAt: new Date("2026-09-22T09:00:00Z"),
  updatedAt: new Date("2026-09-22T09:00:00Z"),
  ...d,
});

describe("filtre de /admin/pilote", () => {
  it("statut connu : ce filtre ; absent ou inconnu : toutes sauf les suspectes (null)", () => {
    expect(lireFiltre("SUSPECTE")).toBe("SUSPECTE");
    expect(lireFiltre("NOUVELLE")).toBe("NOUVELLE");
    expect(lireFiltre(undefined)).toBeNull();
    expect(lireFiltre("suspecte")).toBeNull();
    expect(lireFiltre("' OR 1=1 --")).toBeNull();
  });
});

describe("export CSV des demandes", () => {
  it("cellule : entre guillemets, guillemets intérieurs doublés", () => {
    expect(celluleCsv('Dit "bonjour"; puis part')).toBe('"Dit ""bonjour""; puis part"');
    expect(celluleCsv(null)).toBe('""');
  });

  it("texte saisi commençant par = + - @ ou tabulation : neutralisé (apostrophe), jamais pris pour une formule", () => {
    for (const debut of ["=", "+", "-", "@", "\t"]) expect(celluleCsv(`${debut}cmd|' /C calc'!A0`, true)).toBe(`"'${debut}cmd|' /C calc'!A0"`);
    expect(celluleCsv("=pas saisi")).toBe('"=pas saisi"');
  });

  it("fichier : BOM UTF-8, séparateur « ; », fins de ligne CRLF, saut de ligne gardé dans la note, numéro sans « + »", () => {
    const csv = versCsv([ligne({ note: "Ligne 1\nLigne 2", nomEntreprise: "=HYPERLINK(\"http://x\")", facturesParMois: "DE_20_A_100", statut: "SUSPECTE" })]);
    expect(csv.startsWith("﻿")).toBe(true);
    const [entete, premiere] = csv.slice(1).split("\r\n");
    expect(entete.split(";")).toHaveLength(10);
    expect(premiere).toBe(
      '"22/09/2026";"\'=HYPERLINK(""http://x"")";"";"90 12 34 56";"Lomé";"20 à 100 factures/mois";"Suspecte";"Ligne 1\nLigne 2";"v1-2026-09-23";"23/09/2026"',
    );
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});
