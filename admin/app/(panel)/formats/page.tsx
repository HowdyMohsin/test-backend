"use client";

import { Play, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, Loading, PageHeader, StatCard, Table, ago } from "@/components/data/Bits";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useLoad } from "@/hooks/useLoad";
import { useToast } from "@/hooks/useToast";
import { ApiError, adminApi } from "@/lib/api";

type Pair = { slug: string; from: string; to: string; route: string; label: string | null; status: string; visible: boolean; plans: string[]; pinned: boolean; note: string | null; last_check_at: string | null; has_sample: boolean };
type Fmt = { slug: string; name: string; category: string; subgroup: string | null; visible: boolean; has_sample: boolean };
type Data = { formats: Fmt[]; pairs: Pair[] };
type Check = { running: boolean; done: number; total: number; last: { finished_at: string; total: number; passed: number; failed: number; skipped: number } | null };
type PresetRow = { id: number; category: string; key: string; label: string; settings: Record<string, unknown>; enabled: boolean; sort: number };


export default function FormatsPage() {
  const toast = useToast();
  const { data, error, setData, reload } = useLoad<Data>("/formats");
  const check = useLoad<Check>("/formats/selfcheck", 2000);
  const presets = useLoad<{ presets: PresetRow[] }>("/formats/presets");
  const [view, setView] = useState<"pairs" | "formats" | "presets">("pairs");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [cat, setCat] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const catOf = useMemo(() => new Map((data?.formats ?? []).map((f) => [f.slug, f.subgroup === "raw" ? "raw" : f.category])), [data]);

  const wasRunning = check.data?.running;
  useEffect(() => { if (wasRunning === false) reload(true); }, [wasRunning, reload]);

  if (!data) return <Loading error={error} />;
  const counts = { live: 0, testing: 0, broken: 0 } as Record<string, number>;
  data.pairs.forEach((p) => (counts[p.status] = (counts[p.status] ?? 0) + 1));
  const rows = data.pairs.filter((p) => (!q || p.slug.includes(q.toLowerCase())) && (!status || p.status === status) && (!cat || catOf.get(p.from) === cat));

  async function patch(key: string, change: Partial<Pair>) {
    setData((d) => d && { ...d, pairs: d.pairs.map((p) => (p.slug === key ? { ...p, ...change } : p)) });
    try { await adminApi.patch("/formats/state", { key, ...change }); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not save.", true); reload(true); }
  }
  async function patchFormat(slug: string, visible: boolean) {
    setData((d) => d && { ...d, formats: d.formats.map((f) => (f.slug === slug ? { ...f, visible } : f)) });
    try { await adminApi.patch("/formats/state", { key: slug, visible }); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not save.", true); reload(true); }
  }
  async function run(pairs?: string[]) {
    try { await adminApi.post("/formats/selfcheck", { pairs }); toast(`Check started for ${pairs?.length ?? data!.pairs.length} converters.`); check.reload(true); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not start.", true); }
  }
  const c = check.data;

  return (
    <>
      <PageHeader title="Formats" subtitle="A converter appears on the site only when it is Live and visible. Live is set by the accuracy check.">
        <Button variant="secondary" disabled={!picked.size || !!c?.running} onClick={() => run([...picked])}><Play className="size-4" aria-hidden /> Check selected ({picked.size})</Button>
        <Button disabled={!!c?.running} onClick={() => run()}><Play className="size-4" aria-hidden /> Check all {data.pairs.length}</Button>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Live" value={counts.live} tone="success" />
        <StatCard label="Testing" value={counts.testing} hint="Waiting for a check or a sample file" />
        <StatCard label="Broken" value={counts.broken} tone={counts.broken ? "danger" : undefined} />
        <StatCard label="Last check run" value={c?.last ? `${c.last.passed} of ${c.last.total} passed` : "Not run"} hint={c?.running ? `Running: ${c.done} of ${c.total}…` : c?.last ? `${c.last.failed} failed, ${c.last.skipped} skipped, ${ago(c.last.finished_at)}` : undefined} />
      </div>
      <div className="mt-6 flex gap-2" role="tablist">
        {(["pairs", "formats", "presets"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize ${view === v ? "bg-primary text-primary-ink" : "bg-surface-2 text-muted hover:text-ink"}`}>{v === "pairs" ? `Converters (${data.pairs.length})` : v === "formats" ? `Formats (${data.formats.length})` : "Presets"}</button>
        ))}
      </div>

      {view === "pairs" && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Input className="max-w-56" placeholder="Search, e.g. png-to" aria-label="Search converters" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select className="max-w-40" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="live">Live</option><option value="testing">Testing</option><option value="broken">Broken</option></Select>
            <Select className="max-w-40" aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option><option value="image">Images</option><option value="raw">Camera RAW</option><option value="audio">Audio</option><option value="video">Video</option></Select>
          </div>
          <Table head={["", "Converter", "Status", "Visible", "Free", "Basic", "Pro", "Popular", "Last check / note"]}>
            {rows.map((p) => (
              <tr key={p.slug}>
                <td className="px-3 py-2"><input type="checkbox" aria-label={`Select ${p.slug}`} checked={picked.has(p.slug)} onChange={(e) => setPicked((s) => { const n = new Set(s); e.target.checked ? n.add(p.slug) : n.delete(p.slug); return n; })} /></td>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{p.from.toUpperCase()} → {p.to.toUpperCase()} <span className="ml-1 text-xs text-muted">{p.route}</span></td>
                <td className="px-3 py-2"><Select className="h-8 w-28 text-xs" aria-label={`Status of ${p.slug}`} value={p.status} onChange={(e) => patch(p.slug, { status: e.target.value })}><option value="live">Live</option><option value="testing">Testing</option><option value="broken">Broken</option></Select></td>
                <td className="px-3 py-2"><Switch checked={p.visible} onChange={(v) => patch(p.slug, { visible: v })} label={`Show ${p.slug}`} /></td>
                {(["free", "basic", "pro"] as const).map((pl) => (
                  <td key={pl} className="px-3 py-2"><input type="checkbox" aria-label={`${pl} can use ${p.slug}`} checked={p.plans.includes(pl)} onChange={(e) => patch(p.slug, { plans: e.target.checked ? [...new Set([...p.plans, pl])] : p.plans.filter((x) => x !== pl) })} /></td>
                ))}
                <td className="px-3 py-2"><button aria-label={`Pin ${p.slug}`} aria-pressed={p.pinned} onClick={() => patch(p.slug, { pinned: !p.pinned })}><Star className={`size-4 ${p.pinned ? "fill-warn text-warn" : "text-muted"}`} /></button></td>
                <td className="max-w-xs px-3 py-2 text-xs text-muted"><span title={p.note ?? ""}>{p.note ?? (p.has_sample ? "" : "Needs a real sample file")}</span> <span className="text-muted/70">{p.last_check_at ? `· ${ago(p.last_check_at)}` : ""}</span> {!p.has_sample && <Badge tone="warn">no sample</Badge>}</td>
              </tr>
            ))}
          </Table>
          <p className="mt-2 text-xs text-muted">Showing {rows.length} of {data.pairs.length}. Pairs with no sample stay in Testing until you add a real file to <code>api/data/samples/&lt;format&gt;/</code>.</p>
        </div>
      )}

      {view === "formats" && (
        <Card className="mt-4">
          <Table head={["Format", "Category", "Visible", "Sample file"]}>
            {data.formats.map((f) => (
              <tr key={f.slug}>
                <td className="px-3 py-2 font-medium">{f.name} <span className="text-xs text-muted">{f.slug}</span></td>
                <td className="px-3 py-2 capitalize text-muted">{f.subgroup === "raw" ? "Camera RAW" : f.category}</td>
                <td className="px-3 py-2"><Switch checked={f.visible} onChange={(v) => patchFormat(f.slug, v)} label={`Show ${f.name}`} /></td>
                <td className="px-3 py-2"><Badge tone={f.has_sample ? "success" : "warn"}>{f.has_sample ? "available" : "needed"}</Badge></td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {view === "presets" && <PresetsEditor rows={presets.data?.presets ?? []} reload={() => presets.reload(true)} />}
    </>
  );
}

function PresetsEditor({ rows, reload }: { rows: PresetRow[]; reload: () => void }) {
  const toast = useToast();
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-muted">Quick settings shown on the site. The settings are JSON using the option names from the converter.</p>
      {rows.map((r) => <PresetRowEditor key={r.id} row={r} toast={toast} reload={reload} />)}
    </div>
  );
}

function PresetRowEditor({ row, toast, reload }: { row: PresetRow; toast: (t: string, bad?: boolean) => void; reload: () => void }) {
  const [label, setLabel] = useState(row.label);
  const [json, setJson] = useState(JSON.stringify(row.settings));
  const [enabled, setEnabled] = useState(row.enabled);
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="accent">{row.category}</Badge>
        <Input className="max-w-52" aria-label="Preset name" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input className="min-w-64 flex-1 font-mono text-xs" aria-label="Preset settings" value={json} onChange={(e) => setJson(e.target.value)} />
        <Switch checked={enabled} onChange={setEnabled} label={`Show ${row.label}`} />
        <Button size="sm" onClick={async () => {
          let settings: unknown;
          try { settings = JSON.parse(json); } catch { return toast("Settings must be valid JSON.", true); }
          try { await adminApi.put(`/formats/presets/${row.id}`, { label, settings, enabled, sort: row.sort }); toast("Preset saved."); reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not save.", true); }
        }}>Save</Button>
      </div>
    </Card>
  );
}
