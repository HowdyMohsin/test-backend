"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFormats } from "@/hooks/useFormats";
import { usePlans } from "@/hooks/usePlans";
import { useMe } from "@/hooks/useMe";
import { useFileQueue, type QueueFile } from "@/hooks/useFileQueue";
import { useConverter } from "@/hooks/useConverter";
import { useSavedSettings } from "@/hooks/useSavedSettings";
import { slugFromExtension } from "@/lib/format-detect";
import { deleteUpload } from "@/lib/api/client";
import type { Preset, SettingValue } from "@/lib/api/generated";
import { Dropzone } from "./Dropzone";
import { TargetPicker } from "./TargetPicker";
import { PresetBar } from "./PresetBar";
import { SettingsPanel } from "./SettingsPanel";
import { FileList } from "./FileList";
import { ActionBar } from "./ActionBar";
import { ResultPreview } from "./ResultPreview";
import { UsageBanner } from "./UsageBanner";
import { ErrorBox } from "./ErrorBox";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Toast, type ToastData } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export interface ConverterToolProps {
  presetFrom?: string;
  presetTo?: string;
}

function downloadNameFor(name: string, pattern: string): string {
  if (pattern !== "converted") return name;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? `${name.slice(0, dot)}-converted${name.slice(dot)}` : `${name}-converted`;
}

/**
 * The converter tool (guide section 5). One component used on the
 * homepage and on pair pages — pair pages pass fixed from/to.
 */
