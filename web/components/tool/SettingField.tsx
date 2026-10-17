"use client";
import type { SettingField as FieldSchema, SettingValue } from "@/lib/api/generated";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { NumberInput } from "@/components/ui/NumberInput";
import { Switch } from "@/components/ui/Switch";
import { ColorInput } from "@/components/ui/ColorInput";

/** One schema-driven option field. Unknown types fall back to text. */
export function SettingField({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: SettingValue | undefined;
  onChange: (value: SettingValue) => void;
}) {
  const current: SettingValue =
    value !== undefined ? value : (field.default as SettingValue);

  const labeled = (control: React.ReactNode) => (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted" title={field.help || undefined}>
          {field.label}
        </span>
        {(field.type === "range" || field.type === "number") && (
          <span className="text-xs text-text-muted">{String(current)}</span>
        )}
      </div>
      {control}
      {field.help && <p className="mt-0.5 text-[11px] text-text-muted">{field.help}</p>}
    </div>
  );

  switch (field.type) {
    case "select":
      return labeled(
        <Select value={String(current)} onChange={(e) => onChange(e.target.value)} aria-label={field.label}>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      );
    case "range":
      return labeled(
        <Slider
          label={field.label}
          value={Number(current) || 0}
          min={field.min ?? 0}
          max={field.max ?? 100}
          onChange={(next) => onChange(next)}
        />
      );
    case "number":
      return labeled(
        <NumberInput
          aria-label={field.label}
          value={Number(current) || 0}
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "boolean":
      return (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-text-muted" title={field.help || undefined}>
            {field.label}
          </span>
          <Switch label={field.label} checked={Boolean(current)} onChange={onChange} />
        </div>
      );
    case "color":
      return labeled(
        <ColorInput label={field.label} value={String(current)} onChange={onChange} />
      );
    default:
      return labeled(
        <input
          type="text"
          aria-label={field.label}
          value={String(current ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        />
      );
  }
}
