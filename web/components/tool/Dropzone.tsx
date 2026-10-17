"use client";
import { useCallback, useRef, useState } from "react";
import { formatBytes } from "@/lib/bytes";

export interface DropzoneProps {
  accept: string;
  maxSizeBytes: number | null;
  batchLimit: number;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

/** Drag-drop (files + folders), click-to-browse, Ctrl+V paste, mobile picker. */
export function Dropzone({ accept, maxSizeBytes, batchLimit, disabled, onFiles }: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Files from a drop (recursing into folders) or a plain file list. */
  const collectFiles = useCallback(async (data: DataTransfer | FileList | File[]): Promise<File[]> => {
    if (!(data instanceof DataTransfer)) return Array.from(data as FileList | File[]);
    const files: File[] = [];
    const entries: FileSystemEntry[] = [];
    for (let index = 0; index < data.items.length; index++) {
      const item = data.items[index];
      const entry = (
        item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }
      ).webkitGetAsEntry?.();
      if (entry) entries.push(entry);
      else {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    const walk = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) =>
          (entry as FileSystemFileEntry).file(resolve, reject)
        );
        files.push(file);
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const children = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          reader.readEntries(resolve, reject)
        );
        for (const child of children) await walk(child);
      }
    };
    for (const entry of entries) await walk(entry);
    return files;
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const files = await collectFiles(event.dataTransfer);
      if (files.length) onFiles(files);
    },
    [collectFiles, disabled, onFiles]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      if (disabled) return;
      const files = Array.from(event.clipboardData.files);
      if (files.length) {
        event.preventDefault();
        onFiles(files);
      }
    },
    [disabled, onFiles]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload files"
      aria-disabled={disabled}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !disabled) inputRef.current?.click();
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        dragOver ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/60"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <svg className="h-10 w-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="mt-3 font-medium text-text">{dragOver ? "Drop to add" : "Drag & drop files or folders here"}</p>
      <p className="mt-1 text-sm text-text-muted">
        or <span className="font-semibold text-primary">browse</span> · paste with Ctrl+V · camera on mobile
      </p>
      <p className="mt-2 text-xs text-text-muted">
        {maxSizeBytes ? `Max ${formatBytes(maxSizeBytes)} per file` : "Max size depends on your plan"} · up to {batchLimit} files
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept || undefined}
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onFiles(files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
