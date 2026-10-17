/** Client-side probing: dimensions, duration, thumbnails, GPS warning. */

export interface ProbeResult {
  width: number | null;
  height: number | null;
  duration: number | null;
  hasGps: boolean;
  thumbnailUrl: string | null;
}

const empty: ProbeResult = { width: null, height: null, duration: null, hasGps: false, thumbnailUrl: null };

export async function probeFile(file: File, formatSlug: string | null, category: string | null): Promise<ProbeResult> {
  try {
    if (category === "image") return await probeImage(file, formatSlug);
    if (category === "video") return await probeVideo(file);
    if (category === "audio") return await probeAudio(file);
  } catch {
    /* probing is best-effort */
  }
  return { ...empty };
}

function objectUrl(file: File): string {
  return URL.createObjectURL(file);
}

async function probeImage(file: File, formatSlug: string | null): Promise<ProbeResult> {
  const url = objectUrl(file);
  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("unreadable"));
    image.src = url;
  });
  await loaded;
  const hasGps = formatSlug === "jpg" || formatSlug === "jpeg" ? await jpegHasGps(file) : false;
  return {
    width: image.naturalWidth || null,
    height: image.naturalHeight || null,
    duration: null,
    hasGps,
    thumbnailUrl: url,
  };
}

async function probeVideo(file: File): Promise<ProbeResult> {
  const url = objectUrl(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("unreadable"));
    video.src = url;
  });
  const width = video.videoWidth || null;
  const height = video.videoHeight || null;
  const duration = Number.isFinite(video.duration) ? video.duration : null;
  // First-frame thumbnail.
  let thumbnailUrl: string | null = null;
  try {
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.onerror = () => resolve();
      video.currentTime = Math.min(0.5, (duration ?? 1) / 2);
      window.setTimeout(resolve, 1500);
    });
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = width && height ? Math.round((160 * height) / width) : 90;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    /* keep null */
  }
  return { width, height, duration, hasGps: false, thumbnailUrl };
}

async function probeAudio(file: File): Promise<ProbeResult> {
  const url = objectUrl(file);
  const audio = document.createElement("audio");
  await new Promise<void>((resolve, reject) => {
    audio.onloadedmetadata = () => resolve();
    audio.onerror = () => reject(new Error("unreadable"));
    audio.src = url;
  });
  return {
    ...empty,
    duration: Number.isFinite(audio.duration) ? audio.duration : null,
  };
}

/** Best-effort GPS check: looks for the GPS IFD pointer in JPEG EXIF. */
async function jpegHasGps(file: File): Promise<boolean> {
  try {
    const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
    if (head[0] !== 0xff || head[1] !== 0xd8) return false;
    let offset = 2;
    while (offset + 4 < head.length) {
      if (head[offset] !== 0xff) break;
      const marker = head[offset + 1];
      const length = (head[offset + 2] << 8) | head[offset + 3];
      if (length < 2) break;
      if (marker === 0xe1) {
        const segment = head.slice(offset + 4, offset + 2 + length);
        if (segment[0] === 0x45 && segment[1] === 0x78 && segment[2] === 0x69 && segment[3] === 0x66) {
          if (exifHasGpsPointer(segment.slice(6))) return true;
        }
      }
      if (marker === 0xda) break;
      offset += 2 + length;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function exifHasGpsPointer(tiff: Uint8Array): boolean {
  if (tiff.length < 8) return false;
  const little = tiff[0] === 0x49 && tiff[1] === 0x49;
  if (!little && !(tiff[0] === 0x4d && tiff[1] === 0x4d)) return false;
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const ifdOffset = view.getUint32(4, little);
  if (ifdOffset + 2 > tiff.length) return false;
  const entries = view.getUint16(ifdOffset, little);
  for (let i = 0; i < entries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 2 > tiff.length) break;
    if (view.getUint16(entryOffset, little) === 0x8825) return true;
  }
  return false;
}
