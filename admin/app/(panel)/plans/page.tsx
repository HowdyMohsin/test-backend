"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Card, Loading, PageHeader } from "@/components/data/Bits";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useLoad } from "@/hooks/useLoad";
import { useToast } from "@/hooks/useToast";
import { ApiError, adminApi } from "@/lib/api";

type Plan = { id: string; name: string; price_cents: number; limits: Record<string, number | boolean> };
type Msg = { key: string; text: string; default: string };
type Data = { plans: Plan[]; messages: Msg[]; placeholders: string[] };

const LABELS: Record<string, string> = {
  daily_conversions: "Conversions per day", max_batch: "Files at once", max_image_mb: "Image and RAW size (MB)", max_audio_mb: "Audio size (MB)",
  max_video_mb: "Video size (MB)", max_video_minutes: "Video length (minutes)",
};
const SAMPLE: Record<string, string> = { used: "3", limit: "5", reset_in: "7h 12m", size: "250 MB", max: "200 MB", next_limit: "25", next_max: "2.0 GB", duration: "45m 0s" };
const preview = (t: string) => t.replace(/\{(\w+)\}/g, (_, k: string) => SAMPLE[k] ?? `{${k}}`);

export default function PlansPage() {
  const { data, error, reload } = useLoad<Data>("/plans");
  if (!data) return <Loading error={error} />;
  return (
    <>
      <PageHeader title="Plans & Messages" subtitle="Changes apply to the live site within about ten seconds. No website update needed." />
      <div className="grid gap-4 xl:grid-cols-3">{data.plans.map((p) => <PlanCard key={p.id} plan={p} reload={() => reload(true)} />)}</div>
      <h2 className="mb-1 mt-10 text-lg font-bold">Messages</h2>
      <p className="mb-4 text-sm text-muted">What visitors read when they hit a limit. Placeholders: {data.placeholders.join("  ")}. A key ending in .anonymous, .free or .pro is shown only to that plan.</p>
      <div className="space-y-3">{data.messages.map((m) => <MessageRow key={m.key} msg={m} reload={() => reload(true)} />)}</div>
    </>
  );
}

function PlanCard({ plan, reload }: { plan: Plan; reload: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(String(plan.price_cents / 100));
  const [limits, setLimits] = useState(plan.limits);
  return (
    <Card title={`${plan.name} plan`}>
      <div className="space-y-3">
        <label className="block text-sm font-medium">Name<Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block text-sm font-medium">Price per month (USD)<Input className="mt-1" type="number" min={0} step="0.5" value={price} onChange={(e) => setPrice(e.target.value)} disabled={plan.id !== "pro"} /></label>
        {Object.keys(LABELS).map((k) => (
          <label key={k} className="block text-sm font-medium">{LABELS[k]}<Input className="mt-1" type="number" min={0} value={String(limits[k] ?? 0)} onChange={(e) => setLimits({ ...limits, [k]: Number(e.target.value) })} /></label>
        ))}
        <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm font-medium">Show ads<Switch checked={!!limits.ads} onChange={(v) => setLimits({ ...limits, ads: v })} label="Show ads on this plan" /></div>
        <Button className="w-full" onClick={async () => {
          try { await adminApi.put(`/plans/${plan.id}`, { name, price_cents: Math.round(Number(price) * 100), limits }); toast("Plan saved."); reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not save.", true); }
        }}>Save {plan.name}</Button>
      </div>
    </Card>
  );
}

function MessageRow({ msg, reload }: { msg: Msg; reload: () => void }) {
  const toast = useToast();
  const [text, setText] = useState(msg.text);
  const dirty = text !== msg.text;
  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-72 flex-1">
          <p className="mb-1 font-mono text-xs text-muted">{msg.key}</p>
          <textarea aria-label={`Text for ${msg.key}`} rows={2} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-accent" />
        </div>
        <div className="min-w-72 flex-1 rounded-xl bg-surface-2 p-3 text-sm"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>{preview(text)}</div>
        <div className="flex gap-2">
          <Button size="sm" disabled={!dirty} onClick={async () => { try { await adminApi.put(`/plans/messages/${msg.key}`, { text }); toast("Message saved."); reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not save.", true); } }}>Save</Button>
          <Button size="sm" variant="ghost" title="Restore the original text" onClick={async () => { try { const r = await adminApi.post<{ text: string }>(`/plans/messages/${msg.key}/reset`); setText(r.text); toast("Restored."); reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not reset.", true); } }}><RotateCcw className="size-4" aria-hidden /></Button>
        </div>
      </div>
    </Card>
  );
}
