import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Retour à l'écran précédent. La zone tactile fait 44 px de haut. */
export function BackLink({ href, children = "Retour" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-11 items-center gap-1.5 self-start rounded-md pr-3 text-body-sm font-semibold text-ink-muted hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
