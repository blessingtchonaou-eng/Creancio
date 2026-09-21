import { notFound } from "next/navigation";
import { factureExiste } from "@/lib/factures-fiche";
import { requireEntreprise } from "@/lib/session";

/**
 * Vrai 404 pour la facture d'une autre entreprise (ou qui n'existe pas).
 * Le contrôle est ici, et non seulement dans les pages : le squelette de chargement (loading.tsx) fait démarrer la réponse
 * avant que la page ne s'exécute, et un « introuvable » lancé après aurait répondu 200. Une mise en page, elle, passe avant.
 * Les pages refont leur propre contrôle (navigation d'une page à l'autre sans recharger).
 */
export default async function FactureLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { entrepriseId } = await requireEntreprise();
  const { id } = await params;
  if (!(await factureExiste(entrepriseId, id))) notFound();
  return children;
}
