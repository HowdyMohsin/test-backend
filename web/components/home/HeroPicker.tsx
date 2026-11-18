"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Select } from "@/components/ui/Input";
import type { Catalog } from "@/lib/types";
import { BUCKETS, sources, type Bucket } from "./groups";

const rows = [
  { name: "holiday.heic", to: "JPG", done: true },
  { name: "podcast.wav", to: "MP3", done: true },
  { name: "clip.mov", to: "MP4", done: false },
];

export function HeroPicker({ catalog }: { catalog: Catalog }) {
  const all = useMemo(() => sources(catalog), [catalog]);
  const tabs = BUCKETS.filter((b) => all.some((s) => s.bucket === b.key));
  const [bucket, setBucket] = useState<Bucket>(all.find((s) => s.format.slug === "heic") ? "image" : tabs[0]?.key ?? "image");
  const inBucket = all.filter((s) => s.bucket === bucket);
  const [from, setFrom] = useState(inBucket.find((s) => s.format.slug === "heic")?.format.slug ?? inBucket[0]?.format.slug ?? "");
  const current = inBucket.find((s) => s.format.slug === from) ?? inBucket[0];
  const [to, setTo] = useState(current?.format.default_target ?? current?.targets[0] ?? "");
  const target = current?.targets.includes(to) ? to : current?.format.default_target ?? current?.targets[0] ?? "";

  function pickBucket(b: Bucket) {
    const first = all.find((s) => s.bucket === b);
    setBucket(b);
    if (first) { setFrom(first.format.slug); setTo(first.format.default_target ?? first.targets[0]); }
  }
  function pickFrom(slug: string) {
    const s = all.find((x) => x.format.slug === slug);
    setFrom(slug);
    if (s) setTo(s.format.default_target ?? s.targets[0]);
  }
  const popular = catalog.popular.map((s) => catalog.pairs.find((p) => p.slug === s)).filter((p) => !!p).slice(0, 6);

  return (
    <section className="relative overflow-hidden bg-primary text-white">
      <div aria-hidden className="absolute -right-24 -top-32 size-[480px] rounded-full bg-white/10" />
      <div aria-hidden className="absolute -bottom-40 left-[-120px] size-[360px] rounded-full bg-white/[0.07]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
        <div>
          <p className="inline-flex items-center rounded-full bg-white/15 px-3.5 py-1 text-sm font-bold">{catalog.counts.pairs} converters, {catalog.counts.formats} formats</p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-balance sm:text-6xl">Convert any file <span className="underline decoration-white/40 decoration-4 underline-offset-8">in seconds</span></h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">Pick what you have and what you want. Images, camera RAW, audio and video, checked for accuracy and deleted from our servers within an hour.</p>

          <div className="mt-8 rounded-3xl bg-white p-4 text-ink shadow-[0_30px_60px_-30px_rgba(15,42,99,0.7)] sm:p-5">
            <div role="tablist" aria-label="Category" className="flex flex-wrap gap-1.5">
              {tabs.map((b) => (
                <button key={b.key} role="tab" aria-selected={bucket === b.key} onClick={() => pickBucket(b.key)}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition-colors ${bucket === b.key ? "bg-primary text-white" : "bg-surface-2 text-muted hover:text-ink"}`}>{b.label}</button>
              ))}
            </div>
            <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <label className="block text-xs font-bold uppercase tracking-wide text-muted">From
                <Select className="mt-1.5 !h-12 text-base font-bold normal-case text-ink" value={current?.format.slug ?? ""} onChange={(e) => pickFrom(e.target.value)}>
                  {inBucket.map((s) => <option key={s.format.slug} value={s.format.slug}>{s.format.name.toUpperCase() === s.format.slug.toUpperCase() ? s.format.slug.toUpperCase() : `${s.format.slug.toUpperCase()} — ${s.format.name}`}</option>)}
                </Select>
              </label>
              <ArrowRight className="mx-auto mb-3.5 hidden size-5 text-muted sm:block" aria-hidden />
              <label className="block text-xs font-bold uppercase tracking-wide text-muted">To
                <Select className="mt-1.5 !h-12 text-base font-bold normal-case text-ink" value={target} onChange={(e) => setTo(e.target.value)}>
                  {(current?.targets ?? []).map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </Select>
              </label>
            </div>
            <Link href={`/convert/${current?.format.slug}-to-${target}`} className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-extrabold text-white transition-colors hover:bg-primary-hover">
              Start converting <ArrowRight className="size-5" aria-hidden />
            </Link>
            {popular.length > 0 && (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="font-semibold">Popular:</span>
                {popular.map((p) => p && <Link key={p.slug} href={`/convert/${p.slug}`} className="rounded-full bg-surface-2 px-3 py-1 font-bold text-ink hover:bg-accent-soft hover:text-primary">{p.from.toUpperCase()} to {p.to.toUpperCase()}</Link>)}
              </p>
            )}
          </div>
        </div>

        <div aria-hidden className="hidden lg:block">
          <div className="rounded-3xl bg-white p-5 text-ink shadow-[0_40px_80px_-30px_rgba(15,42,99,0.8)]">
            <div className="mb-4 flex gap-1.5"><span className="size-2.5 rounded-full bg-line" /><span className="size-2.5 rounded-full bg-line" /><span className="size-2.5 rounded-full bg-line" /></div>
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.name} className="rounded-2xl border border-line p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{r.name}</span>
                    <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-extrabold text-primary">{r.to}</span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 text-sm font-semibold">
                    {r.done ? <><Check className="size-4 text-success" /><span className="text-success">Done</span></> : <><Loader2 className="size-4 animate-spin text-primary" /><span className="text-muted">Converting</span></>}
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-surface-2"><div className={`h-full rounded-full ${r.done ? "w-full bg-success" : "w-2/3 bg-primary"}`} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
