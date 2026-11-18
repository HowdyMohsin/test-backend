"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Select } from "@/components/ui/Input";
import { presetHint } from "@/lib/preset-hints";
import { defaultsOf, visible, type SourceFacts } from "@/lib/showif";
import type { Field, Preset, SettingValues } from "@/lib/types";
import { SettingField } from "./SettingField";

const OUTPUT_GROUPS = new Set(["format", "resize", "video", "audio"]);
type Tab = "output" | "rename" | "tools";
const TABS: { key: Tab; label: string }[] = [{ key: "output", label: "Output" }, { key: "rename", label: "Rename" }, { key: "tools", label: "Tools" }];

type Props = {
  fields: Field[];
  values: SettingValues;
  presets: Preset[];
  source: SourceFacts;
  namePattern: string;
  to: string;
  onChange: (key: string, value: string | number | boolean) => void;
  onPreset: (p: Preset) => void;
  onReset: () => void;
  onNamePattern: (v: string) => void;
};

export function OptionsPanel({ fields, values, presets, source, namePattern, to, onChange, onPreset, onReset, onNamePattern }: Props) {
  const [tab, setTab] = useState<Tab>("output");
  const [more, setMore] = useState(false);
  const merged = { ...defaultsOf(fields), ...values };
  const shown = fields.filter((f) => visible(f, merged, source));
  const out = shown.filter((f) => OUTPUT_GROUPS.has(f.group));
  const tools = shown.filter((f) => !OUTPUT_GROUPS.has(f.group));
  const keys = new Set(fields.map((f) => f.key));
  const active = (p: Preset) => {
    const own = Object.entries(p.settings).filter(([k]) => keys.has(k));
    return own.length > 0 && own.every(([k, v]) => String(merged[k]) === String(v));
  };
  const example = namePattern.replace("{name}", "photo").replace("{width}", "1080").replace("{height}", "720") + "." + to;

  return (
    <div>
      <div role="tablist" aria-label="Options" className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${tab === t.key ? "bg-white text-primary shadow-sm" : "text-muted hover:text-ink"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "output" && (
        <div className="mt-5 space-y-5">
          {presets.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Preset</p>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((p) => (
                  <button key={p.key} type="button" aria-pressed={active(p)} onClick={() => onPreset(p)}
                    className={`rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${active(p) ? "border-primary bg-accent-soft" : "border-line bg-white hover:border-accent/60"}`}>
                    <span className="block text-sm font-bold">{p.label.replace(/\s*\(.*\)$/, "")}</span>
                    <span className="block text-xs text-muted">{presetHint[p.key] ?? "Quick settings"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-4">
            {out.filter((f) => f.level === "basic").map((f) => <SettingField key={f.key} field={f} value={merged[f.key]} onChange={(v) => onChange(f.key, v)} />)}
          </div>
          {out.some((f) => f.level === "advanced") && (
            <div>
              <button type="button" onClick={() => setMore(!more)} className="text-sm font-bold text-primary hover:underline">{more ? "Hide more options" : "More output options"}</button>
              {more && <div className="mt-4 space-y-4">{out.filter((f) => f.level === "advanced").map((f) => <SettingField key={f.key} field={f} value={merged[f.key]} onChange={(v) => onChange(f.key, v)} />)}</div>}
            </div>
          )}
        </div>
      )}

      {tab === "rename" && (
        <div className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="opt-name" className="text-sm font-medium">File name</label>
            <Select id="opt-name" value={namePattern} onChange={(e) => onNamePattern(e.target.value)}>
              <option value="{name}">Same name as the original</option>
              <option value="{name}-converted">Original name + -converted</option>
              <option value="{name}-{width}x{height}">Original name + size</option>
            </Select>
          </div>
          <p className="rounded-xl bg-white p-3 text-sm text-muted">Example: <b className="text-ink">photo.{to}</b> becomes <b className="text-ink">{example}</b></p>
        </div>
      )}

      {tab === "tools" && (
        <div className="mt-5 space-y-4">
          {tools.length === 0 ? <p className="text-sm text-muted">There are no extra tools for this conversion.</p> : tools.map((f) => <SettingField key={f.key} field={f} value={merged[f.key]} onChange={(v) => onChange(f.key, v)} />)}
        </div>
      )}

      <button type="button" onClick={onReset} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><RotateCcw className="size-4" aria-hidden /> Reset to defaults</button>
    </div>
  );
}
