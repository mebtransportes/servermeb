import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { SECURITY_HEADERS } from "./src/lib/security-headers";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Evita que o build use um package-lock.json de pasta pai (local/Vercel)
  turbopack: {
    root: projectRoot,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
