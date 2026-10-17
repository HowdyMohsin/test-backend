/**
 * Format registry — mirrors the backend's formats/*.py registry.
 * Pairs are DERIVED from each format's `targets` (single source of truth),
 * exactly like api/formats/registry.py does. Slugs never change (SEO).
 *
 * Pair math (must stay 210):
 *  images: raster 6x6=36 (incl. ->SVG tracing) + SVG->6 + HEIC->5 + PSD->5
 *          + PDF->4 + RAW 8x4=32            = 88
 *  audio:  8x7                               = 56
 *  video:  6 x (5 video + 5 audio + GIF)     = 66
 *  total                                     = 210
 */

export type FormatCategory = "image" | "audio" | "video";

export type SettingType = "select" | "range" | "number" | "boolean" | "color";

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingField {
  key: string;
  label: string;
  type: SettingType;
  default: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: SettingOption[];
  help?: string;
}

export interface FormatFlags {
  lossy?: boolean;
  alpha?: boolean;
  animated?: boolean;
  vector?: boolean;
  multipage?: boolean;
}

export interface FormatSpec {
  slug: string;
  name: string;
  category: FormatCategory;
  /** e.g. "raw" — shown as chips inside the IMAGES block */
  subgroup?: string;
  extensions: string[];
  mime: string;
  flags: FormatFlags;
  /** backend engine that reads it, null when output-only */
  reader: string | null;
  /** backend engine that writes it, null when input-only (RAW, PSD, HEIC, PDF) */
  writer: string | null;
  /** target slugs — pairs are derived from this */
  targets: string[];
  /** settings shown when this format is the conversion target */
  outputSettings: SettingField[];
}

const bool = (key: string, label: string, def: boolean, help?: string): SettingField => ({
  key,
  label,
  type: "boolean",
  default: def,
  help,
});

const quality = (def: number, help = "Higher = better quality, bigger file."): SettingField => ({
  key: "quality",
  label: "Quality",
  type: "range",
  default: def,
  min: 1,
  max: 100,
  help,
});

const stripMeta = (): SettingField =>
  bool("strip_metadata", "Remove metadata", false, "Strip EXIF and other metadata from the output.");

const bitrate = (key: string, options: string[], def: string): SettingField => ({
  key,
  label: "Bitrate",
  type: "select",
  default: def,
  options: options.map((v) => ({ value: v, label: v })),
});

const sampleRate = (): SettingField => ({
  key: "sample_rate",
  label: "Sample rate",
  type: "select",
  default: "44100",
  options: [
    { value: "44100", label: "44.1 kHz (CD)" },
    { value: "48000", label: "48 kHz (video)" },
  ],
});

const bitDepth = (): SettingField => ({
  key: "bit_depth",
  label: "Bit depth",
  type: "select",
  default: "16",
  options: [
    { value: "16", label: "16-bit" },
    { value: "24", label: "24-bit" },
  ],
});

const crf = (def: number): SettingField => ({
  key: "crf",
  label: "Quality (CRF)",
  type: "range",
  default: def,
  min: 18,
  max: 32,
  help: "Lower = better quality, bigger file.",
});

const preset = (): SettingField => ({
  key: "preset",
  label: "Speed preset",
  type: "select",
  default: "medium",
  options: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow"].map((v) => ({
    value: v,
    label: v,
  })),
  help: "Faster presets convert quicker with slightly larger files.",
});

const VIDEO_TARGETS = ["mp4", "mov", "mkv", "avi", "webm", "wmv"];

