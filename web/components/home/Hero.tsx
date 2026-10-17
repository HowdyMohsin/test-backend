"use client";
import { useFormats } from "@/hooks/useFormats";
import { usePlans } from "@/hooks/usePlans";
import { useSite } from "@/hooks/useSite";
import { Badge } from "@/components/ui/Badge";

/** Box 1 — Hero. Badge numbers from /v1/formats, limits note from backend, honest counter only. */
export function Hero() {
  const { formats, pairs } = useFormats();
  const { messages } = usePlans();
  const { site } = useSite();

  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {formats && pairs ? (
            <Badge tone="info">
              {formats.length} formats · {pairs.length} conversion pairs
            </Badge>
          ) : (
            <Badge tone="neutral">Loading…</Badge>
          )}
          {site?.public_counter !== null && site?.public_counter !== undefined && (
            <Badge tone="success">{site.public_counter.toLocaleString()} files converted</Badge>
          )}
        </div>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-text sm:text-5xl">
          Convert images, audio &amp; video online — free
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-text-muted sm:text-lg">
          Drop your files below and convert between every supported format pair right in your browser.
          No watermarks, no installs — files are deleted automatically after 1 hour.
        </p>
        {messages.anon_teaser && (
          <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">{messages.anon_teaser}</p>
        )}
        <a
          href="#convert"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-contrast hover:bg-primary-hover"
        >
          Start converting
        </a>
      </div>
    </section>
  );
}
