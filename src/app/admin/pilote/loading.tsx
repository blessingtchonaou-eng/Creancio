import { Skeleton } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <div role="status" aria-label="Chargement des demandes de pilote" className="flex flex-col gap-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-11 w-full rounded-full" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-56 w-full rounded-lg" />
      ))}
    </div>
  );
}
