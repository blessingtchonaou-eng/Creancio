import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // exceljs lit les fichiers côté serveur : il reste hors du bundle.
  serverExternalPackages: ["exceljs"],
  async headers() {
    // Le jeton (réinitialisation, invitation pilote) est dans l'adresse : jamais transmis à un autre site, jamais mis en cache.
    // Next.js impose son propre Cache-Control aux pages dynamiques (« no-cache, must-revalidate ») : cette valeur ne
    // remplace donc pas la sienne sur le fil, mais reste déclarée (comportement documenté dans TODO-PRODUCTION.md).
    const pasDeCache = [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store" }];
    return [
      { source: "/nouveau-mot-de-passe", headers: pasDeCache },
      { source: "/inscription", headers: pasDeCache },
    ];
  },
  experimental: {
    // L'import de factures envoie un fichier de 2 Mo maximum (la marge couvre l'enveloppe multipart).
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