export const FORMATS: FormatSpec[] = [
  // ---------------------------------------------------------------- IMAGES
  {
    slug: "jpg",
    name: "JPG",
    category: "image",
    extensions: [".jpg", ".jpeg"],
    mime: "image/jpeg",
    flags: { lossy: true },
    reader: "vips",
    writer: "vips",
    targets: ["png", "webp", "avif", "gif", "tiff", "svg"],
    outputSettings: [
      quality(85),
      { key: "background", label: "Background", type: "color", default: "#ffffff", help: "Fills transparent areas of the source." },
      stripMeta(),
    ],
  },
  {
    slug: "png",
    name: "PNG",
    category: "image",
    extensions: [".png"],
    mime: "image/png",
    flags: { alpha: true },
    reader: "vips",
    writer: "vips",
    targets: ["jpg", "webp", "avif", "gif", "tiff", "svg"],
    outputSettings: [stripMeta()],
  },
  {
    slug: "webp",
    name: "WebP",
    category: "image",
    extensions: [".webp"],
    mime: "image/webp",
    flags: { lossy: true, alpha: true, animated: true },
    reader: "vips",
    writer: "vips",
    targets: ["jpg", "png", "avif", "gif", "tiff", "svg"],
    outputSettings: [
      quality(85),
      bool("lossless", "Lossless", false, "Lossless mode ignores the quality slider."),
      stripMeta(),
    ],
  },
  {
    slug: "avif",
    name: "AVIF",
    category: "image",
    extensions: [".avif"],
    mime: "image/avif",
    flags: { lossy: true, alpha: true },
    reader: "vips",
    writer: "vips",
    targets: ["jpg", "png", "webp", "gif", "tiff", "svg"],
    outputSettings: [quality(80), stripMeta()],
  },
  {
    slug: "gif",
    name: "GIF",
    category: "image",
    extensions: [".gif"],
    mime: "image/gif",
    flags: { animated: true, alpha: true },
    reader: "vips",
    writer: "vips",
    targets: ["jpg", "png", "webp", "avif", "tiff", "svg"],
    outputSettings: [
      { key: "fps", label: "Frame rate", type: "range", default: 12, min: 1, max: 30, help: "Used when converting video to GIF." },
      { key: "width", label: "Width (px)", type: "number", default: 480, min: 16, max: 1920, help: "Output width. Height scales automatically." },
    ],
  },
  {
    slug: "tiff",
    name: "TIFF",
    category: "image",
    extensions: [".tif", ".tiff"],
    mime: "image/tiff",
    flags: { alpha: true, multipage: true },
    reader: "vips",
    writer: "vips",
    targets: ["jpg", "png", "webp", "avif", "gif", "svg"],
    outputSettings: [
      {
        key: "compression",
        label: "Compression",
        type: "select",
        default: "lzw",
        options: [
          { value: "none", label: "None" },
          { value: "lzw", label: "LZW" },
          { value: "deflate", label: "Deflate (ZIP)" },
        ],
      },
      stripMeta(),
    ],
  },
  {
    slug: "svg",
    name: "SVG",
    category: "image",
    extensions: [".svg"],
    mime: "image/svg+xml",
    flags: { vector: true },
    reader: "resvg",
    writer: "vtracer",
    targets: ["jpg", "png", "webp", "avif", "tiff", "gif"],
    outputSettings: [
      { key: "trace_detail", label: "Tracing detail", type: "range", default: 60, min: 1, max: 100, help: "Higher keeps more detail when vectorizing a raster image." },
      {
        key: "trace_mode",
        label: "Trace mode",
        type: "select",
        default: "color",
        options: [
          { value: "color", label: "Color" },
          { value: "mono", label: "Black & white" },
        ],
      },
    ],
  },
  {
    slug: "heic",
    name: "HEIC",
    category: "image",
    extensions: [".heic", ".heif"],
    mime: "image/heic",
    flags: {},
    reader: "vips",
    writer: null,
    targets: ["jpg", "png", "webp", "avif", "tiff"],
    outputSettings: [quality(90)],
  },
  {
    slug: "psd",
    name: "PSD",
    category: "image",
    extensions: [".psd"],
    mime: "image/vnd.adobe.photoshop",
    flags: {},
    reader: "psd",
    writer: null,
    targets: ["jpg", "png", "webp", "avif", "tiff"],
    outputSettings: [quality(90)],
  },
  {
    slug: "pdf",
    name: "PDF",
    category: "image",
    extensions: [".pdf"],
    mime: "application/pdf",
    flags: { multipage: true },
    reader: "pdf",
    writer: null,
    targets: ["jpg", "png", "webp", "tiff"],
    outputSettings: [
      {
        key: "dpi",
        label: "Render DPI",
        type: "select",
        default: "150",
        options: [
          { value: "72", label: "72 DPI (web)" },
          { value: "150", label: "150 DPI" },
          { value: "300", label: "300 DPI (print)" },
        ],
      },
    ],
  },
  // ------------------------------------------------------------ RAW PHOTOS
  ...(
    [
      { slug: "cr2", name: "CR2", label: "Canon RAW", mime: "image/x-canon-cr2" },
      { slug: "nef", name: "NEF", label: "Nikon RAW", mime: "image/x-nikon-nef" },
      { slug: "arw", name: "ARW", label: "Sony RAW", mime: "image/x-sony-arw" },
      { slug: "dng", name: "DNG", label: "Adobe DNG", mime: "image/x-adobe-dng" },
      { slug: "rw2", name: "RW2", label: "Panasonic RAW", mime: "image/x-panasonic-rw2" },
      { slug: "orf", name: "ORF", label: "Olympus RAW", mime: "image/x-olympus-orf" },
      { slug: "pef", name: "PEF", label: "Pentax RAW", mime: "image/x-pentax-pef" },
      { slug: "raf", name: "RAF", label: "Fujifilm RAW", mime: "image/x-fujifilm-raf" },
    ] as const
  ).map(
    (r): FormatSpec => ({
      slug: r.slug,
      name: r.name,
      category: "image",
      subgroup: "raw",
      extensions: [`.${r.slug}`],
      mime: r.mime,
      flags: {},
      reader: "raw",
      writer: null,
      targets: ["jpg", "png", "webp", "tiff"],
      outputSettings: [
        {
          key: "white_balance",
          label: "White balance",
          type: "select",
          default: "camera",
          options: [
            { value: "camera", label: "As shot (camera)" },
            { value: "auto", label: "Auto" },
            { value: "daylight", label: "Daylight" },
            { value: "tungsten", label: "Tungsten" },
          ],
        },
        quality(92, "Output quality for the developed image."),
      ],
    })
  ),
  // ----------------------------------------------------------------- AUDIO
  {
    slug: "mp3",
    name: "MP3",
    category: "audio",
    extensions: [".mp3"],
    mime: "audio/mpeg",
    flags: { lossy: true },
    reader: "ffmpeg",
    writer: "ffmpeg",
    targets: ["wav", "flac", "aac", "ogg", "m4a", "opus", "aiff"],
    outputSettings: [bitrate("bitrate", ["128k", "192k", "256k", "320k"], "192k")],
  },
  {
    slug: "wav",
    name: "WAV",
    category: "audio",
    extensions: [".wav"],
    mime: "audio/wav",
    flags: {},
    reader: "ffmpeg",
    writer: "ffmpeg",
    targets: ["mp3", "flac", "aac", "ogg", "m4a", "opus", "aiff"],
    outputSettings: [sampleRate(), bitDepth()],
  },
  {
    slug: "flac",
    name: "FLAC",
    category: "audio",
    extensions: [".flac"],
    mime: "audio/flac",
    flags: {},
    reader: "ffmpeg",
    writer: "ffmpeg",
    targets: ["mp3", "wav", "aac", "ogg", "m4a", "opus", "aiff"],
    outputSettings: [
      { key: "compression_level", label: "Compression", type: "range", default: 5, min: 0, max: 8, help: "Higher = smaller file, slower encode. Quality stays lossless." },
    ],
  },
  {
    slug: "aac",
    name: "AAC",
    category: "audio",
    extensions: [".aac"],
    mime: "audio/aac",
    flags: { lossy: true },
    reader: "ffmpeg",
    writer: "ffmpeg",
    targets: ["mp3", "wav", "flac", "ogg", "m4a", "opus", "aiff"],
    outputSettings: [bitrate("bitrate", ["128k", "192k", "256k"], "192k")],
  },
  {
    slug: "ogg",
    name: "OGG",
    category: "audio",
    extensions: [".ogg", ".oga"],
    mime: "audio/ogg",
    flags: { lossy: true },
    reader: "ffmpeg",
    writer: "ffmpeg",
    targets: ["mp3", "wav", "flac", "aac", "m4a", "opus", "aiff"],
    outputSettings: [
      { key: "quality", label: "Quality", type: "range", default: 6, min: 1, max: 10, help: "Vorbis quality scale." },
    ],
  },
  {
    slug: "m4a",
    name: "M4A",
    category: "audio",
    extensions: [".m4a"],
    mime: "audio/mp4",
    flags: { lossy: true },
    reader: "ffmpeg",
    writer: "ffmpeg",
    targets: ["mp3", "wav", "flac", "aac", "ogg", "opus", "aiff"],
    outputSettings: [bitrate("bitrate", ["128k", "192k", "256k"], "192k")],
  },
  {
    slug: "opus",
    name: "OPUS",
    category: "audio",
    extensions: [".opus"],
    mime: "audio/opus",
    flags: { lossy: true },
    reader: "ffmpeg",
    writer: "ffmpeg",
    targets: ["mp3", "wav", "flac", "aac", "ogg", "m4a", "aiff"],
    outputSettings: [bitrate("bitrate", ["64k", "96k", "128k", "192k"], "128k")],
  },
  {
    slug: "aiff",
    name: "AIFF",
    category: "audio",
    extensions: [".aiff", ".aif"],
    mime: "audio/aiff",
    flags: {},
    reader: "ffmpeg",
    writer: "ffmpeg",
    targets: ["mp3", "wav", "flac", "aac", "ogg", "m4a", "opus"],
    outputSettings: [sampleRate(), bitDepth()],
  },
  // ----------------------------------------------------------------- VIDEO
  ...(
    [
      { slug: "mp4", name: "MP4", ext: ".mp4", mime: "video/mp4" },
      { slug: "mov", name: "MOV", ext: ".mov", mime: "video/quicktime" },
      { slug: "mkv", name: "MKV", ext: ".mkv", mime: "video/x-matroska" },
      { slug: "avi", name: "AVI", ext: ".avi", mime: "video/x-msvideo" },
      { slug: "webm", name: "WebM", ext: ".webm", mime: "video/webm" },
      { slug: "wmv", name: "WMV", ext: ".wmv", mime: "video/x-ms-wmv" },
    ] as const
  ).map(
    (v): FormatSpec => ({
      slug: v.slug,
      name: v.name,
      category: "video",
      extensions: [v.ext],
      mime: v.mime,
      flags: {},
      reader: "ffmpeg",
      writer: "ffmpeg",
      targets: [
        ...VIDEO_TARGETS.filter((t) => t !== v.slug),
        "mp3",
        "wav",
        "aac",
        "m4a",
        "ogg",
        "gif",
      ],
      outputSettings:
        v.slug === "wmv"
          ? [bitrate("video_bitrate", ["1M", "2M", "5M", "8M"], "2M")]
          : [crf(v.slug === "webm" ? 30 : 23), preset()],
    })
  ),
];

