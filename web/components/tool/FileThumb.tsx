import type { QueueFile } from "@/hooks/useFileQueue";

/** Thumbnail: image preview, video first frame, audio icon. */
export function FileThumb({ queueFile }: { queueFile: QueueFile }) {
  if (queueFile.thumbnailUrl) {
    return (
      // Thumbnails are blob: object URLs from local probing — next/image cannot optimize them.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={queueFile.thumbnailUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
      />
    );
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-text-muted">
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-2v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
    </span>
  );
}
