import type { FormatInfo, PairInfo } from "./types";

/** Facts that apply to one specific conversion, derived from the backend's format flags. */
export function pairNotes(src: FormatInfo, dst: FormatInfo, pair: PairInfo): string[] {
  const s = src.slug.toUpperCase();
  const d = dst.slug.toUpperCase();
  const n: string[] = [];
  if (dst.slug === "svg") n.push("This traces the picture into shapes. The result is a vector approximation, not an exact copy, and it works best on logos and flat artwork.");
  if (src.flags.multipage) n.push("Every page becomes its own image. When there is more than one page, they arrive together in a ZIP file.");
  if (src.subgroup === "raw") n.push("RAW files are developed with the camera's white balance. You can change brightness, highlights and noise reduction in the options.");
  if (src.category === "video" && dst.category === "audio") n.push("Only the sound is taken from the video. The picture is dropped.");
  if (src.category === "video" && dst.slug === "gif") n.push("This makes a short looping clip of up to 30 seconds. Choose the start time, width and frame rate in the options.");
  if (src.category === "video" && dst.category === "video") n.push("If the video can be placed into the new container without re-encoding, that is done, so quality stays exactly the same and it is much faster.");
  if (src.category !== "video" && src.flags.animated && dst.flags.animated) n.push("The animation is kept.");
  else if (src.flags.animated && !dst.flags.animated && dst.category === "image") n.push(`${d} is not animated, so only the first frame is kept.`);
  if (src.flags.alpha && !dst.flags.alpha && src.category === "image" && dst.category === "image") n.push(`${d} has no transparency. Transparent areas are filled with white, and you can pick another color in the options.`);
  if (src.category === "image" && dst.category === "image" && !src.flags.lossy && dst.flags.lossy && dst.slug !== "svg") n.push(`${d} is a lossy format, so the file becomes smaller. You control how much with the quality option.`);
  if (src.category === "image" && dst.category === "image" && src.flags.lossy && !dst.flags.lossy && dst.slug !== "svg") n.push(`Saving as ${d} does not bring back detail that ${s} already lost, and the file will usually be larger.`);
  if (src.category === "audio" && src.flags.lossy && !dst.flags.lossy) n.push(`${d} is lossless, but it cannot restore sound ${s} already removed. The file will be bigger.`);
  if (src.category === "audio" && !src.flags.lossy && !dst.flags.lossy) n.push("Both formats are lossless, so the sound is identical.");
  if (pair.note && !n.some((x) => x.startsWith("This traces"))) n.push(pair.note);
  return n.slice(0, 4);
}