export interface Pair {
  slug: string;
  from: string;
  to: string;
  /** e.g. "Vectorized (traced)" for raster -> SVG */
  label?: string;
}

/** Derived from targets — the single source of truth, like the backend registry. */
export const PAIRS: Pair[] = (() => {
  const pairs: Pair[] = [];
  for (const f of FORMATS) {
    for (const t of f.targets) {
      const pair: Pair = { slug: `${f.slug}-to-${t}`, from: f.slug, to: t };
      if (t === "svg") pair.label = "Vectorized (traced)";
      pairs.push(pair);
    }
  }
  return pairs;
})();

export const PAIR_COUNT = PAIRS.length; // 210
export const FORMAT_COUNT = FORMATS.length; // 32

const formatMap = new Map(FORMATS.map((f) => [f.slug, f]));
const pairMap = new Map(PAIRS.map((p) => [p.slug, p]));

export function getFormat(slug: string): FormatSpec | undefined {
  return formatMap.get(slug);
}

export function getPair(slug: string): Pair | undefined {
  return pairMap.get(slug);
}

export function pairsFrom(slug: string): Pair[] {
  return PAIRS.filter((p) => p.from === slug);
}

export function pairsTo(slug: string): Pair[] {
  return PAIRS.filter((p) => p.to === slug);
}

