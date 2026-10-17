"use client";
import { useFormats } from "@/hooks/useFormats";
import { Card } from "@/components/ui/Card";

/** Box 5 — six HONEST feature cards. No fake claims. */
export function FeatureGrid() {
  const { formats, pairs } = useFormats();

  const features = [
    {
      title: "Private by design",
      text: "Files travel over encrypted connections and are deleted automatically after 1 hour. We never sell or reuse your files.",
    },
    {
      title: `${pairs?.length ?? "Every"} real conversion pair`,
      text: "Each pair runs on our conversion servers — no fake buttons, no conversions that silently fail.",
    },
    {
      title: "No watermarks, ever",
      text: "Your downloads are clean output files. No branding burned into your images, audio or video.",
    },
    {
      title: "Batch conversion",
      text: "Queue up many files at once, each with its own target format and options. Download individually or as one ZIP.",
    },
    {
      title: "Fine-tuned output",
      text: "Quality sliders, bitrates, resize, metadata removal and format-specific options — with one-click presets when you're in a hurry.",
    },
    {
      title: "Works everywhere",
      text: `Nothing to install. Convert ${formats?.length ?? "dozens of"} formats from any modern browser, including your phone.`,
    },
  ];

  return (
    <section aria-label="Features" id="features" className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-2xl font-bold text-text">Why convert here</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="p-5">
              <h3 className="font-semibold text-text">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-text-muted">{feature.text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
