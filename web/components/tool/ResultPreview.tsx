"use client";

import { useApp } from "@/lib/app-context";
import { absolute } from "@/lib/api/client";
import { bytes, duration } from "@/lib/format";
import type { Item } from "@/hooks/useConverter";
import { CompareSlider } from "./CompareSlider";

const RENDERABLE = new Set(["jpg", "png", "webp", "avif", "gif", "svg"]);

export function ResultPreview({ item }: { item: Item }) {
  const { formatBy } = useApp();
  const r = item.result;
  const to = formatBy(item.to ?? "");
  if (!r?.download_url || !to) return null;
  const url = absolute(r.download_url);
  const isZip = r.name?.endsWith(".zip");
  const before = item.info;
  const after = r.info;
  return (
    <div className="mt-3 space-y-3">
      {isZip ? (
        <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">Each page was saved as its own image. They are all inside the ZIP file.</p>
      ) : to.category === "image" && RENDERABLE.has(to.slug) ? (
        item.previewUrl ? <CompareSlider before={item.previewUrl} after={url} /> : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Converted result" className="max-h-[420px] w-full rounded-xl border border-line object-contain" />
        )
      ) : to.category === "audio" ? (
        <audio controls src={url} className="w-full" />
      ) : to.category === "video" && to.slug !== "gif" ? (
        <video controls src={url} className="max-h-[420px] w-full rounded-xl bg-black" />
      ) : null}
      {to.category === "image" && !isZip && !item.previewUrl && <p className="text-xs text-muted">Your browser cannot show the original format, so only the result is shown.</p>}
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div><dt className="text-muted">Size</dt><dd className="font-semibold">{bytes(item.file.size)} → {r.size ? bytes(r.size) : "—"}</dd></div>
        {before?.width && after?.width && <div><dt className="text-muted">Dimensions</dt><dd className="font-semibold">{before.width}×{before.height} → {after.width}×{after.height}</dd></div>}
        {before?.duration ? <div><dt className="text-muted">Length</dt><dd className="font-semibold">{duration(before.duration)}</dd></div> : null}
      </dl>
      {item.notes.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-accent-soft p-3 text-sm text-primary">
          {item.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}
