"use client";

import { useState } from "react";
import { Card, Loading, PageHeader } from "@/components/data/Bits";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { useLoad } from "@/hooks/useLoad";
import { useToast } from "@/hooks/useToast";
import { ApiError, adminApi } from "@/lib/api";

type Slot = { key: string; label: string; enabled: boolean; code: string };

export default function AdsPage() {
  const { data, error, reload } = useLoad<{ slots: Slot[]; rules: string[] }>("/ads");
  if (!data) return <Loading error={error} />;
  return (
    <>
      <PageHeader title="Ads" subtitle="Where ad code is placed on the site." />
      <ul className="mb-6 space-y-1.5 rounded-xl bg-accent-soft p-4 text-sm text-primary">{data.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      <div className="space-y-4">{data.slots.map((s) => <SlotCard key={s.key} slot={s} reload={() => reload(true)} />)}</div>
    </>
  );
}

function SlotCard({ slot, reload }: { slot: Slot; reload: () => void }) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(slot.enabled);
  const [code, setCode] = useState(slot.code);
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div><p className="font-semibold">{slot.label}</p><p className="font-mono text-xs text-muted">{slot.key}</p></div>
        <label className="flex items-center gap-2 text-sm font-medium">Enabled <Switch checked={enabled} onChange={setEnabled} label={`Enable ${slot.label}`} /></label>
      </div>
      <textarea aria-label={`Ad code for ${slot.label}`} rows={4} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste the ad code from your ad network here" className="mt-3 w-full rounded-xl border border-line bg-surface px-3 py-2 font-mono text-xs focus:border-accent" />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted">Only people on the Anonymous and Free plans see this.</p>
        <Button size="sm" onClick={async () => { try { await adminApi.put(`/ads/${slot.key}`, { enabled, code }); toast("Ad slot saved."); reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not save.", true); } }}>Save</Button>
      </div>
    </Card>
  );
}
