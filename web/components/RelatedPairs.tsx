import Link from "next/link";
import { getFormat, getPair, relatedPairs } from "@/lib/formats";

export default function RelatedPairs({ slug }: { slug: string }) {
  const pair = getPair(slug);
  if (!pair) return null;
  const related = relatedPairs(slug, 8);
  if (related.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="font-display text-xl font-bold tracking-tight">Related conversions</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {related.map((p) => {
          const f = getFormat(p.from);
          const t = getFormat(p.to);
          return (
            <Link
              key={p.slug}
              href={`/convert/${p.slug}`}
              className="group flex items-center justify-between rounded-xl border border-line bg-panel px-4 py-3 transition-colors hover:border-acid/50"
            >
              <span className="font-display text-sm font-bold">
                {f?.name} <span className="text-acid">→</span> {t?.name}
                {p.label && (
                  <span className="ml-2 rounded bg-iris/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-iris">
                    {p.label}
                  </span>
                )}
              </span>
              <span className="text-mist transition-transform group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
