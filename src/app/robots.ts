import type { MetadataRoute } from "next";

const SITE_URL = "https://www.mebtransporte.com.br";

/** Painel autenticado: indexar só a página pública de login. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/login",
      disallow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
