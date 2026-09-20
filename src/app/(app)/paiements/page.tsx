import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Paiements" };

export default function Page() {
  return (
    <>
      <h1 className="font-display text-h1 font-medium">Paiements</h1>
      <EmptyState title="Écran en cours de conception">Cet écran sera construit à partir du design system à la prochaine étape.</EmptyState>
    </>
  );
}
