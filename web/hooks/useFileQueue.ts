"use client";
import { useCallback, useRef, useState } from "react";
import type { SettingValue } from "@/lib/api/generated";
import { probeFile } from "@/lib/probe";

export type FilePhase =
  | "added"
  | "uploading"
  | "queued"
  | "converting"
  | "done"
  | "failed"
  | "cancelled";

export interface QueueFile {
  id: string;
  file: File;
  name: string;
  size: number;
  detectedFormat: string | null;
  target: string | null;
  settings: Record<string, SettingValue>;
  phase: FilePhase;
  progress: number;
  queuePosition: number | null;
  uploadId: string | null;
  jobId: string | null;
  downloadUrl: string | null;
  outputSize: number | null;
  error: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  hasGps: boolean;
  thumbnailUrl: string | null;
}

export type FilePatch = Partial<Omit<QueueFile, "id" | "file">>;

let nextId = 1;
function makeId(): string {
  nextId += 1;
  return `file-${Date.now()}-${nextId}`;
}

function sameFile(a: File, b: QueueFile): boolean {
  return a.name === b.name && a.size === b.size && a.lastModified === b.file.lastModified;
}

export interface AddFilesResult {
  added: number;
  duplicates: number;
  queueFiles: QueueFile[];
}

/**
 * File queue state machine:
 * added -> uploading -> queued -> converting -> done | failed | cancelled
 */
export function useFileQueue(
  detectFormat: (filename: string) => string | null,
  categoryOf: (formatSlug: string | null) => string | null
) {
  const [files, setFiles] = useState<QueueFile[]>([]);
  const filesRef = useRef<QueueFile[]>([]);
  filesRef.current = files;

  const updateFile = useCallback((id: string, patch: FilePatch) => {
    setFiles((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const addFiles = useCallback(
    async (incoming: File[]): Promise<AddFilesResult> => {
      let duplicates = 0;
      const fresh: QueueFile[] = [];
      const current = filesRef.current;
      for (const file of incoming) {
        if (current.some((item) => sameFile(file, item)) || fresh.some((item) => sameFile(file, item))) {
          duplicates += 1;
          continue;
        }
        fresh.push({
          id: makeId(),
          file,
          name: file.name,
          size: file.size,
          detectedFormat: detectFormat(file.name),
          target: null,
          settings: {},
          phase: "added",
          progress: 0,
          queuePosition: null,
          uploadId: null,
          jobId: null,
          downloadUrl: null,
          outputSize: null,
          error: null,
          width: null,
          height: null,
          duration: null,
          hasGps: false,
          thumbnailUrl: null,
        });
      }
      if (fresh.length > 0) setFiles((previous) => [...previous, ...fresh]);
      // Probe thumbnails/dimensions asynchronously (best-effort).
      for (const item of fresh) {
        probeFile(item.file, item.detectedFormat, categoryOf(item.detectedFormat))
          .then((probe) => {
            if (probe.thumbnailUrl || probe.width || probe.duration || probe.hasGps) {
              updateFile(item.id, {
                width: probe.width,
                height: probe.height,
                duration: probe.duration,
                hasGps: probe.hasGps,
                thumbnailUrl: probe.thumbnailUrl,
              });
            }
          })
          .catch(() => undefined);
      }
      return { added: fresh.length, duplicates, queueFiles: fresh };
    },
    [detectFormat, categoryOf, updateFile]
  );

  /** Removes a file and returns it, so the caller can offer Undo. */
  const removeFile = useCallback((id: string): QueueFile | null => {
    let removed: QueueFile | null = null;
    setFiles((current) => {
      const found = current.find((item) => item.id === id) ?? null;
      if (found?.thumbnailUrl?.startsWith("blob:")) URL.revokeObjectURL(found.thumbnailUrl);
      removed = found;
      return current.filter((item) => item.id !== id);
    });
    return removed;
  }, []);

  const restoreFile = useCallback((queueFile: QueueFile) => {
    setFiles((current) => (current.some((item) => item.id === queueFile.id) ? current : [...current, queueFile]));
  }, []);

  const clearAll = useCallback(() => {
    setFiles((current) => {
      for (const item of current) {
        if (item.thumbnailUrl?.startsWith("blob:")) URL.revokeObjectURL(item.thumbnailUrl);
      }
      return [];
    });
  }, []);

  return { files, addFiles, removeFile, restoreFile, clearAll, updateFile, setFiles };
}
