"use client";

import { useState } from "react";
import { Card, Confirm, Loading, PageHeader, Pager, Table, ago } from "@/components/data/Bits";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useLoad } from "@/hooks/useLoad";
import { useToast } from "@/hooks/useToast";
import { ApiError, adminApi } from "@/lib/api";

type Site = { maintenance_enabled: boolean; maintenance_message: string; announcement_text: string; announcement_link: string; announcement_expires: string | null; public_stats_enabled: boolean; retention_minutes: number | null };

export default function SettingsPage() {
  const [tab, setTab] = useState<"site" | "audit" | "keys" | "system">("site");
  return (
    <>
      <PageHeader title="Settings" />
      <div className="mb-4 flex flex-wrap gap-2">
        {([["site", "Site"], ["audit", "Audit log"], ["keys", "API keys"], ["system", "System"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === k ? "bg-primary text-primary-ink" : "bg-surface-2 text-muted"}`}>{l}</button>)}
      </div>
      {tab === "site" && <SiteForm />}
      {tab === "audit" && <Audit />}
      {tab === "keys" && <Keys />}
      {tab === "system" && <System />}
    </>
  );
}

function SiteForm() {
  const toast = useToast();
  const { data, error } = useLoad<Site>("/settings/site");
  const [f, setF] = useState<Site | null>(null);
  if (!data) return <Loading error={error} />;
  const v = f ?? data;
  const set = (c: Partial<Site>) => setF({ ...v, ...c });
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Maintenance mode">
        <div className="flex items-center justify-between"><p className="text-sm text-muted">Pauses uploads and conversions and shows a banner on the site.</p><Switch checked={v.maintenance_enabled} onChange={(x) => set({ maintenance_enabled: x })} label="Maintenance mode" /></div>
        <Input className="mt-3" placeholder="Message shown to visitors (optional)" aria-label="Maintenance message" value={v.maintenance_message ?? ""} onChange={(e) => set({ maintenance_message: e.target.value })} />
      </Card>
      <Card title="Announcement bar">
        <Input placeholder="Text, e.g. New: WebP to AVIF is faster" aria-label="Announcement text" value={v.announcement_text ?? ""} onChange={(e) => set({ announcement_text: e.target.value })} />
        <Input className="mt-2" placeholder="Link (optional)" aria-label="Announcement link" value={v.announcement_link ?? ""} onChange={(e) => set({ announcement_link: e.target.value })} />
        <label className="mt-2 block text-sm font-medium">Hide after (optional)<Input className="mt-1" type="datetime-local" value={v.announcement_expires ? v.announcement_expires.slice(0, 16) : ""} onChange={(e) => set({ announcement_expires: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
      </Card>
      <Card title="Files">
        <label className="block text-sm font-medium">Delete files after (minutes, 5 to 1440)<Input className="mt-1" type="number" min={5} max={1440} value={v.retention_minutes ?? 60} onChange={(e) => set({ retention_minutes: Number(e.target.value) })} /></label>
      </Card>
      <Card title="Public counter">
        <div className="flex items-center justify-between"><p className="text-sm text-muted">Show the real number of converted files on the homepage.</p><Switch checked={v.public_stats_enabled} onChange={(x) => set({ public_stats_enabled: x })} label="Show public counter" /></div>
      </Card>
      <div className="xl:col-span-2"><Button size="lg" disabled={!f} onClick={async () => { try { await adminApi.put("/settings/site", { ...v, announcement_expires: v.announcement_expires || null }); toast("Settings saved."); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not save.", true); } }}>Save settings</Button></div>
    </div>
  );
}

function Audit() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const { data, error } = useLoad<{ total: number; page: number; entries: { id: number; ts: string; admin: string; action: string; target: string; before: unknown; after: unknown }[] }>(`/settings/audit?page=${page}&action=${encodeURIComponent(action)}`);
  return (
    <>
      <Input className="mb-3 max-w-64" placeholder="Filter by action, e.g. plan" aria-label="Filter audit log" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
      {!data ? <Loading error={error} /> : (
        <>
          <Table head={["When", "Who", "Action", "Target", "Change"]}>
            {data.entries.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-3 py-2 text-muted">{ago(e.ts)}</td><td className="px-3 py-2">{e.admin}</td>
                <td className="px-3 py-2"><Badge tone="accent">{e.action}</Badge></td><td className="px-3 py-2 font-medium">{e.target}</td>
                <td className="max-w-sm px-3 py-2 text-xs text-muted"><div className="truncate" title={JSON.stringify(e.before)}>was: {JSON.stringify(e.before) ?? "-"}</div><div className="truncate" title={JSON.stringify(e.after)}>now: {JSON.stringify(e.after) ?? "-"}</div></td>
              </tr>
            ))}
          </Table>
          {data.entries.length === 0 && <p className="p-6 text-center text-sm text-muted">Nothing here yet.</p>}
          <Pager page={data.page} total={data.total} size={30} onPage={setPage} />
        </>
      )}
    </>
  );
}

function Keys() {
  const toast = useToast();
  const { data, error, reload } = useLoad<{ keys: { id: string; name: string; created_by: string; created_at: string; revoked: boolean }[] }>("/settings/api-keys");
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState("");
  const [revoke, setRevoke] = useState<string | null>(null);
  if (!data) return <Loading error={error} />;
  return (
    <>
      <Card title="Create a read-only key" className="mb-4">
        <p className="mb-3 text-sm text-muted">For scripts that read reports or the job list. Send it as <code>Authorization: Bearer qic_...</code>. It cannot change anything.</p>
        <div className="flex gap-2"><Input className="max-w-64" placeholder="What is it for?" aria-label="Key name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button disabled={!name} onClick={async () => { try { const r = await adminApi.post<{ key: string }>("/settings/api-keys", { name }); setFresh(r.key); setName(""); reload(true); } catch (e) { toast(e instanceof ApiError ? e.message : "Could not create.", true); } }}>Create key</Button></div>
        {fresh && <p className="mt-3 break-all rounded-xl bg-warn-soft p-3 text-sm text-warn">Copy this now, it is shown only once:<br /><b className="font-mono">{fresh}</b></p>}
      </Card>
      <Table head={["Name", "Created by", "Created", "Status", ""]}>
        {data.keys.map((k) => <tr key={k.id}><td className="px-3 py-2 font-medium">{k.name}</td><td className="px-3 py-2 text-muted">{k.created_by}</td><td className="px-3 py-2 text-muted">{ago(k.created_at)}</td><td className="px-3 py-2">{k.revoked ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Active</Badge>}</td><td className="px-3 py-2">{!k.revoked && <Button size="sm" variant="ghost" onClick={() => setRevoke(k.id)}>Revoke</Button>}</td></tr>)}
      </Table>
      {revoke && <Confirm title="Revoke this key?" text="Anything using it will stop working." action="Revoke" onClose={() => setRevoke(null)} onConfirm={async () => { try { await adminApi.del(`/settings/api-keys/${revoke}`); toast("Key revoked."); reload(true); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed.", true); } }} />}
    </>
  );
}

function System() {
  const { data, error } = useLoad<Record<string, string | number>>("/settings/system");
  if (!data) return <Loading error={error} />;
  return <Card><dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">{Object.entries(data).map(([k, v]) => <div key={k} className="flex justify-between border-b border-line pb-2"><dt className="text-muted">{k.replace(/_/g, " ")}</dt><dd className="font-medium">{String(v)}</dd></div>)}</dl></Card>;
}
