import type { FormatInfo } from "./types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "Quick Image Convert";

const up = (f: FormatInfo) => f.slug.toUpperCase();

export function pairTitle(src: FormatInfo, dst: FormatInfo): string {
  return `${up(src)} to ${up(dst)} Converter – Free Online`;
}

/** 120-170 characters, different for every pair because it uses both format names. */
export function pairDescription(src: FormatInfo, dst: FormatInfo): string {
  const long = `Convert ${up(src)} to ${up(dst)} online. Upload your ${src.name} file, set the options you want and download a checked ${dst.name} file in seconds. Free to start, nothing to install.`;
  const short = `Convert ${up(src)} to ${up(dst)} online. Upload your ${src.name} file, set the options you want and download a checked ${dst.name} file in seconds.`;
  const text = long.length <= 170 ? long : short;
  return text.length <= 170 ? text : text.slice(0, 167) + "...";
}
