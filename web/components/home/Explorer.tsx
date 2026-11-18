"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Catalog } from "@/lib/types";
import { BUCKETS, sources, type Bucket } from "./groups";

export function Explorer({ catalog }: { catalog: Catalog }) {
  const all = useMemo(() => sources(catalog), [catalog]);
  const tabs = BUCKETS.filter((b) => all.some((s) => s.bucket === b.key));
  const [bucket, setBucket] = useState<Bucket>(tabs[0]?.key ?? "image");
  const [q, setQ] = useState("");
  const list = all.filter((s) => s.bucket === bucket && `${s.format.slug} ${s.format.name}`.toLowerCase().includes(q.trim().toLowerCase()));
  const [picked, setPicked] = useState("");
  const current = list.find((s) => s.format.slug === picked) ?? list[0];
  const count = (b: Bucket) => all.filter((s) => s.bucket === b).reduce((n, s) => n + s.targets.length, 0);

  return (
    <section id="all" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20" aria-labelledby="all-h">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="all-h" className="text-3xl font-extrabold tracking-tight">All converters</h2>
          <p className="mt-1 text-muted">{catalog.counts.pairs} converters. Choose the file you have, then what you want.</p>
        </div>
        <label className="relative block w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a format" aria-label="Search a format" className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm font-medium placeholder:text-muted focus:border-accent" />
        </label>
      </div>
      <div role="tablist" aria-label="Category" className="mt-6 flex flex-wrap gap-2">
        {tabs.map((b) => (
          <button key={b.key} role="tab" aria-selected={bucket === b.key} onClick={() => { setBucket(b.key); setPicked(""); }}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${bucket === b.key ? "bg-primary text-white" : "border border-line bg-white text-muted hover:text-ink"}`}>
            {b.label} <span className="opacity-70">{count(b.key)}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[260px_1fr]">
        <ul className="max-h-[420px] space-y-1.5 overflow-y-auto rounded-2xl border border-line bg-white p-2.5" aria-label="Convert from">
          {list.length === 0 && <li className="p-3 text-sm text-muted">No format matches.</li>}
          {list.map((s) => (
            <li key={s.format.slug}>
              <button onClick={() => setPicked(s.format.slug)} aria-pressed={current?.format.slug === s.format.slug}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-bold ${current?.format.slug === s.format.slug ? "bg-accent-soft text-primary" : "hover:bg-surface-2"}`}>
                <span>{s.format.slug.toUpperCase()} <span className="font-medium text-muted">{s.format.name}</span></span>
                <span className="text-xs font-semibold text-muted">{s.targets.length}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl border border-line bg-white p-5">
          {current ? (
            <>
              <h3 className="text-lg font-extrabold">Convert {current.format.slug.toUpperCase()} to…</h3>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {current.targets.map((t) => (
                  <li key={t}>
                    <Link href={`/convert/${current.format.slug}-to-${t}`} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-bold hover:border-primary hover:bg-accent-soft">
                      <span>{current.format.slug.toUpperCase()} <span className="text-muted">→</span> {t.toUpperCase()}</span>
                      <span className="text-xs font-semibold text-muted">{catalog.formats.find((f) => f.slug === t)?.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : <p className="text-sm text-muted">Pick a format on the left.</p>}
        </div>
      </div>
    </section>
  );
}
