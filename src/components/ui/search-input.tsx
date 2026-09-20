import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("flex h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-3.5 focus-within:border-primary", className)}>
      <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
      <span className="sr-only">Rechercher</span>
      <input type="search" className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-muted" {...props} />
    </label>
  );
}
