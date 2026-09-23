import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
export type Size = "md" | "lg" | "sm";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-strong",
  secondary: "bg-surface text-ink border border-border-strong hover:bg-surface-muted",
  ghost: "bg-transparent text-primary hover:bg-surface-muted",
  danger: "bg-danger text-on-primary hover:brightness-90",
  inverse: "bg-inverse text-on-inverse hover:brightness-125",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-3.5 text-body-sm rounded-md",
  md: "h-11 px-4.5 text-body rounded-md",
  lg: "h-13 px-5.5 text-base rounded-[14px]",
};

/** Classes d'un bouton, pour un lien ou une balise <a> qui doit lui ressembler. */
export function buttonClasses(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted disabled:border-transparent",
    variants[variant],
    sizes[size],
    className,
  );
}

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
    <button ref={ref} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClasses(variant, size, className)} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/** Lien qui ressemble à un bouton (navigation vers une autre page). */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