export function ConverterTool({ presetFrom, presetTo }: ConverterToolProps) {
  const { formats, pairs, presets, loading: formatsLoading, error: formatsError, reload: reloadFormats } = useFormats();
  const { plans, messages } = usePlans();
  const { me, refresh: refreshMe } = useMe();
  const { load: loadSavedSettings, save: saveSavedSettings } = useSavedSettings();

  const formatBySlug = useMemo(() => new Map((formats ?? []).map((format) => [format.slug, format])), [formats]);
  const detectFormat = useCallback((filename: string) => slugFromExtension(filename, formats ?? []), [formats]);
  const categoryOf = useCallback(
    (slug: string | null) => (slug ? formatBySlug.get(slug)?.category ?? null : null),
    [formatBySlug]
  );
  const targetsFor = useCallback(
    (source: string | null) => (source ? pairs?.filter((pair) => pair.from === source).map((pair) => pair.to) ?? [] : []),
    [pairs]
  );
  const formatName = useCallback(
    (slug: string) => formatBySlug.get(slug)?.name ?? slug.toUpperCase(),
    [formatBySlug]
  );

  const { files, addFiles, removeFile, restoreFile, clearAll, updateFile } = useFileQueue(detectFormat, categoryOf);
  const { converting, zipping, globalError, quotaExhausted, dismissGlobalError, convertAll, retryOne, cancelAll, downloadAllZip } =
    useConverter({ files, updateFile, pairs: pairs ?? null, refreshMe });

  const [settingsByTarget, setSettingsByTarget] = useState<Record<string, Record<string, SettingValue>>>({});
  const [previewFile, setPreviewFile] = useState<QueueFile | null>(null);
  const [settingsFileId, setSettingsFileId] = useState<string | null>(null);
  const [namePattern, setNamePattern] = useState("original");
  const [toast, setToast] = useState<ToastData | null>(null);

  // Plan limits — all from /v1/plans, never hardcoded.
  const plan = plans.find((candidate) => candidate.id === (me?.plan ?? "anonymous")) ?? plans[0] ?? null;
  const batchLimit = plan?.limits.batch ?? 10;
  const dailyExhausted = me ? me.usage.used >= me.usage.limit : false;
  const sizeLimitMb = useCallback(
    (category: string | null) => {
      if (!plan) return null;
      if (category === "audio") return plan.limits.audio_mb ?? null;
      if (category === "video") return plan.limits.video_mb ?? null;
      return plan.limits.image_mb ?? null;
    },
    [plan]
  );

  // Bulk target: pair page fixes it; homepage derives from files.
  const detectedSources = useMemo(() => {
    const sources = new Set<string>();
    for (const file of files) if (file.detectedFormat) sources.add(file.detectedFormat);
    return Array.from(sources);
  }, [files]);
  const singleSource = presetFrom ?? (detectedSources.length === 1 ? detectedSources[0] : null);
  const [pickedTarget, setPickedTarget] = useState<string | null>(null);
  const bulkTarget = presetTo ?? pickedTarget;
  const bulkFormat = bulkTarget ? formatBySlug.get(bulkTarget) : undefined;
  const bulkPresets: Preset[] = useMemo(() => {
    if (!bulkFormat || !presets) return [];
    return presets.filter((preset) => preset.category === bulkFormat.category);
  }, [presets, bulkFormat]);

  const ensureSettings = useCallback(
    (target: string): Record<string, SettingValue> => {
      const format = formatBySlug.get(target);
      const defaults: Record<string, SettingValue> = {};
      for (const field of format?.output_settings ?? []) {
        defaults[field.key] = field.default as SettingValue;
      }
      return { ...defaults, ...loadSavedSettings(target) };
    },
    [formatBySlug, loadSavedSettings]
  );

  const applyTargetToAll = useCallback(
    (target: string) => {
      setPickedTarget(target);
      setSettingsByTarget((previous) => ({ ...previous, [target]: ensureSettings(target) }));
      for (const file of files) {
        if (targetsFor(file.detectedFormat).includes(target)) {
          updateFile(file.id, { target, error: null, settings: ensureSettings(target) });
        }
      }
    },
    [ensureSettings, files, targetsFor, updateFile]
  );

  const handleFiles = useCallback(
    async (incoming: File[]) => {
      const result = await addFiles(incoming);
      if (result.duplicates > 0) {
        setToast({
          id: Date.now(),
          message: `${result.duplicates} duplicate file${result.duplicates > 1 ? "s" : ""} skipped`,
        });
      }
      for (const queueFile of result.queueFiles) {
        if (!queueFile.detectedFormat) {
          updateFile(queueFile.id, { error: "Unknown format — this file type is not supported." });
          continue;
        }
        const category = categoryOf(queueFile.detectedFormat);
        const limitMb = sizeLimitMb(category);
        if (limitMb !== null && queueFile.size > limitMb * 1024 * 1024) {
          updateFile(queueFile.id, {
            error: `Too large — max ${limitMb} MB for ${category ?? "these"} files on your plan.`,
          });
          continue;
        }
        if (presetTo) {
          updateFile(queueFile.id, { target: presetTo, settings: ensureSettings(presetTo) });
        } else if (pickedTarget && targetsFor(queueFile.detectedFormat).includes(pickedTarget)) {
          updateFile(queueFile.id, { target: pickedTarget, settings: ensureSettings(pickedTarget) });
        }
      }
    },
    [addFiles, categoryOf, ensureSettings, pickedTarget, presetTo, sizeLimitMb, targetsFor, updateFile]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const removed = removeFile(id);
      if (!removed) return;
      if (removed.uploadId && removed.phase === "added") {
        void deleteUpload(removed.uploadId).catch(() => undefined);
      }
      setToast({
        id: Date.now(),
        message: `Removed ${removed.name}`,
        actionLabel: "Undo",
        onAction: () => restoreFile(removed),
      });
    },
    [removeFile, restoreFile]
  );

  const handleConvertAll = useCallback(() => {
    // Remember last-used values per output format.
    const targets = Array.from(new Set(files.map((file) => file.target).filter(Boolean) as string[]));
    for (const target of targets) {
      const values = settingsByTarget[target];
      if (values) saveSavedSettings(target, values);
    }
    void convertAll();
  }, [convertAll, files, settingsByTarget, saveSavedSettings]);

  const applyPreset = useCallback(
    (preset: Preset) => {
      const affected = files.filter(
        (file) => file.target && formatBySlug.get(file.target)?.category === preset.category
      );
      const targets = Array.from(new Set(affected.map((file) => file.target as string)));
      if (bulkTarget && formatBySlug.get(bulkTarget)?.category === preset.category && !targets.includes(bulkTarget)) targets.push(bulkTarget);
      for (const target of targets) {
        const merged = { ...ensureSettings(target), ...(preset.settings as Record<string, SettingValue>) };
        setSettingsByTarget((previous) => ({ ...previous, [target]: merged }));
        for (const file of files) {
          if (file.target === target) updateFile(file.id, { settings: merged });
        }
      }
    },
    [bulkTarget, ensureSettings, files, formatBySlug, updateFile]
  );

  const bulkSettings = bulkTarget ? settingsByTarget[bulkTarget] ?? ensureSettings(bulkTarget) : {};
  const setBulkSettings = useCallback(
    (next: Record<string, SettingValue>) => {
      if (!bulkTarget) return;
      setSettingsByTarget((previous) => ({ ...previous, [bulkTarget]: next }));
      for (const file of files) {
        if (file.target === bulkTarget) updateFile(file.id, { settings: next });
      }
    },
    [bulkTarget, files, updateFile]
  );

  const settingsFile = settingsFileId ? files.find((file) => file.id === settingsFileId) ?? null : null;
  const readyCount = files.filter((file) => file.target && !file.error && (file.phase === "added" || file.phase === "failed")).length;
  const doneCount = files.filter((file) => file.phase === "done").length;
  const liveMessage = files.length === 0 ? "" : `${doneCount} of ${files.length} files done`;

  // Keyboard: Ctrl/Cmd+Enter converts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !/INPUT|TEXTAREA|SELECT/.test(element.tagName)) {
        event.preventDefault();
        handleConvertAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleConvertAll]);

  const accept = useMemo(() => {
    const list = presetFrom
      ? formatBySlug.get(presetFrom)?.extensions ?? []
      : (formats ?? []).flatMap((format) => format.extensions);
    return Array.from(new Set(list)).map((extension) => `.${extension}`).join(",");
  }, [formats, formatBySlug, presetFrom]);

  if (formatsLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-surface p-12" role="status" aria-label="Loading converter">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (formatsError || !formats || !pairs) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <ErrorBox error={formatsError ?? "Could not load converter data."} onRetry={reloadFormats} title="Converter unavailable" />
      </div>
    );
  }

  const mixedSources = !presetFrom && detectedSources.length > 1;
  const unionTargets = Array.from(new Set(detectedSources.flatMap((source) => targetsFor(source))));

  return (
    <section aria-label="File converter" className="space-y-4">
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
      <UsageBanner />

      {quotaExhausted || dailyExhausted ? (
        <ErrorBox
          error={
            me
              ? `Daily limit reached (${me.usage.used}/${me.usage.limit}). Resets ${new Date(me.usage.resets_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
              : messages.quota_exceeded ?? "Daily limit reached."
          }
          title="Conversion limit reached"
        />
      ) : null}

      {globalError ? (
        <ErrorBox error={globalError} onRetry={() => void convertAll()} onDismiss={dismissGlobalError} title="Conversion error" />
      ) : null}

      {files.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <Dropzone
            accept={accept}
            maxSizeBytes={(() => {
              const limitMb = sizeLimitMb(presetFrom ? categoryOf(presetFrom) : null);
              return limitMb !== null ? limitMb * 1024 * 1024 : null;
            })()}
            batchLimit={batchLimit}
            onFiles={(incoming) => void handleFiles(incoming)}
          />
          {!me && messages.anon_teaser && (
            <p className="mt-3 text-center text-sm text-text-muted">{messages.anon_teaser}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
          {presetFrom && presetTo ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text">
                {formatName(presetFrom)} <span aria-hidden>→</span> {formatName(presetTo)}
              </p>
              <Link href="/#formats" className="text-sm font-medium text-primary hover:underline">
                Other formats
              </Link>
            </div>
          ) : singleSource ? (
            <TargetPicker
              sourceSlug={singleSource}
              targets={targetsFor(singleSource)}
              formats={formats}
              pairs={pairs}
              selected={bulkTarget}
              onSelect={applyTargetToAll}
            />
          ) : mixedSources ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-text-muted">Mixed formats — set each row below, or</span>
              <Select
                aria-label="Apply target to all files"
                value=""
                onChange={(event) => event.target.value && applyTargetToAll(event.target.value)}
                className="w-auto py-1 text-sm"
              >
                <option value="">Apply to all…</option>
                {unionTargets.map((target) => (
                  <option key={target} value={target}>
                    {formatName(target)}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {bulkTarget && bulkFormat && (
            <div className="space-y-3 border-t border-border pt-4">
              <PresetBar presets={bulkPresets} onApply={applyPreset} />
              <SettingsPanel
                format={bulkFormat}
                values={bulkSettings}
                onChange={setBulkSettings}
                onReset={() => setBulkSettings(ensureSettings(bulkTarget))}
              />
            </div>
          )}

          <FileList
            files={files}
            getTargetOptions={(queueFile) => targetsFor(queueFile.detectedFormat)}
            formatName={formatName}
            onRename={(id, name) => updateFile(id, { name })}
            onTargetChange={(id, target) => {
              const file = files.find((candidate) => candidate.id === id);
              updateFile(id, { target, error: null, settings: file ? { ...ensureSettings(target), ...file.settings } : ensureSettings(target) });
            }}
            onOpenSettings={setSettingsFileId}
            onRetry={retryOne}
            onRemove={handleRemove}
            onPreview={(id) => setPreviewFile(files.find((file) => file.id === id) ?? null)}
          />

          <ActionBar
            total={files.length}
            ready={readyCount}
            doneCount={doneCount}
            busy={converting}
            zipping={zipping}
            namePattern={namePattern}
            onNamePatternChange={setNamePattern}
            onConvert={handleConvertAll}
            onAddMore={() => document.getElementById("tool-add-more")?.click()}
            onClear={clearAll}
            onCancel={cancelAll}
            onDownloadAll={() => void downloadAllZip()}
          />
          <input
            id="tool-add-more"
            type="file"
            multiple
            accept={accept || undefined}
            className="hidden"
            aria-hidden
            tabIndex={-1}
            onChange={(event) => {
              const incoming = Array.from(event.target.files ?? []);
              if (incoming.length) void handleFiles(incoming);
              event.target.value = "";
            }}
          />
        </div>
      )}

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <ResultPreview
        queueFile={previewFile ? { ...previewFile, name: downloadNameFor(previewFile.name, namePattern) } : null}
        targetFormat={previewFile?.target ? formatBySlug.get(previewFile.target) : undefined}
        onClose={() => setPreviewFile(null)}
      />

      <Modal open={settingsFile !== null} onClose={() => setSettingsFileId(null)} title={`Options — ${settingsFile?.name ?? ""}`}>
        {settingsFile?.target && formatBySlug.get(settingsFile.target) ? (
          <SettingsPanel
            format={formatBySlug.get(settingsFile.target)!}
            values={settingsFile.settings}
            onChange={(next) => updateFile(settingsFile.id, { settings: next })}
            onReset={() => updateFile(settingsFile.id, { settings: ensureSettings(settingsFile.target as string) })}
          />
        ) : (
          <EmptyState title="No target yet" hint="Choose a target format for this file first." />
        )}
      </Modal>
    </section>
  );
}
