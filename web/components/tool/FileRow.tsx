"use client";
import { useState } from "react";
import type { QueueFile, FilePhase } from "@/hooks/useFileQueue";
import { FileThumb } from "./FileThumb";
import { FileInfoChips } from "./FileInfoChips";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { IconButton } from "@/components/ui/IconButton";
import { absoluteUrl } from "@/lib/api/client";
import { formatBytes, savingsPercent } from "@/lib/bytes";

const PHASE_TONE: Record<FilePhase, "info" | "success" | "warning" | "danger" | "neutral"> = {
  added: "neutral",
  uploading: "info",
  queued: "info",
  converting: "info",
  done: "success",
  failed: "danger",
  cancelled: "warning",
};

const PHASE_LABEL: Record<FilePhase, string> = {
  added: "Waiting",
  uploading: "Uploading",
  queued: "Queued",
  converting: "Converting",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

function statusText(queueFile: QueueFile): string {
  switch (queueFile.phase) {
    case "uploading":
      return `Uploading ${queueFile.progress}%`;
    case "queued":
      return queueFile.queuePosition ? `Queued #${queueFile.queuePosition}` : "Queued";
    case "converting":
      return `Converting ${Math.round(queueFile.progress)}%`;
    default:
      return PHASE_LABEL[queueFile.phase];
  }
}

export interface FileRowProps {
  queueFile: QueueFile;
  targetOptions: string[];
  formatName: (slug: string) => string;
  onRename: (id: string, name: string) => void;
  onTargetChange: (id: string, target: string) => void;
  onOpenSettings: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onPreview: (id: string) => void;
}

/** One file row: thumbnail, rename, chips, target, status, actions. */
export function FileRow({
  queueFile,
  targetOptions,
  formatName,
  onRename,
  onTargetChange,
  onOpenSettings,
  onRetry,
  onRemove,
  onPreview,
}: FileRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(queueFile.name);
  const busy = queueFile.phase === "uploading" || queueFile.phase === "converting" || queueFile.phase === "queued";
  const savings = queueFile.outputSize ? savingsPercent(queueFile.size, queueFile.outputSize) : null;
  const downloadUrl = absoluteUrl(queueFile.downloadUrl);

  const commitRename = () => {
    setEditing(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== queueFile.name) onRename(queueFile.id, trimmed);
    else setDraftName(queueFile.name);
  };

  return (
    <div className={`rounded-xl border p-3 ${queueFile.error ? "border-danger/50 bg-danger/5" : "border-border bg-surface"}`}>
      <div className="flex items-start gap-3">
        <FileThumb queueFile={queueFile} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRename();
                if (event.key === "Escape") {
                  setDraftName(queueFile.name);
                  setEditing(false);
                }
              }}
              className="w-full rounded border border-accent bg-surface px-1.5 py-0.5 text-sm font-medium text-text"
              aria-label="Rename file"
            />
          ) : (
            <button
              onClick={() => !busy && setEditing(true)}
              className="block max-w-full truncate text-left text-sm font-medium text-text hover:text-primary"
              title={busy ? queueFile.name : "Click to rename"}
            >
              {queueFile.name}
            </button>
          )}
          <div className="mt-1.5">
            <FileInfoChips queueFile={queueFile} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-muted" aria-hidden>→</span>
            <Select
              aria-label={`Convert ${queueFile.name} to`}
              value={queueFile.target ?? ""}
              disabled={busy || targetOptions.length === 0}
              onChange={(event) => onTargetChange(queueFile.id, event.target.value)}
              className="w-auto min-w-[8rem] py-1 text-xs"
            >
              <option value="" disabled>
                {targetOptions.length === 0 ? "No converter" : "Choose format"}
              </option>
              {targetOptions.map((target) => (
                <option key={target} value={target}>
                  {formatName(target)}
                </option>
              ))}
            </Select>
            <Badge tone={PHASE_TONE[queueFile.phase]}>{statusText(queueFile)}</Badge>
            {savings !== null && <Badge tone="success">−{savings}%</Badge>}
          </div>
          {(queueFile.phase === "uploading" || queueFile.phase === "converting") && (
            <div className="mt-2" aria-live="polite">
              <ProgressBar value={queueFile.progress} />
            </div>
          )}
          {queueFile.error && (
            <p className="mt-2 text-xs text-danger" role="alert">
              {queueFile.error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {queueFile.phase === "done" && downloadUrl && (
            <a
              href={downloadUrl}
              download={queueFile.name}
              className="inline-flex items-center justify-center rounded-lg p-2 text-primary hover:bg-primary/10"
              aria-label={`Download ${queueFile.name}`}
              title="Download"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            </a>
          )}
          {(queueFile.phase === "done") && (
            <IconButton label="Preview result" onClick={() => onPreview(queueFile.id)}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </IconButton>
          )}
          {!busy && queueFile.phase !== "done" && (
            <IconButton label="Settings for this file" onClick={() => onOpenSettings(queueFile.id)}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.297 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </IconButton>
          )}
          {queueFile.phase === "failed" && (
            <IconButton label="Retry" onClick={() => onRetry(queueFile.id)}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            </IconButton>
          )}
          {!busy && (
            <IconButton label="Remove file" onClick={() => onRemove(queueFile.id)}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            </IconButton>
          )}
        </div>
      </div>
    </div>
  );
}
