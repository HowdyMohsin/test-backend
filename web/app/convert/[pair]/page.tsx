import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConverterTool } from "@/components/tool/ConverterTool";
import RelatedPairs from "@/components/RelatedPairs";
import {
  PAIRS,
  getFormat,
  getPair,
  pairDescription,
  pairNotes,
  pairTitle,
  type Pair,
} from "@/lib/formats";

export function generateStaticParams() {
  return PAIRS.map((p) => ({ pair: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { pair: string };
}): Promise<Metadata> {
  const p = getPair(params.pair);
  if (!p) return {};
  const title = `${pairTitle(p)} — Free Online`;
  const description = pairDescription(p);
  return {
    title,
    description,
    alternates: { canonical: `/convert/${p.slug}` },
    openGraph: { title, description, type: "website" },
  };
}

function aboutParagraphs(p: Pair): string[] {
  const from = getFormat(p.from);
  const to = getFormat(p.to);
  if (!from || !to) return [];
  const p1 = `Convert ${from.name} to ${to.name} online for free — no signup, no watermark, nothing to install. Drop your file above, tune the output settings if you like, and download the result in seconds. The heavy lifting happens on our servers.`;
  let p2: string;
  if (p.to === "svg") {
    p2 = `Vectorizing a ${from.name} means tracing it into clean vector shapes — infinitely scalable and tiny in file size. Flat graphics and logos trace beautifully; fine photographic detail won't survive tracing the same way, so check the result against your use case.`;
  } else if (p.from === "pdf") {
    p2 = `Every page of your PDF is rendered as a ${to.name} image at the DPI you choose, and all pages are delivered together in a single ZIP file.`;
  } else if (from.subgroup === "raw") {
    p2 = `${from.name} files hold far more data than a JPEG. We develop the RAW sensor data with camera white balance into an 8-bit sRGB ${to.name} — the same starting point professional editors use.`;
  } else if (from.category === "video" && to.category === "audio") {
    p2 = `We pull the audio track out of your ${from.name} video and encode it as ${to.name}. The picture is dropped; the sound keeps its quality.`;
  } else if (p.to === "gif") {
    p2 = `Your ${from.name} becomes an animated GIF with an optimized 2-pass palette. Lower the frame rate or width above for a smaller file that still looks sharp.`;
  } else if (from.category === "audio" && to.category === "audio") {
    p2 = `Re-encode your audio to ${to.name} with full control over bitrate and quality. Lossless sources stay pristine; lossy ones are transcoded cleanly in one pass.`;
  } else {
    p2 = `Your ${to.name} is ready in seconds. Adjust quality, metadata and format-specific options above — every setting is applied server-side by our conversion engine.`;
  }
  return [p1, p2];
}

export default function PairPage({ params }: { params: { pair: string } }) {
  const p = getPair(params.pair);
  if (!p) notFound();
  const from = getFormat(p.from);
  const to = getFormat(p.to);
  if (!from || !to) notFound();
  const notes = pairNotes(p.from, p.to);
  const about = aboutParagraphs(p);

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: pairTitle(p),
    url: `https://quickimgconvert.com/convert/${p.slug}`,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://quickimgconvert.com" },
      {
        "@type": "ListItem",
        position: 2,
        name: pairTitle(p),
        item: `https://quickimgconvert.com/convert/${p.slug}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-mist">
        <Link href="/" className="transition-colors hover:text-acid">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="text-paper">
          {from.name} → {to.name}
        </span>
      </nav>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {from.name} <span className="text-acid">→</span> {to.name}
        </h1>
        {p.label && (
          <span className="rounded-lg border border-iris/50 bg-iris/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-iris">
            {p.label}
          </span>
        )}
      </div>
      <p className="mt-3 max-w-2xl leading-relaxed text-mist">{pairDescription(p)}</p>

      <div className="mt-8">
        <ConverterTool presetFrom={p.from} presetTo={p.to} />
      </div>

      {notes.length > 0 && (
        <div className="mt-6 rounded-xl border border-cyanx/30 bg-cyanx/5 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyanx">
            Good to know
          </p>
          <ul className="mt-2 space-y-1.5">
            {notes.map((n) => (
              <li key={n} className="text-sm leading-relaxed text-mist">
                ✦ {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="mt-10 space-y-4">
        <h2 className="font-display text-xl font-bold tracking-tight">
          About this conversion
        </h2>
        {about.map((para) => (
          <p key={para.slice(0, 24)} className="leading-relaxed text-mist">
            {para}
          </p>
        ))}
      </section>

      <RelatedPairs slug={p.slug} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
    </div>
  );
}
