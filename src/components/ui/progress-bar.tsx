import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  /** Étape en cours, à partir de 1. */
  current: number;
  total: number;
  /** Nom de l'étape en cours, affiché au-dessus de la barre. */
  label: string;
  className?: string;
}

/** Barre de progression par étapes (« Étape 2 sur 3 »). */
export function ProgressBar({ current, total, label, className }: ProgressBarProps) {
  return (
    <div className={className}>
      <p className="mb-2 text-body-sm font-semibold text-ink-muted">
        Étape {current} sur {total} · <span className="text-ink">{label}</span>
      </p>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={`Étape ${current} sur ${total} : ${label}`}
        className="flex gap-1.5"
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("h-2 flex-1 rounded-full", i < current ? "bg-primary" : "bg-surface-muted")} />
        ))}
      </div>
    </div>
  );
}
