"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, downloadZip, uploadFile } from "@/lib/api/client";
import { useApp } from "@/lib/app-context";
import { bytes, extOf } from "@/lib/format";
import { renderMessage } from "@/lib/messages";
import { defaultsOf } from "@/lib/showif";
import type { Category, Field, FileInfo, JobStatus, SettingValues } from "@/lib/types";
import { useSavedSettings } from "./useSavedSettings";

export type Notice = { reason: string; message: string };
export type Stage = "uploading" | "ready" | "queued" | "converting" | "done" | "failed" | "cancelled";
export type Item = {
  id: string;
  file: File;
  stage: Stage;
  uploadPct: number;
  uploadId?: string;
  detected?: string;
  category?: Category;
  info?: FileInfo;
  targets?: string[];
  to?: string;
  jobId?: string;
  progress: number;
  queuePos: number | null;
  result?: JobStatus;
  error?: { code: string | null; message: string };
  notes: string[];
  previewUrl?: string;
};

const MB = 1024 * 1024;
const BROWSER_IMAGE = /^image\/(jpeg|png|webp|avif|gif|svg\+xml)$/;
const ACTIVE: Stage[] = ["uploading", "queued", "converting"];

export function useConverter(opts: { lockedFrom?: string; lockedTo?: string }) {
  const app = useApp();
  const { catalog, me, plans, refreshMe, site } = app;
  const [items, setItems] = useState<Item[]>([]);
  const [globalTo, setGlobalTo] = useState<string | null>(opts.lockedTo ?? null);
  const [namePattern, setNamePattern] = useState("{name}");
  const saved = useSavedSettings();
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const aborts = useRef(new Map<string, AbortController>());
  const [notice, setNotice] = useState<Notice | null>(null);
  const templates = useRef<Record<string, string>>({});

  useEffect(() => {
    api.plans().then((p) => (templates.current = p.messages)).catch(() => undefined);
  }, []);

  const patch = useCallback((id: string, change: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...change } : i))), []);
  const planId = me?.plan.id ?? "anonymous";
  const nextPlan = plans.find((p) => p.id === ({ anonymous: "free", free: "basic", basic: "pro" } as Record<string, string>)[planId]);

  const pickTarget = useCallback(
    (targets: string[], detected: string, current?: string | null): string | undefined => {
      if (opts.lockedTo && targets.includes(opts.lockedTo)) return opts.lockedTo;
      if (current && targets.includes(current)) return current;
      const dflt = catalog?.formats.find((f) => f.slug === detected)?.default_target;
      return dflt && targets.includes(dflt) ? dflt : targets[0];
    },
    [catalog, opts.lockedTo],
  );

  const handleLimitError = useCallback(
    (err: ApiError): boolean => {
      const reason: Record<string, string> = { quota_exceeded: "quota", file_too_large: "size", duration_limit: "duration", batch_too_large: "batch", plan_required: "plan", login_required: "login", maintenance: "info" };
      if (!reason[err.code]) return false;
      setNotice({ reason: reason[err.code], message: err.message });
      return true;
    },
    [],
  );

  const startUpload = useCallback(
    async (item: Item) => {
      const ctrl = new AbortController();
      aborts.current.set(item.id, ctrl);
      try {
        const res = await uploadFile(item.file, (pct) => patch(item.id, { uploadPct: pct }), ctrl.signal);
        if (opts.lockedFrom && res.detected_format !== opts.lockedFrom) {
          api.removeUpload(res.upload_id).catch(() => undefined);
          patch(item.id, {
            stage: "failed",
            error: { code: "wrong_format", message: `This page converts ${opts.lockedFrom.toUpperCase()} files, but this file is ${res.detected_format.toUpperCase()}. Use the ${res.detected_format.toUpperCase()} converter instead.` },
          });
          return;
        }
        const to = pickTarget(res.targets, res.detected_format, globalTo);
        patch(item.id, { stage: "ready", uploadPct: 100, uploadId: res.upload_id, detected: res.detected_format, category: res.category, info: res.info, targets: res.targets, to });
        if (!opts.lockedTo && !globalTo && to) setGlobalTo(to);
      } catch (e) {
        if (e instanceof ApiError && e.code === "aborted") return;
        const err = e instanceof ApiError ? e : new ApiError("network", "Upload failed. Please try again.", 0);
        patch(item.id, { stage: "failed", error: { code: err.code, message: err.message } });
        handleLimitError(err);
      } finally {
        aborts.current.delete(item.id);
      }
    },
    [globalTo, handleLimitError, opts.lockedFrom, opts.lockedTo, patch, pickTarget],
  );

  const addFiles = useCallback(
    (incoming: File[]) => {
      if (!incoming.length) return;
      const maxBatch = me?.limits.max_batch ?? 1000;
      const live = itemsRef.current.filter((i) => i.stage !== "failed" && i.stage !== "cancelled").length;
      let room = Math.max(0, maxBatch - live);
      const accepted: File[] = [];
      let refusedBatch = false;
      let sizeNotice: string | null = null;
      const fresh: Item[] = [];
      for (const file of incoming) {
        const dup = itemsRef.current.some((i) => i.file.name === file.name && i.file.size === file.size && i.file.lastModified === file.lastModified);
        if (dup) continue;
        if (room <= 0) {
          refusedBatch = true;
          continue;
        }
        const cat = catalog?.formats.find((f) => f.extensions.includes(extOf(file.name)))?.category;
        const limitMb = cat && me ? me.limits[`max_${cat}_mb` as "max_image_mb"] : undefined;
        const base: Item = { id: crypto.randomUUID(), file, stage: "uploading", uploadPct: 0, progress: 0, queuePos: null, notes: [] };
        if (BROWSER_IMAGE.test(file.type)) base.previewUrl = URL.createObjectURL(file);
        if (limitMb && file.size > limitMb * MB) {
          const msg = renderMessage(templates.current, "size_hit", planId, {
            size: bytes(file.size),
            max: bytes(limitMb * MB),
            next_max: nextPlan ? bytes(nextPlan.limits[`max_${cat}_mb` as "max_image_mb"] * MB) : "",
          });
          fresh.push({ ...base, stage: "failed", error: { code: "file_too_large", message: msg || "This file is larger than your plan allows." } });
          sizeNotice ??= msg;
          continue;
        }
        room -= 1;
        accepted.push(file);
        fresh.push(base);
      }
      if (!fresh.length && !refusedBatch) return;
      setItems((list) => [...list, ...fresh]);
      fresh.filter((i) => i.stage === "uploading").forEach((i, n) => setTimeout(() => startUpload(i), n * 80));
      if (sizeNotice) setNotice({ reason: "size", message: sizeNotice });
      else if (refusedBatch) {
        const msg = renderMessage(templates.current, "batch_hit", planId, { limit: maxBatch, next_limit: nextPlan?.limits.max_batch ?? "" });
        setNotice({ reason: "batch", message: msg || `You can convert up to ${maxBatch} files at once.` });
      }
    },
    [catalog, me, nextPlan, planId, startUpload],
  );

  const remove = useCallback((id: string) => {
    const it = itemsRef.current.find((i) => i.id === id);
    aborts.current.get(id)?.abort();
    if (it?.uploadId && it.stage !== "queued" && it.stage !== "converting") api.removeUpload(it.uploadId).catch(() => undefined);
    if (it?.jobId && (it.stage === "queued" || it.stage === "converting")) api.cancel(it.jobId).catch(() => undefined);
    if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
    setItems((list) => list.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => {
    itemsRef.current.forEach((i) => remove(i.id));
    setGlobalTo(opts.lockedTo ?? null);
  }, [opts.lockedTo, remove]);

  const setTarget = useCallback((id: string, to: string) => patch(id, { to }), [patch]);
  const chooseGlobalTarget = useCallback((to: string) => {
    setGlobalTo(to);
    setItems((list) => list.map((i) => (i.stage === "ready" && i.targets?.includes(to) ? { ...i, to } : i)));
  }, []);

  const fieldsFor = useCallback(
    (from: string, to: string): Field[] => {
      const src = catalog?.formats.find((f) => f.slug === from);
      const dst = catalog?.formats.find((f) => f.slug === to);
      const pair = catalog?.pairs.find((p) => p.from === from && p.to === to);
      return [...(src?.input_settings ?? []), ...(pair?.settings_override ?? dst?.output_settings ?? [])];
    },
    [catalog],
  );

  const sendOne = useCallback(
    async (it: Item, batchId: string): Promise<"ok" | "stop"> => {
      if (!it.uploadId || !it.detected || !it.to) return "ok";
      const fields = fieldsFor(it.detected, it.to);
      const defaults = defaultsOf(fields);
      const chosen = saved.store[it.to] ?? {};
      const settings: SettingValues = {};
      for (const f of fields) if (chosen[f.key] !== undefined && chosen[f.key] !== defaults[f.key]) settings[f.key] = chosen[f.key];
      patch(it.id, { stage: "queued", error: undefined, notes: [] });
      try {
        const { job_id } = await api.convert({ upload_id: it.uploadId, to: it.to, settings, batch_id: batchId, name_pattern: namePattern });
        patch(it.id, { jobId: job_id, stage: "queued" });
        return "ok";
      } catch (e) {
        const err = e instanceof ApiError ? e : new ApiError("network", "Cannot reach the server.", 0);
        if (["quota_exceeded", "batch_too_large", "plan_required", "login_required", "maintenance"].includes(err.code)) {
          patch(it.id, { stage: "ready" });
          handleLimitError(err);
          return "stop";
        }
        patch(it.id, { stage: "failed", error: { code: err.code, message: err.message } });
        return "ok";
      }
    },
    [fieldsFor, handleLimitError, namePattern, patch, saved.store],
  );

  const convertAll = useCallback(async () => {
    if (site?.maintenance.enabled) return setNotice({ reason: "info", message: site.maintenance.message ?? "Conversions are paused for maintenance." });
    setNotice(null);
    const batchId = crypto.randomUUID();
    for (const it of itemsRef.current.filter((i) => i.stage === "ready")) {
      if ((await sendOne(it, batchId)) === "stop") break;
    }
  }, [sendOne, site]);

  const retry = useCallback(
    async (id: string) => {
      const it = itemsRef.current.find((i) => i.id === id);
      if (!it) return;
      if (!it.uploadId || it.error?.code === "upload_expired") {
        patch(id, { stage: "uploading", uploadPct: 0, error: undefined });
        return startUpload({ ...it, stage: "uploading" });
      }
      await sendOne(it, crypto.randomUUID());
    },
    [patch, sendOne, startUpload],
  );

  const cancelAll = useCallback(() => {
    for (const it of itemsRef.current) {
      if (it.stage === "uploading") {
        aborts.current.get(it.id)?.abort();
        patch(it.id, { stage: "cancelled" });
      } else if ((it.stage === "queued" || it.stage === "converting") && it.jobId) {
        api.cancel(it.jobId).catch(() => undefined);
        patch(it.id, { stage: "cancelled" });
      }
    }
  }, [patch]);

  // Poll job status while anything is running.
  const running = items.some((i) => (i.stage === "queued" || i.stage === "converting") && i.jobId);
  useEffect(() => {
    if (!running) return;
    let stopped = false;
    const tick = async () => {
      const ids = itemsRef.current.filter((i) => (i.stage === "queued" || i.stage === "converting") && i.jobId).map((i) => i.jobId as string);
      if (!ids.length) return;
      try {
        const { jobs } = await api.jobs(ids);
        if (stopped) return;
        const justDone = jobs.filter((j) => j.status === "done" && itemsRef.current.some((i) => i.jobId === j.id && i.stage !== "done" && i.stage !== "cancelled"));
        setItems((list) =>
          list.map((i) => {
            const j = jobs.find((x) => x.id === i.jobId);
            if (!j || i.stage === "cancelled") return i;
            if (j.status === "done") return { ...i, stage: "done", progress: 100, result: j, notes: j.notes };
            if (j.status === "failed" || j.status === "expired")
              return { ...i, stage: "failed", error: { code: j.error?.code ?? "expired", message: j.error?.message ?? "This file expired. Please convert it again." } };
            if (j.status === "cancelled") return { ...i, stage: "cancelled" };
            return { ...i, stage: j.status === "processing" ? "converting" : "queued", progress: j.progress, queuePos: j.queue_position };
          }),
        );
        if (justDone.length) afterSuccess();
      } catch {
        /* a missed poll is harmless; the next one catches up */
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => {
      stopped = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const afterSuccess = useCallback(() => {
    refreshMe();
  }, [refreshMe]);

  // Warn before closing the tab while work is in progress.
  const active = items.some((i) => ACTIVE.includes(i.stage));
  useEffect(() => {
    if (!active) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [active]);

  const doneItems = useMemo(() => items.filter((i) => i.stage === "done"), [items]);
  const readyItems = useMemo(() => items.filter((i) => i.stage === "ready" && i.to), [items]);
  const zip = useCallback(async () => {
    try {
      await downloadZip(doneItems.map((i) => i.jobId as string), "converted-files");
    } catch (e) {
      setNotice({ reason: "info", message: e instanceof ApiError ? e.message : "Could not create the ZIP file." });
    }
  }, [doneItems]);

  return {
    notice, clearNotice: () => setNotice(null), items, addFiles, remove, clear, setTarget, globalTo, chooseGlobalTarget, namePattern, setNamePattern,
    convertAll, retry, cancelAll, zip, doneItems, readyItems, active, saved, fieldsFor,
    uploading: items.some((i) => i.stage === "uploading"),
    running,
  };
}
