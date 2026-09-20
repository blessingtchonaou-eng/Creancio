import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";

/**
 * Bloc du tableau de bord qui dépend des relances, pas encore construites : un état vide, jamais un chiffre inventé.
 * Les mises en forme prévues pour la suite sont dans ./a-venir/.
 */
export function BlocRelancesAVenir({ titre }: { titre: string }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-[1.0625rem]">{titre}</h2>
      <EmptyState title="Disponible dès les premières relances">Ce bloc se remplira quand Créancio aura envoyé vos premières relances.</EmptyState>
    </Card>
  );
}