/** Related pairs: same source first, then same target. Capped for the page. */
export function relatedPairs(slug: string, limit = 8): Pair[] {
  const pair = getPair(slug);
  if (!pair) return [];
  const sameFrom = PAIRS.filter((p) => p.from === pair.from && p.slug !== slug);
  const sameTo = PAIRS.filter(
    (p) => p.to === pair.to && p.from !== pair.from && !sameFrom.some((s) => s.slug === p.slug)
  );
  return [...sameFrom, ...sameTo].slice(0, limit);
}

/** Auto notes built from format flags — shown on pair pages and in the tool. */
export function pairNotes(fromSlug: string, toSlug: string): string[] {
  const from = getFormat(fromSlug);
  const to = getFormat(toSlug);
  if (!from || !to) return [];
  const notes: string[] = [];
  if (toSlug === "svg")
    notes.push(
      "Vectorized (traced) — your image is redrawn as vector shapes. Tiny details may differ from the original."
    );
  if (fromSlug === "gif" && toSlug === "webp")
    notes.push("Animation is preserved in the WebP output.");
  else if (fromSlug === "gif") notes.push("Only the first frame of the animation is converted.");
  if (fromSlug === "pdf")
    notes.push("Every page is rendered as an image and all pages are delivered together as a ZIP file.");
  if (from.subgroup === "raw")
    notes.push("Developed from the RAW sensor data with camera white balance. Output is 8-bit sRGB.");
  if (fromSlug === "svg") notes.push("Your SVG is rendered at high resolution, then converted.");
  if (fromSlug === "heic") notes.push("EXIF orientation is applied automatically.");
  if (fromSlug === "psd") notes.push("Flattened from the embedded Photoshop composite.");
  if (from.flags.alpha && toSlug === "jpg")
    notes.push("Transparent areas are filled with the background color you choose.");
  if (from.category === "video" && toSlug === "gif")
    notes.push("Frame rate and width are adjustable. Output uses an optimized 2-pass palette.");
  if (from.category === "video" && to.category === "audio")
    notes.push("The audio track is extracted from your video — the picture is dropped.");
  return notes;
}

