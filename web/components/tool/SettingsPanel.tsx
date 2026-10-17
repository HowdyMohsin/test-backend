"use client";
import { useMemo, useState } from "react";
import type { ApiFormat, SettingValue } from "@/lib/api/generated";
import { SettingField } from "./SettingField";
import { Button } from "@/components/ui/Button";

/**
 * Schema-driven options panel. Basic fields always visible,
 * the rest inside an Advanced accordion. Nothing is hardcoded —
 * every field comes from the target format's output_settings.
 */
export function SettingsPanel({
  format,
  values,
  onChange,
  onReset,
}: {
  format: ApiFormat;
  values: Record<string, SettingValue>;
  onChange: (next: Record<string, SettingValue>) => void;
  onReset: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { basic, advanced } = useMemo(() => {
    // Fields are split heuristically: the first few are "basic".
    const fields = format.output_settings;
    const basicKeys = new Set(["quality", "bitrate", "crf", "background", "width"]);
    return {
      basic: fields.filter((field) => basicKeys.has(field.key)),
      advanced: fields.filter((field) => !basicKeys.has(field.key)),
    };
  }, [format]);

  const setValue = (key: string, value: SettingValue) => {
    onChange({ ...values, [key]: value });
  };

  if (format.output_settings.length === 0) {
    return <p className="text-sm text-text-muted">No options for {format.name} — defaults are used.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(showAdvanced ? format.output_settings : basic.length ? basic : format.output_settings.slice(0, 4)).map(
          (field) => (
            <SettingField
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(value) => setValue(field.key, value)}
            />
          )
        )}
      </div>
      {advanced.length > 0 && (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setShowAdvanced((value) => !value)} aria-expanded={showAdvanced}>
            {showAdvanced ? "Hide advanced options" : `Show advanced options (${advanced.length})`}
          </Button>
          {showAdvanced && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {advanced.map((field) => (
                <SettingField
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  onChange={(value) => setValue(field.key, value)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
