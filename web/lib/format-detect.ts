import type { ApiFormat } from "./api/generated";

/** Extension → format slug using the live registry. Null when unknown. */
export function slugFromExtension(filename: string, formats: ApiFormat[]): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return null;
  const extension = filename.slice(dot + 1).toLowerCase();
  for (const format of formats) {
    if (format.extensions.includes(extension)) return format.slug;
  }
  return null;
}

/** Valid target slugs for a source, from live pairs. */
export function validTargets(
  sourceSlug: string,
  pairs: { slug: string; from: string; to: string }[]
): string[] {
  return pairs.filter((pair) => pair.from === sourceSlug).map((pair) => pair.to);
}
