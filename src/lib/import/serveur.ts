import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { analyserLignes, espaces, cleClient, jourDuJour, statutSelonEcheance, type Analyse, type Choix, type ContexteAnalyse } from "./analyse";
import type { LigneBrute } from "./types";

/**
 * Accès base de données de l'import. Chaque fonction reçoit l'entrepriseId de la session et l'applique à toutes
 * ses requêtes : les factures et les clients d'une autre entreprise n'entrent jamais dans l'analyse.
 */

/** Factures déjà enregistrées pour les numéros du fichier, et clients de l'entreprise. */
export async function chargerContexte(entrepriseId: string, brutes: readonly LigneBrute[]): Promise<ContexteAnalyse> {
  const numeros = [...new Set(brutes.map((b) => espaces(b.numero)).filter((n) => n !== ""))];
  const [existantes, clients] = await Promise.all([
    db.facture.findMany({ where: { entrepriseId, numero: { in: numeros } }, select: { numero: true } }),
    db.client.findMany({ where: { entrepriseId }, select: { id: true, nom: true, whatsapp: true }, orderBy: [{ nom: "asc" }, { id: "asc" }] }),
  ]);
  return { numerosExistants: new Set(existantes.map((f) => f.numero)), clients };
}

export async function analyserPourEntreprise(entrepriseId: string, brutes: readonly LigneBrute[], choix: Choix): Promise<Analyse> {
  return analyserLignes(brutes, await chargerContexte(entrepriseId, brutes), choix);
}

export interface ResultatImport {
  importees: number;
  /** Lignes non importées parce qu'elles sont en erreur ou que leur client reste à choisir. */
  aCorriger: number;
  dejaImportees: number;
  clientsCrees: number;
}

/**
 * Importe les lignes prêtes, et seulement elles. L'analyse est refaite ici avec les données réelles : rien de ce qui vient
 * du navigateur (statuts, clients retenus) n'est cru. Rejouable : un numéro déjà enregistré est ignoré, jamais dupliqué.
 */
export async function importerFactures(entrepriseId: string, brutes: readonly LigneBrute[], choix: Choix): Promise<ResultatImport> {
  const { lignes, comptes } = await analyserPourEntreprise(entrepriseId, brutes, choix);
  const pretes = lignes.filter((l) => l.statut === "prete");
  const resultat: ResultatImport = { importees: 0, aCorriger: comptes.aCorriger, dejaImportees: comptes.dejaImportees, clientsCrees: 0 };
  if (pretes.length === 0) return resultat;

  const aujourd = jourDuJour();
  return db.$transaction(
    async (tx) => {
      // Un client à créer par couple (numéro, nom) : dix factures de « Kofi Agbo » ne créent qu'un client.
      const nouveaux = new Map<string, { id: string; entrepriseId: string; nom: string; whatsapp: string; email: string | null }>();
      for (const l of pretes) {
        if (l.client?.type !== "nouveau") continue;
        const cle = cleClient(l.client.nom, l.client.whatsapp);
        const existant = nouveaux.get(cle);
        if (existant) existant.email ??= l.client.email;
        else nouveaux.set(cle, { id: randomUUID(), entrepriseId, nom: l.client.nom, whatsapp: l.client.whatsapp, email: l.client.email });
      }
      if (nouveaux.size > 0) await tx.client.createMany({ data: [...nouveaux.values()] });

      const factures = pretes.map((l) => {
        const client = l.client!;
        const clientId = client.type === "existant" ? client.id : nouveaux.get(cleClient(client.nom, client.whatsapp))!.id;
        return {
          entrepriseId,
          clientId,
          numero: l.numero!,
          montant: l.montant!,
          dateFacture: new Date(`${l.dateFacture!}T00:00:00.000Z`),
          dateFactureEstimee: l.dateFactureParDefaut === true,
          echeance: new Date(`${l.echeance!}T00:00:00.000Z`),
          statut: statutSelonEcheance(l.echeance!, aujourd),
        };
      });
      // skipDuplicates : si une autre importation a enregistré un numéro entre-temps, il est ignoré (contrainte d'unicité).
      const { count } = await tx.facture.createMany({ data: factures, skipDuplicates: true });
      return { ...resultat, importees: count, dejaImportees: resultat.dejaImportees + (factures.length - count), clientsCrees: nouveaux.size };
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}
