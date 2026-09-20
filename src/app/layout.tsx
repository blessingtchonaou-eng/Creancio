import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fraunces", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Créancio", template: "%s · Créancio" },
  description: "Relances WhatsApp et paiements Mobile Money pour les PME togolaises.",
};

export const viewport: Viewport = {
  themeColor: "#4F6B2A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}
