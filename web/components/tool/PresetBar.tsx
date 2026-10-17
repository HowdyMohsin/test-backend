"use client";
import { Chip } from "@/components/ui/Chip";
import type { Preset } from "@/lib/api/generated";

/** Backend presets for the output category. Click fills the options panel. */
export function PresetBar({
  presets,
  onApply,
}: {
  presets: Preset[];
  onApply: (preset: Preset) => void;
}) {
  if (presets.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Presets</span>
      {presets.map((preset) => (
        <Chip key={preset.id} onClick={() => onApply(preset)}>
          {preset.name}
        </Chip>
      ))}
    </div>
  );
}
