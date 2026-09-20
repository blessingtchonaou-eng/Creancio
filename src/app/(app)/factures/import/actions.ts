"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Analyse } from "@/lib/import/analyse";
import { lireFichier } from "@/lib/import/lecture";
import { analyserPourEntreprise, importerFactures, type ResultatImport } from "@/lib/import/serveur";
import { ErreurImport, LIGNES_MAX, TAILLE_FICHIER_MAX, type Lecture } from "@/lib/import/types";
import { requireEntreprise } from "@/lib/session";

/**
 * Trois actions : lire le fichier, revérifier les lignes après une correction, importer.
 * L'entreprise vient de la session. Les lignes envoyées par le navigateur ne sont que du texte : elles sont
 * validées ici (zod) puis ré-analysées avec les données réelles, jamais crues sur parole.
 */

export interface EtatAnalyse {
  error?: string;
  /** Change à chaque fichier lu : sert de clé pour repartir d'un aperçu neuf. */
  cle?: string;
  nomFichier?: string;
  lecture?: Lecture;
  analyse?: Analyse;
}

export async function analyserFichier(_prev: EtatAnalyse, formData: FormData): Promise<EtatAnalyse> {
  const { entrepriseId } = await requireEntreprise();

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { error: "Choisissez un fichier Excel (.xlsx) ou CSV (.csv)." };
  if (fichier.size > TAILLE_FICHIER_MAX) return { error: "Ce fichier dépasse 2 Mo. Divisez-le en plusieurs fichiers." };

  try {
    const lecture = await lireFichier(fichier.name, new Uint8Array(await fichier.arrayBuffer()));
    const analyse = await analyserPourEntreprise(entrepriseId, lecture.lignes, {});
    return { cle: randomUUID(), nomFichier: fichier.name, lecture, analyse };
  } catch (e) {
    if (e instanceof ErreurImport) return { error: e.message };
    console.error("Lecture du fichier d'import impossible", e);
    return { error: "Ce fichier n'a pas pu être lu. Réenregistrez-le depuis Excel puis réessayez." };
  }
}

const texte = (max: number) => z.string().max(max);
const ligneSchema = z.object({
  ligne: z.number().int().min(1).max(10_000_000),
  numero: texte(200),
  client: texte(300),
  telephone: texte(100),
  montant: texte(100),
  echeance: texte(100),
  email: texte(300),
});
const entreeSchema = z.object({
  lignes: z.array(ligneSchema).max(LIGNES_MAX),
  choix: z.record(z.string().max(400), z.string().max(100)),
});

export type ReponseAnalyse = { analyse: Analyse } | { error: string };
export type ReponseImport = { resultat: ResultatImport } | { error: string };

const ERREUR_ENVOI = "Les lignes n'ont pas pu être envoyées. Rechargez la page et recommencez.";

/** Revérifie les lignes après une correction : mêmes règles que la lecture, avec les données réelles de l'entreprise. */
export async function reanalyser(lignes: unknown, choix: unknown): Promise<ReponseAnalyse> {
  const { entrepriseId } = await requireEntreprise();
  const entree = entreeSchema.safeParse({ lignes, choix });
  if (!entree.success) return { error: ERREUR_ENVOI };
  return { analyse: await analyserPourEntreprise(entrepriseId, entree.data.lignes, entree.data.choix) };
}

/** Importe les lignes prêtes. Les lignes à corriger ne sont jamais importées. */
export async function importer(lignes: unknown, choix: unknown): Promise<ReponseImport> {
  const { entrepriseId } = await requireEntreprise();
  const entree = entreeSchema.safeParse({ lignes, choix });
  if (!entree.success) return { error: ERREUR_ENVOI };
  try {
    const resultat = await importerFactures(entrepriseId, entree.data.lignes, entree.data.choix);
    revalidatePath("/factures");
    revalidatePath("/clients");
    revalidatePath("/tableau-de-bord");
    return { resultat };
  } catch (e) {
    console.error("Import de factures impossible", e);
    return { error: "L'import a échoué et rien n'a été enregistré. Réessayez dans un instant." };
  }
}