export function pairTitle(p: Pair): string {
  const from = getFormat(p.from);
  const to = getFormat(p.to);
  return `${from?.name ?? p.from} to ${to?.name ?? p.to} Converter`;
}

export function pairDescription(p: Pair): string {
  const from = getFormat(p.from);
  const to = getFormat(p.to);
  const extra =
    p.to === "svg"
      ? " Vectorizes your image into clean, scalable vector shapes."
      : p.from === "pdf"
        ? " Every page becomes an image, delivered as a ZIP."
        : p.from === "gif"
          ? " Handles animated GIFs correctly."
          : "";
  return `Convert ${from?.name ?? p.from} to ${to?.name ?? p.to} free, right in your browser — processed on our servers, no signup, no watermark.${extra}`;
}

export const CATEGORIES: { id: FormatCategory; label: string; blurb: string }[] = [
  { id: "image", label: "Images", blurb: "Photos, graphics and RAW camera files" },
  { id: "audio", label: "Audio", blurb: "Music, voice and sound files" },
  { id: "video", label: "Video", blurb: "Clips, movies and screen recordings" },
];

export function formatsIn(id: FormatCategory, subgroup?: string): FormatSpec[] {
  return FORMATS.filter((f) => f.category === id && (subgroup ? f.subgroup === subgroup : !f.subgroup));
}
