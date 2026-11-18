import type { Limits } from "./types";

function size(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 ? 1 : 0)} GB` : `${mb} MB`;
}

/** Feature lines for a plan, built from its real limits so the copy can never drift from enforcement. */
export function planFeatures(l: Limits): string[] {
  return [
    `${l.daily_conversions.toLocaleString()} conversions per day`,
    `Images and audio up to ${size(l.max_image_mb)}`,
    `Video up to ${size(l.max_video_mb)} and ${l.max_video_minutes >= 60 ? `${l.max_video_minutes / 60} hours` : `${l.max_video_minutes} minutes`} long`,
    `${l.max_batch} files at once`,
    l.ads ? "Small ads outside the converter" : "No ads",
  ];
}
