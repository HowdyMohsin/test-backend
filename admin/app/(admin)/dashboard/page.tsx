"use client";

import Link from "next/link";
import { getFormatStates, getJobStats, getReportSummary, getUserStats } from "@/lib/api";
import { Card, CardHeader, LoadGate, PageHeader, useAsync } from "@/components/ui";
import { IconAlert } from "@/components/icons";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-mist">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-paper">{value}</p>
      {sub && <p className="mt-1 text-xs text-mist">{sub}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const jobs = useAsync(() => getJobStats());
  const users = useAsync(() => getUserStats());
  const today = useAsync(() => getReportSummary("day"));
  const formats = useAsync(() => getFormatStates());

  const pairCounts = (() => {
    if (!formats.data) return null;
    const c = { live: 0, testing: 0, broken: 0 };
    for (const s of formats.data) {
      if (!s.key.startsWith("pair:")) continue;
      if (s.status === "live") c.live++;
      else if (s.status === "testing") c.testing++;
      else if (s.status === "broken") c.broken++;
    }
    return c;
  })();

  const todayTotals = today.data
    ? today.data.reduce(
        (a, r) => ({ conversions: a.conversions + r.conversions, failed: a.failed + r.failed }),
        { conversions: 0, failed: 0 }
      )
    : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live backend overview. Every number below comes from the API — nothing is sampled."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LoadGate state={jobs} loadingLabel="Loading job stats…">
          {(d) => (
            <Stat
              label="Jobs (all time)"
              value={String(Object.values(d.by_status).reduce((a, b) => a + b, 0))}
              sub={Object.entries(d.by_status)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}
            />
          )}
        </LoadGate>
        <LoadGate state={users} loadingLabel="Loading user stats…">
          {(d) => (
            <Stat
              label="Users"
              value={String(d.total)}
              sub={`banned: ${d.banned} · ${Object.entries(d.by_plan)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ")}`}
            />
          )}
        </LoadGate>
        <LoadGate state={today} loadingLabel="Loading today's activity…">
          {() => (
            <Stat
              label="Conversions (24h)"
              value={String(todayTotals?.conversions ?? 0)}
              sub={`failed: ${todayTotals?.failed ?? 0}`}
            />
          )}
        </LoadGate>
        <LoadGate state={formats} loadingLabel="Loading pair states…">
          {() => (
            <Stat
              label="Pairs live"
              value={pairCounts ? `${pairCounts.live} / 210` : "—"}
              sub={
                pairCounts
                  ? `testing: ${pairCounts.testing} · broken: ${pairCounts.broken}`
                  : undefined
              }
            />
          )}
        </LoadGate>
      </div>

      {(jobs.error || users.error || today.error || formats.error) && (
        <Card className="mt-4 border-ember/30">
          <div className="flex items-start gap-3 px-5 py-4">
            <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-ember" />
            <div className="text-sm">
              <p className="font-medium text-paper">Some sections failed to load</p>
              <ul className="mt-1 space-y-0.5 text-xs text-mist">
                {jobs.error && <li>Jobs: {jobs.error.message}</li>}
                {users.error && <li>Users: {users.error.message}</li>}
                {today.error && <li>Reports: {today.error.message}</li>}
                {formats.error && <li>Formats: {formats.error.message}</li>}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader
          title="Quick actions"
          subtitle="Deep links into the sections that need attention."
        />
        <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-3">
          <QuickLink
            href="/formats"
            title="Review pair states"
            desc="Toggle visibility, plans and live/testing/broken status per pair."
          />
          <QuickLink
            href="/jobs"
            title="Inspect jobs"
            desc="Filter the conversion queue by status or pair slug."
          />
          <QuickLink
            href="/reports"
            title="Audit log"
            desc="See who changed what, and when."
          />
        </div>
      </Card>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-line bg-panel2 p-4 transition hover:border-acid/40"
    >
      <p className="text-sm font-semibold text-paper">{title}</p>
      <p className="mt-1 text-xs text-mist">{desc}</p>
    </Link>
  );
}
