import type { Metadata } from "next";
import { PageLegale } from "@/components/site/page-legale";
import { landing } from "@/content/landing";

export const metadata: Metadata = { title: landing.legal.confidentialite.titre };

export default function Confidentialite() {
  return <PageLegale titre={landing.legal.confidentialite.titre} paragraphes={landing.legal.confidentialite.paragraphes} />;
}
