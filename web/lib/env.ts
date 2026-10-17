/** Site URL for canonical links and sitemap. */
export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://quickimgconvert.com";
}
