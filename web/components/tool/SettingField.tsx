"use client";

import { Input, Select } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import type { Field } from "@/lib/types";

type Value = string | number | boolean | null | undefined;

export function SettingField({ field, value, onChange }: { field: Field; value: Value; onChange: (v: string | number | boolean) => void }) {
  const id = `opt-${field.key}`;
  let control: React.ReactNode;
  if (field.type === "boolean") {
    control = <Switch checked={value === true} onChange={onChange} label={field.label} />;
  } else if (field.type === "select") {
    control = (
      <Select id={id} value={String(value ?? field.default ?? "")} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    );
  } else if (field.type === "range") {
    control = (
      <div className="flex items-center gap-3">
        <input id={id} type="range" className="h-2 flex-1 accent-[var(--primary)]" min={field.min ?? 0} max={field.max ?? 100} step={field.step ?? 1}
          value={Number(value ?? field.default ?? 0)} onChange={(e) => onChange(Number(e.target.value))} />
        <span className="w-9 text-right text-sm font-semibold tabular-nums">{String(value ?? field.default ?? "")}</span>
      </div>
    );
  } else if (field.type === "number") {
    control = (
      <Input id={id} type="number" inputMode="decimal" min={field.min ?? undefined} max={field.max ?? undefined} step={field.step ?? 1}
        value={value === null || value === undefined ? "" : String(value)} placeholder={field.default === null ? "auto" : undefined}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
    );
  } else if (field.type === "color") {
    const transparentAllowed = field.default === "transparent";
    const v = String(value ?? field.default ?? "#ffffff");
    control = transparentAllowed ? (
      <Select id={id} value={v} onChange={(e) => onChange(e.target.value)}>
        <option value="transparent">Transparent</option>
        <option value="#ffffff">White</option>
        <option value="#000000">Black</option>
      </Select>
    ) : (
      <div className="flex items-center gap-2">
        <input id={id} type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" value={v} onChange={(e) => onChange(e.target.value)} />
        <span className="text-sm tabular-nums text-muted">{v}</span>
      </div>
    );
  } else {
    control = <Input id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
  }
  const inline = field.type === "boolean";
  return (
    <div className={inline ? "flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2" : "space-y-1.5"}>
      <label htmlFor={id} className="text-sm font-medium">{field.label}</label>
      {control}
      {field.help && !inline && <p className="text-xs text-muted">{field.help}</p>}
    </div>
  );
}
