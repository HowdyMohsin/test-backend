"use client";

import { AlertCircle, ArrowRight, Download, Eye, Loader2, MapPin, RotateCw, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { absolute } from "@/lib/api/client";
import type { Item } from "@/hooks/useConverter";
import { bytes, duration } from "@/lib/format";
import { FileThumb } from "./FileThumb";
import { ResultPreview } from "./ResultPreview";

type Props = {
  item: Item;
  onRemove: () => void;
  onRetry: () => void;
  onStripGps: () => void;
};

export function FileRow({ item, onRemove, onRetry, onStripGps }: Props) {
  const [open, setOpen] = useState(false);
  const { info, stage } = item;
  const saved = item.result?.size ? Math.round((1 - item.result.size / item.file.size) * 100) : null;
  const facts = [
    item.detected?.toUpperCase(),
    info?.width ? `${info.width}×${info.height}` : null,
    bytes(item.file.size),
    info?.duration ? duration(info.duration) : null,
  ].filter(Boolean);

  return (
    <li className="fade-up rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center gap-3">
        <FileThumb item={item} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={item.file.name}>{item.file.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            {facts.join(" · ")}
            {info?.has_gps && stage === "ready" && (
              <button onClick={onStripGps} className="inline-flex items-center gap-1 rounded-md bg-warn-soft px-1.5 py-0.5 font-medium text-warn hover:opacity-80">
                <MapPin className="size-3" aria-hidden /> Has location data. Remove it
              </button>
            )}
          </p>
        </div>

        {stage === "ready" && item.to && (
          <div className="hidden items-center gap-2 sm:flex">
            <ArrowRight className="size-4 text-muted" aria-hidden />
            <Badge tone="accent">{item.to.toUpperCase()}</Badge>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {stage === "uploading" && <span className="text-xs font-medium text-muted">Uploading {item.uploadPct}%</span>}
          {stage === "queued" && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted"><Loader2 className="size-3.5 animate-spin" aria-hidden />{item.queuePos && item.queuePos > 1 ? `Waiting · ${item.queuePos - 1} ahead` : "Starting"}</span>}
          {stage === "converting" && <span className="text-xs font-semibold tabular-nums text-primary">{item.progress}%</span>}
          {stage === "ready" && <Badge tone="neutral">Ready</Badge>}
          {stage === "cancelled" && <Badge tone="warn">Cancelled</Badge>}
          {stage === "done" && item.result && (
            <>
              {saved !== null && <Badge tone={saved > 0 ? "success" : "neutral"}>{saved > 0 ? `−${saved}%` : `+${Math.abs(saved)}%`}</Badge>}
              <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={open}><Eye className="size-4" aria-hidden /> <span className="hidden sm:inline">Preview</span></Button>
              <a href={absolute(item.result.download_url ?? "")} download className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-ink hover:bg-primary-hover">
                <Download className="size-4" aria-hidden /> Download
              </a>
            </>
          )}
          {(stage === "failed" || stage === "cancelled") && <Button variant="ghost" size="sm" onClick={onRetry}><RotateCw className="size-4" aria-hidden /> Retry</Button>}
          <button onClick={onRemove} aria-label={`Remove ${item.file.name}`} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"><X className="size-4" /></button>
        </div>
      </div>

      {(stage === "uploading" || stage === "converting") && <div className="mt-2"><ProgressBar value={stage === "uploading" ? item.uploadPct : item.progress} label={`${stage} ${item.file.name}`} /></div>}
      {stage === "failed" && item.error && (
        <p role="alert" className="mt-2 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />{item.error.message}</p>
      )}
      {stage === "done" && open && <ResultPreview item={item} />}
    </li>
  );
}
