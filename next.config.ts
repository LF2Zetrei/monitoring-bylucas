import type { NextConfig } from "next";

// Pas de "output: export" : les routes API font du POST, lisent la requête
// et lancent des process serveur (systemctl, journalctl, certbot) - tout ça
// nécessite un vrai serveur Next.js, incompatible avec l'export statique.
const nextConfig: NextConfig = {};

export default nextConfig;
