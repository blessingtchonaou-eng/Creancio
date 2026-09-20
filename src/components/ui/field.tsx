import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  help?: string;
  error?: string;
  /** Avertissement qui n'empêche pas d'enregistrer (ex. un NIF inhabituel). */
  warning?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

/** Champ avec libellé, aide, erreur, préfixe (+228) et suffixe (FCFA). Texte à 16 px pour éviter le zoom sur mobile. */
export function Field({ label, help, error, warning, prefix, suffix, className, id, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = `${inputId}-desc`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-body-sm font-semibold text-ink">
        {label}
      </label>
      <div
        className={cn(
          "flex h-12 items-center gap-2 rounded-md border bg-surface px-3.5 text-base",
          "focus-within:border-2 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15",
          error ? "border-danger bg-st-overdue-bg/30" : "border-border-strong",
          props.disabled && "bg-surface-muted text-ink-muted",
        )}
      >
        {prefix && <span className="-ml-3.5 flex h-full items-center border-r border-border-strong px-3 font-semibold">{prefix}</span>}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={help || error || warning ? descId : undefined}
          className="w-full bg-transparent text-ink outline-none placeholder:text-ink-muted disabled:cursor-not-allowed"
          {...props}
        />
        {suffix && <span className="font-semibold text-ink-muted">{suffix}</span>}
      </div>
      {(error || warning || help) && (
        <p
          id={descId}
          role={warning && !error ? "status" : undefined}
          className={cn("mt-1.5 text-body-sm", error ? "text-danger" : warning ? "rounded-sm bg-st-partial-bg px-2 py-1 font-medium text-st-partial-fg" : "text-ink-muted")}
        >
          {error ?? (warning ? `⚠ ${warning}` : help)}
        </p>
      )}
    </div>
  );
}
