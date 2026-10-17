"use client";
import Link from "next/link";
import { useFormats } from "@/hooks/useFormats";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

/** Box 4 — Popular conversions. The 12 pairs come from /v1/formats. */
export function PopularGrid() {
  const { formats, popular, loading, error } = useFormats();

  if (loading || error || !popular) return null;
  if (popular.length === 0) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6" aria-label="Popular conversions">
        <EmptyState title="No popular conversions yet" hint="Check back soon." />
      </section>
    );
  }

  const nameOf = (slug: string) => formats?.find((format) => format.slug === slug)?.name ?? slug.toUpperCase();

  return (
    <section aria-label="Popular conversions" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="text-2xl font-bold text-text">Popular conversions</h2>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {popular.slice(0, 12).map((slug) => {
          const [from, to] = slug.split("-to-");
          return (
            <Link key={slug} href={`/convert/${slug}`}>
              <Card className="p-4 text-center transition-colors hover:border-accent">
                <p className="text-sm font-semibold text-text">
                  {nameOf(from)} <span aria-hidden className="text-text-muted">→</span> {nameOf(to)}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
