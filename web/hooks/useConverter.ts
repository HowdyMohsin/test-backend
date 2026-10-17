import { useCallback, useMemo, useRef, useState } from "react";
import type { QueueFile, FilePatch } from "./useFileQueue";
import { useJobPolling } from "./useJobPolling";
import {
  ApiError,
  absoluteUrl,
  cancelJob,
  createJob,
  createZip,
  errorMessage,
  uploadFile,
} from "@/lib/api/client";
import type { ApiPair } from "@/lib/api/generated";

const MAX_CONCURRENT_UPLOADS = 3;

export interface ConverterActions {
  converting: boolean;
  zipping: boolean;
  globalError: unknown;
  quotaExhausted: boolean;
  dismissGlobalError: () => void;
  convertAll: () => Promise<void>;
  retryOne: (id: string) => void;
  cancelAll: () => void;
  downloadAllZip: () => Promise<void>;
}

/**
 * Orchestrates the per-file flow: added → uploading → queued →
 * converting → done/failed/cancelled. Max 3 concurrent uploads,
 * batched status polling, output size via HEAD on the download URL.
 */
export function useConverter({
  files,
  updateFile,
  pairs,
  refreshMe,
}: {
  files: QueueFile[];
  updateFile: (id: string, patch: FilePatch) => void;
  pairs: ApiPair[] | null;
  refreshMe: () => void;
}): ConverterActions {
  const [converting, setConverting] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [globalError, setGlobalError] = useState<unknown>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const filesRef = useRef(files);
  filesRef.current = files;
  const pendingJobs = useRef(new Set<string>());

  const finishIfIdle = useCallback(() => {
    if (pendingJobs.current.size === 0) {
      setConverting(false);
      refreshMe();
    }
  }, [refreshMe]);

  const activeJobIds = useMemo(
    () =>
      files
        .filter((file) => file.jobId && (file.phase === "queued" || file.phase === "converting"))
        .map((file) => file.jobId as string),
    [files]
  );

  useJobPolling(
    activeJobIds,
    converting,
    useCallback(
      async (jobs) => {
        for (const job of jobs) {
          const file = filesRef.current.find((candidate) => candidate.jobId === job.id);
          if (!file) continue;
          if (job.status === "done") {
            let outputSize: number | null = null;
            const url = absoluteUrl(job.download_url);
            if (url) {
              try {
                const head = await fetch(url, { method: "HEAD" });
                const length = head.headers.get("content-length");
                outputSize = length ? Number.parseInt(length, 10) : null;
              } catch {
                outputSize = null;
              }
            }
            updateFile(file.id, {
              phase: "done",
              progress: 100,
              downloadUrl: job.download_url,
              outputSize,
              error: null,
            });
            pendingJobs.current.delete(job.id);
          } else if (job.status === "failed") {
            updateFile(file.id, {
              phase: "failed",
              error: job.error?.message ?? "Conversion failed.",
            });
            pendingJobs.current.delete(job.id);
          } else if (job.status === "cancelled" || job.status === "expired") {
            updateFile(file.id, { phase: "cancelled" });
            pendingJobs.current.delete(job.id);
          } else {
            updateFile(file.id, {
              phase: job.status === "processing" ? "converting" : "queued",
              progress: job.progress ?? 0,
              queuePosition: job.queue_position,
            });
          }
        }
        finishIfIdle();
      },
      [updateFile, finishIfIdle]
    )
  );

  const convertOne = useCallback(
    async (queueFile: QueueFile) => {
      try {
        updateFile(queueFile.id, { phase: "uploading", progress: 0, error: null });
        const upload = await uploadFile(queueFile.file, (percent) =>
          updateFile(queueFile.id, { progress: percent })
        );
        const afterUpload = filesRef.current.find((file) => file.id === queueFile.id);
        if (!afterUpload || afterUpload.phase === "cancelled") return;

        const patch: FilePatch = {
          uploadId: upload.upload_id,
          phase: "queued",
          progress: 100,
        };
        // Server magic-byte confirmation can differ from the extension guess.
        if (upload.detected_format && upload.detected_format !== afterUpload.detectedFormat) {
          patch.detectedFormat = upload.detected_format;
          const validTargets = (pairs ?? [])
            .filter((pair) => pair.from === upload.detected_format)
            .map((pair) => pair.to);
          if (afterUpload.target && !validTargets.includes(afterUpload.target)) {
            patch.target = null;
            patch.phase = "added";
            patch.error = `Server detected ${upload.detected_format.toUpperCase()} — please choose a target format.`;
            updateFile(queueFile.id, patch);
            return;
          }
        }
        updateFile(queueFile.id, patch);

        const latest = filesRef.current.find((file) => file.id === queueFile.id);
        const target = latest?.target;
        if (!target) {
          updateFile(queueFile.id, { phase: "added", error: "Choose a target format first." });
          return;
        }
        const job = await createJob(upload.upload_id, target, latest?.settings ?? {});
        updateFile(queueFile.id, { jobId: job.job_id });
        pendingJobs.current.add(job.job_id);
      } catch (error) {
        if (error instanceof ApiError && error.code === "quota_exhausted") {
          setQuotaExhausted(true);
        } else {
          setGlobalError(error);
        }
        updateFile(queueFile.id, { phase: "failed", error: errorMessage(error) });
      }
    },
    [pairs, updateFile]
  );

  const convertAll = useCallback(async () => {
    const todo = filesRef.current.filter(
      (file) =>
        (file.phase === "added" || file.phase === "failed") && file.target && !file.error
    );
    if (todo.length === 0 || converting) return;
    setConverting(true);
    setGlobalError(null);
    setQuotaExhausted(false);
    const queue = [...todo];
    const workers = Array.from({ length: MAX_CONCURRENT_UPLOADS }, async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (next) await convertOne(next);
      }
    });
    await Promise.all(workers);
    finishIfIdle();
  }, [converting, convertOne, finishIfIdle]);

  const retryOne = useCallback(
    (id: string) => {
      const file = filesRef.current.find((candidate) => candidate.id === id);
      if (!file) return;
      updateFile(id, {
        phase: "added",
        error: null,
        jobId: null,
        uploadId: null,
        downloadUrl: null,
        outputSize: null,
        progress: 0,
      });
      void convertOne({ ...file, phase: "added", error: null });
    },
    [convertOne, updateFile]
  );

  const cancelAll = useCallback(() => {
    const actives = filesRef.current.filter((file) =>
      ["uploading", "queued", "converting"].includes(file.phase)
    );
    for (const file of actives) {
      updateFile(file.id, { phase: "cancelled" });
      if (file.jobId) {
        pendingJobs.current.delete(file.jobId);
        void cancelJob(file.jobId).catch(() => undefined);
      }
    }
    setConverting(false);
  }, [updateFile]);

  const downloadAllZip = useCallback(async () => {
    const done = filesRef.current.filter((file) => file.phase === "done" && file.jobId);
    if (done.length < 2 || zipping) return;
    setZipping(true);
    try {
      const zip = await createZip(done.map((file) => file.jobId as string));
      const url = absoluteUrl(zip.download_url);
      if (url) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "converted.zip";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      }
    } catch (error) {
      setGlobalError(error);
    } finally {
      setZipping(false);
    }
  }, [zipping]);

  return {
    converting,
    zipping,
    globalError,
    quotaExhausted,
    dismissGlobalError: () => setGlobalError(null),
    convertAll,
    retryOne,
    cancelAll,
    downloadAllZip,
  };
}
