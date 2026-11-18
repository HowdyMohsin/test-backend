import type { MetadataRoute } from "next";
import { serverCatalog } from "@/lib/api/server";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { pairs } = await serverCatalog();
  return [{ url: SITE_URL, changeFrequency: "weekly", priority: 1 }, { url: `${SITE_URL}/pricing`, changeFrequency: "monthly" as const, priority: 0.6 }, ...pairs.map((p) => ({ url: `${SITE_URL}/convert/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.8 }))];
}
