"use client";
import { useMemo } from "react";
import type { Preset } from "@/lib/api/generated";
import { useFormats } from "./useFormats";

/** Presets for an output category, straight from the backend. */
export function usePresets(category: string | null): Preset[] {
  const { presets } = useFormats();
  return useMemo(
    () => (presets ?? []).filter((preset) => preset.category === category),
    [presets, category]
  );
}
