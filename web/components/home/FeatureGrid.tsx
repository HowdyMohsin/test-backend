import type { PlanInfo } from "@/lib/types";

export function FeatureGrid({ formats, pairs, free, anon }: { formats: number; pairs: number; free?: PlanInfo; anon?: PlanInfo }) {
  const items = [
    { t: "Checked, not assumed", d: "Every converter is tested on real files. Lossless conversions must match pixel for pixel, and output that fails the check never goes live." },
    { t: "Control when you want it", d: "Quality, resize, target file size, color and metadata. Or just use a quick setting like Web, Email or Print." },
    { t: "Batch with one download", d: `Convert ${free?.limits.max_batch ?? 10} files at once and save them all as a single ZIP.` },
    { t: "Private by design", d: "Files are used only to convert them, then deleted automatically within an hour. We do not look at them or share them." },
    { t: `${formats} formats, ${pairs} converters`, d: "Images, camera RAW, audio and video, including HEIC, AVIF, WebP, FLAC, MKV and more." },
    { t: "Free to start", d: `${anon?.limits.daily_conversions ?? 5} conversions a day with no account, ${free?.limits.daily_conversions ?? 25} with a free one. The limits are shown up front.` },
  ];
  return (
    <section id="features" className="mx-auto mt-20 max-w-6xl scroll-mt-24 px-4" aria-labelledby="why">
      <h2 id="why" className="text-2xl font-bold tracking-tight">Why people use it</h2>
      <dl className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
        {items.map((i) => (
          <div key={i.t} className="border-t border-line pt-4">
            <dt className="font-semibold">{i.t}</dt>
            <dd className="mt-1.5 text-muted">{i.d}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
