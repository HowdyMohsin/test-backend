import { ArrowRightFromLine } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ads/AdSlot";
import { Breadcrumbs } from "@/components/pair/Breadcrumbs";
import { FormatCard } from "@/components/pair/FormatCard";
import { HowToSteps } from "@/components/pair/HowToSteps";
import { PairFaq } from "@/components/pair/PairFaq";
import { PairNotes } from "@/components/pair/PairNotes";
import { RelatedPairs } from "@/components/pair/RelatedPairs";
import { JsonLd } from "@/components/seo/JsonLd";
import { ConverterTool } from "@/components/tool/ConverterTool";
import { formatContent } from "@/content/formats";
import { serverCatalog } from "@/lib/api/server";
import { pairNotes } from "@/lib/notes";
import { SITE_NAME, SITE_URL, pairDescription, pairTitle } from "@/lib/seo";

export const revalidate = 300;
type Params = Promise<{ pair: string }>;

export async function generateStaticParams() {
  return (await serverCatalog()).pairs.map((p) => ({ pair: p.slug }));
}

async function load(slug: string) {
  const catalog = await serverCatalog();
  const pair = catalog.pairs.find((p) => p.slug === slug);
  const src = catalog.formats.find((f) => f.slug === pair?.from);
  const dst = catalog.formats.find((f) => f.slug === pair?.to);
  if (!pair || !src || !dst) return null;
  return { catalog, pair, src, dst };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load((await params).pair);
  if (!data) return { title: "Converter not available", robots: { index: false } };
  const { src, dst, pair } = data;
  return {
    title: pairTitle(src, dst),
    description: pairDescription(src, dst),
    alternates: { canonical: `/convert/${pair.slug}` },
    openGraph: { title: pairTitle(src, dst), description: pairDescription(src, dst), url: `${SITE_URL}/convert/${pair.slug}` },
  };
}

export default async function PairPage({ params }: { params: Params }) {
  const data = await load((await params).pair);
  if (!data) notFound();
  const { catalog, pair, src, dst } = data;
  const S = src.slug.toUpperCase();
  const T = dst.slug.toUpperCase();
  const sc = formatContent[src.slug];
  const dc = formatContent[dst.slug];
  const faqs = [...(sc?.faqs.slice(0, 2) ?? []), ...(dc?.faqs.slice(0, 2) ?? [])];
  const related = [
    ...catalog.pairs.filter((p) => p.from === src.slug && p.slug !== pair.slug).slice(0, 3),
    ...catalog.pairs.filter((p) => p.to === dst.slug && p.slug !== pair.slug).slice(0, 3),
  ];
  const reverse = catalog.pairs.find((p) => p.from === dst.slug && p.to === src.slug);
  const intro = `Add your ${S} files and download ${T} files in seconds.${dc?.bestFor ? ` ${dst.name} is best for ${dc.bestFor.charAt(0).toLowerCase()}${dc.bestFor.slice(1)}` : ""}`;

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: `${S} to ${T}`, item: `${SITE_URL}/convert/${pair.slug}` }] },
          { "@type": "WebApplication", name: `${S} to ${T} converter`, url: `${SITE_URL}/convert/${pair.slug}`, applicationCategory: "MultimediaApplication",
            operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, publisher: { "@type": "Organization", name: SITE_NAME } },
        ],
      }} />

      <section className="relative overflow-hidden bg-primary text-white">
        <div aria-hidden className="absolute -right-32 -top-44 size-[520px] rounded-full bg-white/10" />
        <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-8">
          <Breadcrumbs light current={`${S} to ${T}`} />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-5xl">Convert {S} to {T} online</h1>
              <p className="mt-4 text-lg text-white/85">{intro}</p>
            </div>
            <div className="flex items-center gap-4" aria-hidden>
              <span className="grid size-24 place-items-center rounded-3xl bg-white text-xl font-extrabold text-primary shadow-xl">{S}</span>
              <ArrowRightFromLine className="size-6 text-white/80" />
              <span className="grid size-24 place-items-center rounded-3xl bg-navy text-xl font-extrabold text-white shadow-xl">{T}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-20 max-w-6xl px-4">
        <ConverterTool lockedFrom={src.slug} lockedTo={dst.slug} />
        {reverse && <p className="mt-4 text-sm text-muted">Need the other direction? <a className="font-bold text-primary hover:underline" href={`/convert/${reverse.slug}`}>{T} to {S}</a></p>}
      </div>

      <div className="mx-auto max-w-5xl space-y-14 px-4 pb-4 pt-16">
        <HowToSteps from={S} to={T} />
        <AdSlot slot="format_page_mid" />
        <div className="grid gap-4 md:grid-cols-2">
          <FormatCard format={src} content={sc} role="From" />
          <FormatCard format={dst} content={dc} role="To" />
        </div>
        <PairNotes notes={pairNotes(src, dst, pair)} />
        {faqs.length > 0 && <PairFaq items={faqs} title={`${S} to ${T}: common questions`} />}
        <RelatedPairs pairs={related} from={src.slug} />
      </div>
      <AdSlot slot="below_faq" />
    </>
  );
}
