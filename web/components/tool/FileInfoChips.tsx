import { Badge } from "@/components/ui/Badge";
import { formatBytes } from "@/lib/bytes";
import type { QueueFile } from "@/hooks/useFileQueue";

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Info chips: format, dimensions, size, duration, GPS warning. */
export function FileInfoChips({ queueFile }: { queueFile: QueueFile }) {
  const duration = formatDuration(queueFile.duration);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {queueFile.detectedFormat && <Badge tone="neutral">{queueFile.detectedFormat.toUpperCase()}</Badge>}
      {queueFile.width && queueFile.height && (
        <Badge tone="neutral">
          {queueFile.width}×{queueFile.height}
        </Badge>
      )}
      <Badge tone="neutral">{formatBytes(queueFile.size)}</Badge>
      {duration && <Badge tone="neutral">{duration}</Badge>}
      {queueFile.hasGps && (
        <Badge tone="warning" >
          <span title="This photo contains location data. Use Remove metadata to strip it.">
            Location data
          </span>
        </Badge>
      )}
    </div>
  );
}
