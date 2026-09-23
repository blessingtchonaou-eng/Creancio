import type { Metadata } from "next";
import { Accroche } from "@/components/site/accroche";
import { BlocPilote } from "@/components/site/bloc-pilote";
import { CommentCaMarche, Confiance, Fonctionnalites, Probleme, Questions } from "@/components/site/sections";
import { landing } from "@/content/landing";

export const metadata: Metadata = {
  title: { absolute: landing.meta.titre },
  description: landing.meta.description,
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
  alternates: { canonical: "/" },
  // Pas d'og:image pour l'instant : aucune image lourde (voir TODO-PRODUCTION.md).
  openGraph: { type: "website", locale: "fr_FR", siteName: "Créancio", url: "/", title: landing.meta.titre, description: landing.meta.description },
};

export default function Accueil() {
  return (
    <>
      <Accroche />
      <Probleme />
      <CommentCaMarche />
      <Fonctionnalites />
      <Confiance />
      <Questions />
      <BlocPilote />
    </>
  );
}
