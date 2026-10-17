import type { MetadataRoute } from "next";

/** Sitemap: homepage + pair pages. Pair slugs come from the backend registry at build time. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://quickimgconvert.com";
  const entries: MetadataRoute.Sitemap = [{ url: base, changeFrequency: "daily", priority: 1 }];
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const response = await fetch(`${apiBase}/v1/formats`, { next: { revalidate: 86400 } });
    if (response.ok) {
      const data = (await response.json()) as { pairs: { slug: string }[] };
      for (const pair of data.pairs ?? []) {
        entries.push({
          url: `${base}/convert/${pair.slug}`,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Sitemap still serves the homepage when the API is unreachable.
  }
  return entries;
}
