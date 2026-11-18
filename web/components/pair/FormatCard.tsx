import { Badge } from "@/components/ui/Badge";
import type { FormatContent } from "@/content/types";
import type { FormatInfo } from "@/lib/types";

export function FormatCard({ format, content, role }: { format: FormatInfo; content?: FormatContent; role: "From" | "To" }) {
  const f = format.flags;
  return (
    <article className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{role}</p>
      <h3 className="mt-1 text-xl font-bold">{format.name}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {!f.vector && <Badge tone={f.lossy ? "warn" : "success"}>{f.lossy ? "Lossy" : "Lossless"}</Badge>}
        {format.category === "image" && <Badge tone={f.alpha ? "accent" : "neutral"}>{f.alpha ? "Transparency" : "No transparency"}</Badge>}
        {f.animated && <Badge tone="accent">Animation</Badge>}
        {f.vector && <Badge tone="accent">Vector</Badge>}
        {f.multipage && <Badge tone="accent">Multi-page</Badge>}
      </div>
      {content && (
        <dl className="mt-4 space-y-3 text-sm">
          <p className="text-muted">{content.about}</p>
          <div><dt className="font-semibold">Best for</dt><dd className="text-muted">{content.bestFor}</dd></div>
          <div><dt className="font-semibold">Keep in mind</dt><dd className="text-muted">{content.watchOut}</dd></div>
        </dl>
      )}
    </article>
  );
}
