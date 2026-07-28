import type { MetadataRoute } from "next";

const SITE_URL = "https://www.mebtransporte.com.br";

/** Só páginas públicas — o restante exige login. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
