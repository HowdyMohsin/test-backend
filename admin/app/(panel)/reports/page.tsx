"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Loading, PageHeader, StatCard, Table, bytes } from "@/components/data/Bits";
import { Select } from "@/components/ui/Input";
import { useLoad } from "@/hooks/useLoad";
import { API } from "@/lib/api";

type R = {
  days: number;
  daily: { day: string; done: number; failed: number; blocked: number; bytes_in: number; bytes_out: number }[];
  top_pairs: { pair: string; done: number; failed: number }[];
  timing_ms: { avg: number; p95: number };
  plans: { plan: string; count: number }[];
  errors: { code: string; count: number }[];
  engines: { route: string; done: number; failed: number }[];
};

export default function ReportsPage() {
  const [days, setDays] = useState(7);
  const { data, error } = useLoad<R>(`/reports?days=${days}`);
  const sum = (k: "done" | "failed" | "blocked" | "bytes_in" | "bytes_out") => (data?.daily ?? []).reduce((a, d) => a + d[k], 0);
  return (
    <>
      <PageHeader title="Reports" subtitle="Calculated from real conversions.">
        <Select className="w-40" aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={1}>Today</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </Select>
        <a href={`${API}/v1/admin/reports/export.csv?days=${days}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2"><Download className="size-4" aria-hidden /> Export CSV</a>
      </PageHeader>
      {!data ? <Loading error={error} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Converted" value={sum("done").toLocaleString()} />
            <StatCard label="Failed" value={sum("failed")} tone={sum("failed") ? "danger" : undefined} />
            <StatCard label="Stopped by a limit" value={sum("blocked")} hint="People who hit a plan limit" />
            <StatCard label="Typical time" value={`${(data.timing_ms.avg / 1000).toFixed(1)} s`} hint={`Slowest 5%: ${(data.timing_ms.p95 / 1000).toFixed(1)} s`} />
            <StatCard label="Data" value={bytes(sum("bytes_in"))} hint={`${bytes(sum("bytes_out"))} produced`} />
          </div>
          <Card title="Per day" className="mt-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily.map((d) => ({ ...d, day: d.day.slice(5) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 12 }} width={32} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }} />
                  <Legend />
                  <Bar dataKey="done" name="Converted" stackId="a" fill="var(--accent)" />
                  <Bar dataKey="failed" name="Failed" stackId="a" fill="var(--danger)" />
                  <Bar dataKey="blocked" name="Hit a limit" stackId="a" fill="var(--warn)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <Card title="Top converters"><Table head={["Converter", "Converted", "Failed"]}>{data.top_pairs.map((p) => <tr key={p.pair}><td className="px-3 py-2 font-medium">{p.pair}</td><td className="px-3 py-2 tabular-nums">{p.done}</td><td className="px-3 py-2 tabular-nums text-danger">{p.failed || ""}</td></tr>)}</Table></Card>
            <div className="space-y-4">
              <Card title="Who converts"><ul className="space-y-1.5 text-sm">{data.plans.map((p) => <li key={p.plan} className="flex justify-between"><span className="capitalize">{p.plan}</span><b className="tabular-nums">{p.count}</b></li>)}{data.plans.length === 0 && <li className="text-muted">No data yet.</li>}</ul></Card>
              <Card title="Why things failed or were stopped"><ul className="space-y-1.5 text-sm">{data.errors.map((e) => <li key={e.code} className="flex justify-between"><span className="font-mono text-xs">{e.code}</span><b className="tabular-nums">{e.count}</b></li>)}{data.errors.length === 0 && <li className="text-muted">Nothing went wrong.</li>}</ul></Card>
              <Card title="By engine"><ul className="space-y-1.5 text-sm">{data.engines.map((e) => <li key={e.route} className="flex justify-between"><span>{e.route}</span><span className="tabular-nums">{e.done} ok{e.failed ? `, ${e.failed} failed` : ""}</span></li>)}</ul></Card>
            </div>
          </div>
        </>
      )}
    </>
  );
}
