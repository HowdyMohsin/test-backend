import type { Catalog, FormatInfo } from "@/lib/types";

export type Bucket = "image" | "raw" | "audio" | "video";
export const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "image", label: "Images" },
  { key: "raw", label: "Camera RAW" },
  { key: "audio", label: "Audio" },
  { key: "video", label: "Video" },
];

export const bucketOf = (f: FormatInfo): Bucket => (f.subgroup === "raw" ? "raw" : f.category);

/** Formats that can be converted from, grouped for the home page. Built only from live converters. */
export function sources(catalog: Catalog) {
  const targetsOf = (slug: string) => catalog.pairs.filter((p) => p.from === slug).map((p) => p.to);
  return catalog.formats.filter((f) => f.can_read && targetsOf(f.slug).length).map((f) => ({ format: f, targets: targetsOf(f.slug), bucket: bucketOf(f) }));
}
