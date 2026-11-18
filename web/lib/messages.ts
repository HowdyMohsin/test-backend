/** Fills a backend message template ({used}, {limit} ...) the same way the API does. */
export function renderMessage(templates: Record<string, string>, key: string, planId: string, vars: Record<string, string | number>): string {
  const text = templates[`${key}.${planId}`] ?? templates[key] ?? "";
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
