"use server";

import { headers } from "next/headers";
import type { FormState } from "@/lib/form-state";
import { lireIpClient } from "@/lib/ip-client";
import { traiterDemandePilote } from "@/lib/pilote";

/** Formulaire « Rejoindre le pilote » de la page d'accueil. Toute la logique est dans src/lib/pilote.ts. */
export async function demanderPilote(_prev: FormState, formData: FormData): Promise<FormState> {
  return traiterDemandePilote(formData, lireIpClient(await headers()));
}
