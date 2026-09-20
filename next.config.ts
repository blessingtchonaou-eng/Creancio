import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // exceljs lit les fichiers côté serveur : il reste hors du bundle.
  serverExternalPackages: ["exceljs"],
  experimental: {
    // L'import de factures envoie un fichier de 2 Mo maximum (la marge couvre l'enveloppe multipart).
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
