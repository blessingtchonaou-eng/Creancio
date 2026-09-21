import { Skeleton } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <div role="status" aria-label="Chargement de la facture" className="flex flex-col gap-4">
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-44 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      {Array.from({ length: 2 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}
