import Link from "next/link";
import { serverCatalog } from "@/lib/api/server";
import { CONTACT_EMAIL } from "@/lib/site";
import type { Category, PairInfo } from "@/lib/types";
import { Logo } from "./Logo";

const groups: { key: string; label: string }[] = [
  { key: "image", label: "Image converters" },
  { key: "raw", label: "Camera RAW converters" },
  { key: "audio", label: "Audio converters" },
  { key: "video", label: "Video converters" },
];

export async function Footer() {
  const catalog = await serverCatalog();
  const fmt = new Map(catalog.formats.map((f) => [f.slug, f]));
  const bucket = (p: PairInfo): string => {
    const f = fmt.get(p.from);
    return f?.subgroup === "raw" ? "raw" : (f?.category as Category) ?? "image";
  };
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-muted">Convert images, audio and video online. Every converter is tested against real files, and your uploads are deleted automatically within an hour.</p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
              <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
              <li><Link href="/history" className="hover:text-primary">History</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-primary">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary">Terms</Link></li>
              {CONTACT_EMAIL && <li><a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-primary">Contact</a></li>}
            </ul>
          </div>
          <div className="space-y-2">
            {groups.map((g) => {
              const list = catalog.pairs.filter((p) => bucket(p) === g.key);
              if (!list.length) return null;
              return (
                <details key={g.key} className="group rounded-xl border border-line px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold">{g.label} <span className="font-normal text-muted">({list.length})</span></summary>
                  <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-muted sm:grid-cols-3">
                    {list.map((p) => (
                      <li key={p.slug}><Link href={`/convert/${p.slug}`} className="hover:text-primary hover:underline">{p.from.toUpperCase()} to {p.to.toUpperCase()}</Link></li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </div>
        <p className="mt-10 text-xs text-muted">© {new Date().getFullYear()} Quick Image Convert. Format names belong to their owners.</p>
      </div>
    </footer>
  );
}
