import { Skeleton } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <div role="status" aria-label="Chargement du tableau de bord" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        <Skeleton className="h-80 w-full flex-1 rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg lg:w-[350px]" />
      </div>
    </div>
  );
}
