import type { PlanInfo } from "@/lib/types";

function mb(n: number) {
  return n >= 1024 ? `${n / 1024} GB` : `${n} MB`;
}

export function faqItems(plans: PlanInfo[], formats: number, pairs: number): { q: string; a: string }[] {
  const anon = plans.find((p) => p.id === "anonymous")?.limits;
  const free = plans.find((p) => p.id === "free")?.limits;
  const pro = plans.find((p) => p.id === "pro")?.limits;
  return [
    { q: "Is it free?", a: `Yes. You can convert ${anon?.daily_conversions ?? 5} files a day without an account and ${free?.daily_conversions ?? 25} a day with a free account. Pro raises the limit to ${pro?.daily_conversions.toLocaleString() ?? "2,000"} a day.` },
    { q: "How big can my files be?", a: `On the free plan, images and audio can be up to ${mb(free?.max_image_mb ?? 200)} and video up to ${mb(free?.max_video_mb ?? 500)}. Pro allows ${mb(pro?.max_image_mb ?? 2048)} and ${mb(pro?.max_video_mb ?? 4096)}.` },
    { q: "Are my files private?", a: "Your files are uploaded only to be converted. They are deleted automatically within an hour, and we do not look at them, share them or sell them." },
    { q: "Will converting reduce my quality?", a: "Lossless to lossless conversions, such as PNG to TIFF or WAV to FLAC, give an identical result. Converting to a lossy format like JPG or MP3 makes the file smaller, and you choose how much. Nothing can restore detail that an earlier lossy format already removed." },
    { q: "Which formats are supported?", a: `${formats} formats and ${pairs} converters: images (JPG, PNG, WebP, AVIF, GIF, TIFF, SVG, HEIC, PSD, PDF), camera RAW from Canon, Nikon, Sony and more, audio (MP3, WAV, FLAC, AAC, OGG, M4A, OPUS, AIFF) and video (MP4, MOV, MKV, AVI, WebM, WMV).` },
    { q: "Can I convert many files at once?", a: `Yes, up to ${free?.max_batch ?? 10} at once on the free plan and ${pro?.max_batch ?? 100} on Pro. You can download them one by one or all together as a ZIP.` },
    { q: "What does PNG to SVG do?", a: "It traces your picture into shapes. The result is a vector approximation, not an exact copy, so it suits logos and flat artwork better than photos." },
    { q: "A conversion failed. What now?", a: "Press Retry. If it fails again, the file may be damaged, in which case the message under the file tells you what is wrong. If you think it is our mistake, contact us." },
  ];
}

export function FaqSection({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="mx-auto mt-20 max-w-3xl px-4" aria-labelledby="faq">
      <h2 id="faq" className="text-2xl font-bold tracking-tight">Questions</h2>
      <div className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {items.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {f.q}
              <span className="text-muted transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-2 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
