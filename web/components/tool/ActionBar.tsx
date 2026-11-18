"use client";

import { Archive, ArrowRightLeft, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  ready: number;
  done: number;
  total: number;
  running: boolean;
  uploading: boolean;
  onConvert: () => void;
  onCancel: () => void;
  onClear: () => void;
  onZip: () => void;
};

export function ActionBar({ ready, done, total, running, uploading, onConvert, onCancel, onClear, onZip }: Props) {
  const allDone = total > 0 && done === total;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {running ? (
        <Button size="lg" variant="secondary" onClick={onCancel}><Square className="size-4" aria-hidden /> Stop</Button>
      ) : allDone ? (
        <Button size="lg" onClick={onClear}><ArrowRightLeft className="size-4" aria-hidden /> Convert more files</Button>
      ) : (
        <Button size="lg" onClick={onConvert} disabled={ready === 0} title={uploading ? "Files are still uploading" : undefined}>
          {ready > 0 ? `Convert ${ready} ${ready === 1 ? "file" : "files"}` : uploading ? "Uploading…" : "Convert"}
        </Button>
      )}
      {done >= 2 && <Button size="lg" variant="secondary" onClick={onZip}><Archive className="size-4" aria-hidden /> Download all (ZIP)</Button>}
      {!allDone && <Button variant="ghost" onClick={onClear}><Trash2 className="size-4" aria-hidden /> Clear all</Button>}
    </div>
  );
}
