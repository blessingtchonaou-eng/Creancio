import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  /** Précision courte à côté du libellé, par exemple « Facultatif ». */
  precision?: string;
  error?: string;
}

/** Liste déroulante native, même aspect que <Field> (hauteur 48 px, texte à 16 px pour éviter le zoom sur mobile). */
export function SelectField({ label, precision, error, className, id, children, ...props }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const descId = `${selectId}-desc`;
  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1.5 block text-body-sm font-semibold text-ink">
        {label}
        {precision && <span className="font-normal text-ink-muted"> · {precision}</span>}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? descId : undefined}
        className={cn(
          "h-12 w-full rounded-md border bg-surface px-3 text-base text-ink",
          "focus:border-2 focus:border-primary focus:ring-4 focus:ring-primary/15 focus:outline-none",
          error ? "border-danger" : "border-border-strong",
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={descId} className="mt-1.5 text-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
