import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  error?: string;
}

/** Case à cocher avec son libellé cliquable (zone tactile de 44 px) et son message d'erreur. */
export function CheckboxField({ label, error, className, id, ...props }: CheckboxFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = `${inputId}-desc`;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-body-sm text-ink">
        <input
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? descId : undefined}
          className={cn("mt-0.5 size-5 shrink-0 cursor-pointer accent-primary", error && "outline-2 outline-danger")}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={descId} className="text-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
