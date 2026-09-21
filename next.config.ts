import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // exceljs lit les fichiers côté serveur : il reste hors du bundle.
  serverExternalPackages: ["exceljs"],
  async headers() {
    // Le jeton de réinitialisation est dans l'adresse : jamais transmis à un autre site, jamais mis en cache.
    return [{ source: "/nouveau-mot-de-passe", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store" }] }];
  },
  experimental: {
    // L'import de factures envoie un fichier de 2 Mo maximum (la marge couvre l'enveloppe multipart).
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
