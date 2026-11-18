"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Loading, PageHeader, StatCard, Table, ago, bytes } from "@/components/data/Bits";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useLoad } from "@/hooks/useLoad";

type Dash = {
  today: { done: number; failed: number; bytes_in: number; bytes_out: number };
  success_rate_24h: number | null; failed_24h: number; queue_depth: number; users_today: number;
  series: { day: string; done: number; failed: number }[];
  top_pairs: { pair: string; count: number }[];
  queue: { id: string; pair: string; status: string; progress: number; created_at: string }[];
  health: { database: boolean; disk_free_gb: number; disk_total_gb: number | null; ffmpeg: string; libvips: string };
};

function fill14(series: Dash["series"]) {
  const map = new Map(series.map((s) => [s.day, s]));
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    return { day: d.slice(5), done: map.get(d)?.done ?? 0, failed: map.get(d)?.failed ?? 0 };
  });
}

export default function Dashboard() {
  const { data, error } = useLoad<Dash>("/dashboard", 5000);
  if (!data) return <Loading error={error} />;
  const max = Math.max(1, ...data.top_pairs.map((p) => p.count));
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Updates every few seconds." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Converted today" value={data.today.done.toLocaleString()} hint={`${bytes(data.today.bytes_in)} in, ${bytes(data.today.bytes_out)} out`} />
        <StatCard label="Success rate (24 h)" value={data.success_rate_24h === null ? "No data yet" : `${data.success_rate_24h}%`} tone={data.success_rate_24h !== null && data.success_rate_24h < 95 ? "danger" : "success"} />
        <StatCard label="Failed (24 h)" value={data.failed_24h} tone={data.failed_24h ? "danger" : undefined} />
        <StatCard label="Waiting in queue" value={data.queue_depth} />
        <StatCard label="People today" value={data.users_today} hint="Signed-in and anonymous" />
        <StatCard label="Disk free" value={`${data.health.disk_free_gb} GB`} hint={data.health.disk_total_gb ? `of ${data.health.disk_total_gb} GB` : undefined} tone={data.health.disk_free_gb < 5 ? "danger" : undefined} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card title="Last 14 days">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fill14(data.series)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} width={32} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }} />
                <Bar dataKey="done" name="Converted" stackId="a" fill="var(--accent)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" name="Failed" stackId="a" fill="var(--danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Top converters (30 days)">
          {data.top_pairs.length === 0 ? <p className="text-sm text-muted">Nothing converted yet.</p> : (
            <ul className="space-y-2.5">
              {data.top_pairs.map((p) => (
                <li key={p.pair} className="text-sm">
                  <div className="flex justify-between"><span className="font-medium">{p.pair.replace("-to-", " → ").toUpperCase()}</span><span className="tabular-nums text-muted">{p.count}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${(p.count / max) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card title="Live queue">
          {data.queue.length === 0 ? <p className="text-sm text-muted">The queue is empty.</p> : (
            <Table head={["Converter", "Status", "Progress", "Started"]}>
              {data.queue.map((j) => (
                <tr key={j.id}>
                  <td className="px-3 py-2 font-medium"><Link className="hover:text-primary" href="/jobs">{j.pair}</Link></td>
                  <td className="px-3 py-2"><Badge tone={j.status === "processing" ? "accent" : "neutral"}>{j.status}</Badge></td>
                  <td className="w-40 px-3 py-2"><ProgressBar value={j.progress} label={`${j.pair} progress`} /></td>
                  <td className="px-3 py-2 text-muted">{ago(j.created_at)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card title="Health">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Database</dt><dd><Badge tone={data.health.database ? "success" : "danger"}>{data.health.database ? "OK" : "Down"}</Badge></dd></div>
            <div className="flex justify-between"><dt className="text-muted">FFmpeg</dt><dd className="font-medium">{data.health.ffmpeg}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">libvips</dt><dd className="font-medium">{data.health.libvips}</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
