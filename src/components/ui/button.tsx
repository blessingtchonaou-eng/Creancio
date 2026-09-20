import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-strong",
  secondary: "bg-surface text-ink border border-border-strong hover:bg-surface-muted",
  ghost: "bg-transparent text-primary hover:bg-surface-muted",
  danger: "bg-danger text-on-primary hover:brightness-90",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-3.5 text-body-sm rounded-md",
  md: "h-11 px-4.5 text-body rounded-md",
  lg: "h-13 px-5.5 text-base rounded-[14px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted disabled:border-transparent",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
