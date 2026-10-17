"use client";
import Link from "next/link";
import { useFormats } from "@/hooks/useFormats";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

/** Box 3 — category directory: Images, Audio, Video + RAW row. All from /v1/formats. */
export function CategoryBlocks() {
  const { formats, pairs, loading, error } = useFormats();

  if (loading) {
    return (
      <div className="flex justify-center py-8" role="status" aria-label="Loading formats">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (error || !formats || !pairs) return null;

  const categories = [
    { id: "image", title: "Image converters" },
    { id: "audio", title: "Audio converters" },
    { id: "video", title: "Video converters" },
  ] as const;

  const blurbFor = (category: string) =>
    formats
      .filter((format) => format.category === category && format.subgroup !== "raw")
      .slice(0, 6)
      .map((format) => format.name)
      .join(", ");

  const pairCountFor = (category: string, rawOnly = false) =>
    pairs.filter((pair) => {
      const source = formats.find((format) => format.slug === pair.from);
      if (!source || source.category !== category) return false;
      if (rawOnly) return source.subgroup === "raw";
      return source.subgroup !== "raw";
    }).length;

  const popularFor = (category: string, rawOnly = false) =>
    pairs
      .filter((pair) => {
        const source = formats.find((format) => format.slug === pair.from);
        if (!source || source.category !== category) return false;
        return rawOnly ? source.subgroup === "raw" : source.subgroup !== "raw";
      })
      .slice(0, 8);

  const nameOf = (slug: string) => formats.find((format) => format.slug === slug)?.name ?? slug.toUpperCase();

  return (
    <section aria-label="Browse converters by category" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6" id="formats">
      <h2 className="text-2xl font-bold text-text">Browse by category</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id} className="p-5">
            <h3 className="font-semibold text-text">{category.title}</h3>
            <p className="mt-1 text-sm text-text-muted">{blurbFor(category.id)} and more.</p>
            <p className="mt-2 text-xs font-medium text-text-muted">
              {pairCountFor(category.id)} pairs
            </p>
            <ul className="mt-3 space-y-1.5">
              {popularFor(category.id).map((pair) => (
                <li key={pair.slug}>
                  <Link href={`/convert/${pair.slug}`} className="text-sm text-primary hover:underline">
                    {nameOf(pair.from)} to {nameOf(pair.to)}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      {pairCountFor("image", true) > 0 && (
        <Card className="mt-4 p-5">
          <h3 className="font-semibold text-text">RAW camera converters</h3>
          <p className="mt-1 text-sm text-text-muted">
            Develop RAW sensor data (
            {formats
              .filter((format) => format.subgroup === "raw")
              .slice(0, 4)
              .map((format) => format.name)
              .join(", ")}{" "}
            and more) into web-ready images.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {popularFor("image", true).map((pair) => (
              <Link key={pair.slug} href={`/convert/${pair.slug}`} className="text-sm text-primary hover:underline">
                {nameOf(pair.from)} to {nameOf(pair.to)}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}
