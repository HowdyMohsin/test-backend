"use client";
import { useMemo } from "react";
import Link from "next/link";
import { LogoMark } from "./Logo";
import { useFormats } from "@/hooks/useFormats";

const LIVE = "https://quickimgconvert.com";

function Column({ title, links }: { title: string; links: { slug: string; label: string }[] }) {
  if (links.length === 0) return null;
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-text hover:text-primary [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1">
          {title}
          <svg className="h-3 w-3 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
        </span>
      </summary>
      <ul className="mt-2 space-y-1">
        {links.map((link) => (
          <li key={link.slug}>
            <Link href={`/convert/${link.slug}`} className="text-sm text-text-muted hover:text-primary">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function Footer() {
  const { formats, pairs } = useFormats();

  const columns = useMemo(() => {
    if (!formats || !pairs) return [];
    const formatBySlug = new Map(formats.map((format) => [format.slug, format]));
    const labelFor = (from: string, to: string) => {
      const fromName = formatBySlug.get(from)?.name ?? from.toUpperCase();
      const toName = formatBySlug.get(to)?.name ?? to.toUpperCase();
      return `${fromName} to ${toName}`;
    };
    const groups: Record<string, { slug: string; label: string }[]> = {
      "Image converters": [],
      "RAW converters": [],
      "Audio converters": [],
      "Video converters": [],
    };
    for (const pair of pairs) {
      const source = formatBySlug.get(pair.from);
      if (!source) continue;
      const entry = { slug: pair.slug, label: labelFor(pair.from, pair.to) };
      if (source.category === "audio") groups["Audio converters"].push(entry);
      else if (source.category === "video") groups["Video converters"].push(entry);
      else if (source.subgroup === "raw") groups["RAW converters"].push(entry);
      else groups["Image converters"].push(entry);
    }
    return Object.entries(groups).map(([title, links]) => ({ title, links }));
  }, [formats, pairs]);

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-7 w-7" />
          <span className="font-bold text-text">Quick Image Convert</span>
        </div>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Convert images, audio and video between 210 format pairs. Files are processed on our
          servers and deleted automatically after 1 hour.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-5">
          {columns.map((column) => (
            <Column key={column.title} title={column.title} links={column.links} />
          ))}
          <div>
            <p className="text-sm font-semibold text-text">Company</p>
            <ul className="mt-2 space-y-1">
              {[
                { href: `${LIVE}/about`, label: "About" },
                { href: `${LIVE}/contact`, label: "Contact" },
                { href: `${LIVE}/privacy`, label: "Privacy Policy" },
                { href: `${LIVE}/terms`, label: "Terms" },
                { href: `${LIVE}/blog`, label: "Blog" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-muted hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-6 text-xs text-text-muted">
          © {new Date().getFullYear()} Quick Image Convert. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
