import { Skeleton } from "@/components/ui/feedback";

export default function Loading() {
  return (
    <div role="status" aria-label="Chargement de la saisie" className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-[26rem] w-full rounded-lg" />
    </div>
  );
}
