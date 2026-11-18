"use client";

import { Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

async function readEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) return new Promise((res) => (entry as FileSystemFileEntry).file((f) => res([f]), () => res([])));
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const out: File[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((res) => reader.readEntries(res, () => res([])));
    if (!batch.length) break;
    for (const e of batch) out.push(...(await readEntry(e)));
  }
  return out;
}

async function filesFrom(dt: DataTransfer): Promise<File[]> {
  const entries = Array.from(dt.items ?? []).map((i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e);
  if (!entries.length) return Array.from(dt.files);
  return (await Promise.all(entries.map(readEntry))).flat();
}

type Props = { onFiles: (files: File[]) => void; accept?: string; title: string; hint: string; compact?: boolean; inputRef?: React.RefObject<HTMLInputElement | null> };

export function Dropzone({ onFiles, accept, title, hint, compact, inputRef }: Props) {
  const own = useRef<HTMLInputElement>(null);
  const input = inputRef ?? own;
  const [over, setOver] = useState(false);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) onFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [onFiles]);

  const drop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    onFiles(await filesFrom(e.dataTransfer));
  }, [onFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors ${compact ? "gap-2 px-4 py-4" : "min-h-[340px] gap-1 px-6 py-10"} ${over ? "border-primary bg-accent-soft" : "border-accent/40 bg-surface-2/50"}`}
    >
      <input ref={input} type="file" multiple accept={accept} className="sr-only" aria-label="Choose files" onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      {compact ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <p className="text-sm text-muted">{over ? "Drop to add" : "Drag more files here"}</p>
          <button type="button" onClick={() => input.current?.click()} className="rounded-xl border border-line bg-white px-3.5 py-1.5 text-sm font-semibold hover:border-accent">Add more files</button>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => input.current?.click()} aria-label="Choose files" className="grid size-16 place-items-center rounded-2xl bg-primary text-primary-ink shadow-lg shadow-primary/30 hover:bg-primary-hover">
            <Upload className="size-7" aria-hidden />
          </button>
          <p className="mt-4 text-xl font-extrabold tracking-tight sm:text-2xl">{over ? "Drop to add your files" : title}</p>
          <p className="max-w-sm text-sm text-muted">{hint}</p>
          <button type="button" onClick={() => input.current?.click()} className="mt-4 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-ink hover:bg-primary-hover">Choose files</button>
        </>
      )}
    </div>
  );
}
