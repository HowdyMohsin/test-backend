"use client";

import { useMemo, useRef } from "react";
import { useConverter } from "@/hooks/useConverter";
import { useApp } from "@/lib/app-context";
import type { Field, Preset } from "@/lib/types";
import { ActionBar } from "./ActionBar";
import { Dropzone } from "./Dropzone";
import { ErrorBox } from "./ErrorBox";
import { FileList } from "./FileList";
import { LimitNotice } from "./LimitNotice";
import { OptionsPanel } from "./OptionsPanel";
import { UsageBanner } from "./UsageBanner";

/** The converter on every format page. Source and target are fixed by the page. */
export function ConverterTool({ lockedFrom, lockedTo }: { lockedFrom: string; lockedTo: string }) {
  const { catalog, me, site, apiDown, formatBy } = useApp();
  const conv = useConverter({ lockedFrom, lockedTo });
  const input = useRef<HTMLInputElement>(null);
  const { items, saved } = conv;
  const src = formatBy(lockedFrom);
  const dst = formatBy(lockedTo);

  const fields: Field[] = useMemo(() => {
    const pair = catalog?.pairs.find((p) => p.from === lockedFrom && p.to === lockedTo);
    return [...(src?.input_settings ?? []), ...(pair?.settings_override ?? dst?.output_settings ?? [])];
  }, [catalog, lockedFrom, lockedTo, src, dst]);

  const values = saved.store[lockedTo] ?? {};
  const presets = dst ? catalog?.presets[dst.category] ?? [] : [];
  const first = items.find((i) => i.info)?.info;
  const maxBatch = me?.limits.max_batch ?? 10;
  const maxMb = me ? Math.max(me.limits.max_image_mb, me.limits.max_audio_mb) : 200;
  const S = lockedFrom.toUpperCase();
  const hint = `Up to ${maxBatch} files at once, ${maxMb >= 1024 ? `${maxMb / 1024} GB` : `${maxMb} MB`} each. You can also paste an image with Ctrl+V.`;
  const accept = src ? src.extensions.map((e) => `.${e}`).join(",") : undefined;

  const applyPreset = (p: Preset) => {
    const ok = new Set(fields.map((f) => f.key));
    saved.setMany(lockedTo, Object.fromEntries(Object.entries(p.settings).filter(([k]) => ok.has(k))));
  };

  return (
    <section id="tool" aria-label="File converter" className="overflow-hidden rounded-[24px] border border-line bg-white shadow-[var(--shadow-card)]">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="p-5 sm:p-7">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-extrabold tracking-tight">Your files</h2>
            <span className="text-sm text-muted">{items.length === 0 ? "No files yet" : `${items.length} ${items.length === 1 ? "file" : "files"}`}</span>
          </div>
          {apiDown && <div className="mt-4"><ErrorBox title="Cannot reach the converter">We are trying again. If this stays, check your connection and refresh.</ErrorBox></div>}
          {site?.maintenance.enabled && <div className="mt-4"><ErrorBox tone="warn" title="Conversions are paused">{site.maintenance.message ?? "We are doing maintenance and will be back shortly."}</ErrorBox></div>}
          <div className="mt-4">
            {items.length === 0 ? (
              <Dropzone onFiles={conv.addFiles} accept={accept} inputRef={input} title={`Drag and drop ${S} files here`} hint={hint} />
            ) : (
              <div className="space-y-3">
                <FileList items={items} onRemove={conv.remove} onRetry={conv.retry} onStripGps={() => saved.setValue(lockedTo, "metadata", "strip_gps")} />
                <Dropzone compact onFiles={conv.addFiles} accept={accept} inputRef={input} title="" hint="" />
              </div>
            )}
          </div>
          {conv.notice && <div className="mt-4"><LimitNotice notice={conv.notice} onClose={conv.clearNotice} /></div>}
          {items.length > 0 && (
            <div className="mt-5">
              <ActionBar ready={conv.readyItems.length} done={conv.doneItems.length} total={items.length} running={conv.running} uploading={conv.uploading}
                onConvert={conv.convertAll} onCancel={conv.cancelAll} onClear={conv.clear} onZip={conv.zip} />
            </div>
          )}
          {!conv.notice && <div className="mt-4"><UsageBanner /></div>}
        </div>
        <aside className="border-t border-line bg-surface-2/50 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <OptionsPanel fields={fields} values={values} presets={presets} source={{ alpha: !!first?.has_alpha, animated: !!first?.animated }} namePattern={conv.namePattern} to={lockedTo}
            onChange={(k, v) => saved.setValue(lockedTo, k, v)} onPreset={applyPreset} onReset={() => saved.reset(lockedTo)} onNamePattern={conv.setNamePattern} />
        </aside>
      </div>
    </section>
  );
}
