"use client";
import { Chip } from "@/components/ui/Chip";
import { Tooltip } from "@/components/ui/Tooltip";
import type { ApiFormat, ApiPair } from "@/lib/api/generated";

const GROUP_ORDER = ["image", "audio", "video"];
const GROUP_LABELS: Record<string, string> = { image: "Images", audio: "Audio", video: "Video" };

/** Target chips for one source format, grouped by category. */
export function TargetPicker({
  sourceSlug,
  targets,
  formats,
  pairs,
  selected,
  onSelect,
}: {
  sourceSlug: string;
  targets: string[];
  formats: ApiFormat[];
  pairs: ApiPair[];
  selected: string | null;
  onSelect: (target: string) => void;
}) {
  const formatBySlug = new Map(formats.map((format) => [format.slug, format]));
  const grouped = new Map<string, string[]>();
  for (const target of targets) {
    const format = formatBySlug.get(target);
    const group = format?.category ?? "image";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(target);
  }
  const tipFor = (target: string): string | null => {
    const pair = pairs.find((p) => p.from === sourceSlug && p.to === target);
    const format = formatBySlug.get(target);
    const bits: string[] = [];
    if (pair?.label) bits.push(pair.label);
    if (format?.flags.includes("lossy")) bits.push("Smaller files, tiny quality trade-off");
    if (format?.flags.includes("alpha")) bits.push("Keeps transparency");
    if (format?.flags.includes("animated")) bits.push("Keeps animation");
    return bits.length ? bits.join(" · ") : null;
  };

  return (
    <div className="space-y-3">
      {GROUP_ORDER.filter((group) => grouped.has(group)).map((group) => (
        <div key={group}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {GROUP_LABELS[group]}
          </p>
          <div className="flex flex-wrap gap-2">
            {grouped.get(group)!.map((target) => {
              const format = formatBySlug.get(target);
              const tip = tipFor(target);
              const chip = (
                <Chip
                  key={target}
                  active={selected === target}
                  onClick={() => onSelect(target)}
                  aria-pressed={selected === target}
                >
                  {format?.name ?? target.toUpperCase()}
                </Chip>
              );
              return tip ? (
                <Tooltip key={target} tip={tip}>
                  {chip}
                </Tooltip>
              ) : (
                chip
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
