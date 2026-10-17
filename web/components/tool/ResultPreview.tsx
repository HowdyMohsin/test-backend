"use client";
import { Modal } from "@/components/ui/Modal";
import { CompareSlider } from "./CompareSlider";
import { absoluteUrl } from "@/lib/api/client";
import { formatBytes, savingsPercent } from "@/lib/bytes";
import type { QueueFile } from "@/hooks/useFileQueue";
import type { ApiFormat } from "@/lib/api/generated";

/** Result preview modal: compare slider / player + size stats. */
export function ResultPreview({
  queueFile,
  targetFormat,
  onClose,
}: {
  queueFile: QueueFile | null;
  targetFormat: ApiFormat | null | undefined;
  onClose: () => void;
}) {
  if (!queueFile) return null;
  const downloadUrl = absoluteUrl(queueFile.downloadUrl);
  const category = targetFormat?.category ?? null;
  const savings = queueFile.outputSize ? savingsPercent(queueFile.size, queueFile.outputSize) : null;

  return (
    <Modal open onClose={onClose} title={queueFile.name}>
      {category === "image" && queueFile.thumbnailUrl && downloadUrl && (
        <CompareSlider before={queueFile.thumbnailUrl} after={downloadUrl} label={queueFile.name} />
      )}
      {(category === "audio" || category === "video") && downloadUrl && (
        <div>
          {category === "video" ? (
            <video src={downloadUrl} controls className="w-full rounded-xl" />
          ) : (
            <audio src={downloadUrl} controls className="w-full" />
          )}
        </div>
      )}
      {(!downloadUrl || !category) && <p className="text-sm text-text-muted">Preview is not available for this file.</p>}
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface-raised p-2">
          <dt className="text-[11px] text-text-muted">Before</dt>
          <dd className="text-sm font-semibold text-text">{formatBytes(queueFile.size)}</dd>
        </div>
        <div className="rounded-lg bg-surface-raised p-2">
          <dt className="text-[11px] text-text-muted">After</dt>
          <dd className="text-sm font-semibold text-text">
            {queueFile.outputSize ? formatBytes(queueFile.outputSize) : "—"}
          </dd>
        </div>
        <div className="rounded-lg bg-surface-raised p-2">
          <dt className="text-[11px] text-text-muted">Saved</dt>
          <dd className="text-sm font-semibold text-success">{savings !== null ? `${savings}%` : "—"}</dd>
        </div>
      </dl>
      {downloadUrl && (
        <a
          href={downloadUrl}
          download={queueFile.name}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast hover:bg-primary-hover"
        >
          Download
        </a>
      )}
    </Modal>
  );
}
