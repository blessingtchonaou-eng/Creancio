"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  annulerFacture,
  annulerPaiement,
  enregistrerPaiement,
  modifierFacture,
  reprendreRelances,
  suspendreRelances,
  type Contexte,
  type ResultatAction,
} from "@/lib/factures-fiche";
import { fieldErrorsFrom, stringValues, type FormState } from "@/lib/form-state";
import type { CleMessage } from "@/lib/messages-fiche";
import { requireEntreprise } from "@/lib/session";

/**
 * Actions de la fiche d'une facture. L'entreprise, l'utilisateur et son rôle viennent de la session, jamais du formulaire.
 * Les fonctions de `factures-fiche.ts` refusent d'elles-mêmes ce qui est interdit : ici, on traduit leur réponse pour l'écran.
 */

const texte = (max: number) => z.string().max(max);

function actualiser(id: string) {
  revalidatePath("/factures");
  revalidatePath(`/factures/${id}`);
  revalidatePath("/clients");
  revalidatePath("/tableau-de-bord");
}

const retour = (id: string, message: CleMessage) => redirect(`/factures/${id}?message=${message}`);

async function contexte(): Promise<Contexte> {
  const { user, entrepriseId, role } = await requireEntreprise();
  return { entrepriseId, utilisateurId: user.id, role };
}

/** Traduit la réponse d'une action simple : page introuvable, refus lisible, ou retour à la fiche. */
function conclure(id: string, r: ResultatAction, message: CleMessage, interdit: string): FormState {
  if (r.ok) {
    actualiser(id);
    return retour(id, message);
  }
  if ("introuvable" in r) notFound();
  if ("interdit" in r) return { error: interdit };
  return r.champ ? { fieldErrors: { [r.champ]: r.erreur } } : { error: r.erreur };
}

// --- Paiement reçu à la main ---------------------------------------------------------------------------------------

const paiementSchema = z.object({
  cle: texte(100),
  montant: texte(100),
  date: texte(20),
  operateur: texte(30),
  reference: texte(300),
});

export async function enregistrerPaiementAction(factureId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { entrepriseId } = await requireEntreprise();
  const values = stringValues(formData);
  const parsed = paiementSchema.safeParse({ cle: values.cle ?? "", montant: values.montant ?? "", date: values.date ?? "", operateur: values.operateur ?? "", reference: values.reference ?? "" });
  if (!parsed.success) return { error: "Le paiement n'a pas pu être envoyé. Rechargez la page et recommencez.", values };

  const r = await enregistrerPaiement(entrepriseId, factureId, parsed.data);
  if (r.ok) {
    actualiser(factureId);
    return retour(factureId, "paiement");
  }
  if ("introuvable" in r) notFound();
  const { general, ...champs } = r.erreurs;
  return { error: general, fieldErrors: champs as Record<string, string>, values };
}

// --- Modification --------------------------------------------------------------------------------------------------

const factureSchema = z.object({
  numero: texte(200),
  montant: texte(100),
  dateFacture: texte(20),
  echeance: texte(20),
  clientId: texte(100),
});

export async function modifierFactureAction(factureId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { entrepriseId } = await requireEntreprise();
  const values = stringValues(formData);
  const parsed = factureSchema.safeParse({ numero: values.numero ?? "", montant: values.montant ?? "", dateFacture: values.dateFacture ?? "", echeance: values.echeance ?? "", clientId: values.clientId ?? "" });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues), values };
  const { clientId, ...donnees } = parsed.data;

  const r = await modifierFacture(entrepriseId, factureId, { cle: "modification", ...donnees, client: { type: "existant", id: clientId } });
  if (r.ok) {
    actualiser(factureId);
    return retour(factureId, "modifiee");
  }
  if ("introuvable" in r) notFound();
  const { general, ...champs } = r.erreurs;
  return { error: general, fieldErrors: champs as Record<string, string>, values };
}

// --- Suspendre, reprendre, annuler ---------------------------------------------------------------------------------

// Ces actions servent de « action » à ActionConfirmee : le premier argument est lié à la facture, puis viennent l'état et le formulaire.
export async function suspendreAction(factureId: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  const { entrepriseId } = await requireEntreprise();
  return conclure(factureId, await suspendreRelances(entrepriseId, factureId), "suspendue", "");
}

export async function reprendreAction(factureId: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  const { entrepriseId } = await requireEntreprise();
  return conclure(factureId, await reprendreRelances(entrepriseId, factureId), "reprise", "");
}

export async function annulerFactureAction(factureId: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  const ctx = await contexte();
  return conclure(factureId, await annulerFacture(ctx, factureId), "annulee", "Seul un administrateur peut annuler une facture.");
}

export async function annulerPaiementAction(factureId: string, paiementId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await contexte();
  const motif = formData.get("motif");
  const r = await annulerPaiement(ctx, factureId, paiementId, typeof motif === "string" ? motif : "");
  return conclure(factureId, r, "paiement-annule", "Seul un administrateur peut annuler un paiement.");
}
