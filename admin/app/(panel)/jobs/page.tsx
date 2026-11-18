"use client";

import { useState } from "react";
import { Loading, PageHeader, Pager, Table, ago } from "@/components/data/Bits";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useLoad } from "@/hooks/useLoad";
import { useToast } from "@/hooks/useToast";
import { ApiError, adminApi } from "@/lib/api";

type Job = { id: string; pair: string; category: string; status: string; progress: number; plan: string; owner: string; error_code: string | null; created_at: string; finished_at: string | null };
type List = { total: number; page: number; counts: Record<string, number>; jobs: Job[] };
type Detail = Job & { settings: Record<string, unknown>; route: string; timeout_s: number; error_message: string | null; notes: string[]; out_size: number | null; started_at: string | null; stuck: boolean };
const tone: Record<string, "success" | "danger" | "accent" | "neutral" | "warn"> = { done: "success", failed: "danger", processing: "accent", queued: "neutral", cancelled: "warn", expired: "neutral" };

export default function JobsPage() {
  const [status, setStatus] = useState("");
  const [pair, setPair] = useState("");
  const [page, setPage] = useState(1);
  const [live, setLive] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const { data, error } = useLoad<List>(`/jobs?status=${status}&pair=${pair}&page=${page}`, live ? 3000 : undefined);
  if (!data) return <Loading error={error} />;
  return (
    <>
      <PageHeader title="Jobs" subtitle="Every conversion. Click a row for details, retry or cancel.">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> Refresh every 3 s</label>
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {["queued", "processing", "done", "failed", "cancelled"].map((s) => (
          <button key={s} onClick={() => { setStatus(status === s ? "" : s); setPage(1); }} className={`rounded-xl border px-3 py-1.5 text-sm font-medium capitalize ${status === s ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface"}`}>{s} <span className="opacity-70">{data.counts[s] ?? 0}</span></button>
        ))}
        <Input className="ml-auto max-w-52" placeholder="Converter, e.g. png-to-jpg" aria-label="Filter by converter" value={pair} onChange={(e) => { setPair(e.target.value); setPage(1); }} />
      </div>
      <Table head={["Converter", "Status", "Progress", "Who", "Plan", "Error", "Created"]}>
        {data.jobs.map((j) => (
          <tr key={j.id} onClick={() => setOpen(j.id)} className="cursor-pointer hover:bg-surface-2">
            <td className="px-3 py-2 font-medium">{j.pair}</td>
            <td className="px-3 py-2"><Badge tone={tone[j.status] ?? "neutral"}>{j.status}</Badge></td>
            <td className="w-32 px-3 py-2">{j.status === "processing" ? <ProgressBar value={j.progress} label="progress" /> : <span className="text-muted">{j.status === "done" ? "100%" : "-"}</span>}</td>
            <td className="px-3 py-2 text-muted">{j.owner}</td>
            <td className="px-3 py-2 text-muted">{j.plan}</td>
            <td className="px-3 py-2 text-xs text-danger">{j.error_code ?? ""}</td>
            <td className="px-3 py-2 text-muted">{ago(j.created_at)}</td>
          </tr>
        ))}
      </Table>
      {data.jobs.length === 0 && <p className="p-6 text-center text-sm text-muted">No jobs match.</p>}
      <Pager page={data.page} total={data.total} onPage={setPage} />
      {open && <JobDetail id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function JobDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const toast = useToast();
  const { data, reload } = useLoad<Detail>(`/jobs/${id}`);
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); reload(true); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed.", true); } };
  return (
    <Modal title="Job details" onClose={onClose} wide>
      {!data ? <Loading /> : (
        <div>
          <h2 className="text-lg font-bold">{data.pair} <Badge tone={tone[data.status] ?? "neutral"}>{data.status}</Badge> {data.stuck && <Badge tone="danger">stuck</Badge>}</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Route</dt><dd className="font-medium">{data.route}</dd></div>
            <div><dt className="text-muted">Time limit</dt><dd className="font-medium">{data.timeout_s} s</dd></div>
            <div><dt className="text-muted">Created</dt><dd className="font-medium">{new Date(data.created_at).toLocaleString()}</dd></div>
            <div><dt className="text-muted">Output size</dt><dd className="font-medium">{data.out_size ? `${Math.round(data.out_size / 1024)} KB` : "-"}</dd></div>
          </dl>
          {data.error_message && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger"><b>{data.error_code}</b>: {data.error_message}</p>}
          {data.notes?.length > 0 && <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">{data.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
          <p className="mb-1 mt-4 text-sm font-semibold">Options used</p>
          <pre className="max-h-48 overflow-auto rounded-xl bg-surface-2 p-3 text-xs">{JSON.stringify(data.settings, null, 2)}</pre>
          <div className="mt-5 flex flex-wrap gap-2">
            {(data.status === "failed" || data.status === "cancelled") && <Button onClick={() => act(() => adminApi.post(`/jobs/${id}/retry`), "Queued again.")}>Retry</Button>}
            {(data.status === "queued" || data.status === "processing") && <Button variant="danger" onClick={() => act(() => adminApi.post(`/jobs/${id}/cancel`), "Cancelled.")}>Cancel job</Button>}
            <Button variant="secondary" onClick={() => act(() => adminApi.del(`/jobs/${id}/files`), "Files deleted.")}>Delete files</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
