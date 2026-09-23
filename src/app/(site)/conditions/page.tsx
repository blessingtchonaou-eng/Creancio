import type { Metadata } from "next";
import { PageLegale } from "@/components/site/page-legale";
import { landing } from "@/content/landing";

export const metadata: Metadata = { title: landing.legal.conditions.titre };

export default function Conditions() {
  return <PageLegale titre={landing.legal.conditions.titre} paragraphes={landing.legal.conditions.paragraphes} />;
}
