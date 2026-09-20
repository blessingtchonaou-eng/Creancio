import { BellRing, FileText, LayoutGrid, Smartphone, Users, type LucideIcon } from "lucide-react";

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutGrid },
  { href: "/factures", label: "Factures", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/relances", label: "Relances", icon: BellRing },
  { href: "/paiements", label: "Paiements", icon: Smartphone },
];
