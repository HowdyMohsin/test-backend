import type { Field, SettingValues } from "./types";

export type SourceFacts = { alpha: boolean; animated: boolean };

/** Tiny condition language from the backend: key=value | key!=value | key in a,b | source.alpha */
export function visible(field: Field, values: SettingValues, source: SourceFacts): boolean {
  const expr = field.show_if;
  if (!expr) return true;
  if (expr === "source.alpha") return source.alpha;
  if (expr === "source.animated") return source.animated;
  const inMatch = expr.match(/^(\w+) in (.+)$/);
  if (inMatch) return inMatch[2].split(",").includes(String(values[inMatch[1]] ?? ""));
  const ne = expr.match(/^(\w+)!=(.+)$/);
  if (ne) return String(values[ne[1]] ?? "") !== ne[2];
  const eq = expr.match(/^(\w+)=(.+)$/);
  if (eq) return String(values[eq[1]] ?? "") === eq[2];
  return true;
}

export function defaultsOf(fields: Field[]): SettingValues {
  const out: SettingValues = {};
  for (const f of fields) if (f.default !== null && f.default !== undefined) out[f.key] = f.default;
  return out;
}
