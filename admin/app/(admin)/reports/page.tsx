"use client";

import { useEffect, useState } from "react";
import {
  getAuditLog,
  getReportPairs,
  getReportPlans,
  getReportSummary,
} from "@/lib/api";
import { AuditEntry, PairReport, PlanReport, ReportPoint, ReportRange } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";

const RANGES: ReportRange[] = ["day", "week", "month"];

function BarChart({ data }: { data: ReportPoint[] }) {
  if (data.length === 0)
    return <EmptyState title="No data in this range" hint="Conversions will appear here." />;
  const max = Math.max(...data.map((d) => d.conversions), 1);
  const W = 640;
  const H = 200;
  const pad = 28;
  const bw = (W - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Conversions per day">
      {data.map((d, i) => {
        const h = Math.max(2, ((H - pad * 2) * d.conversions) / max);
        const x = pad + i * bw + bw * 0.2;
        return (
          <g key={d.day}>
            <rect
              x={x}
              y={H - pad - h}
              width={bw * 0.6}
              height={h}
              rx={3}
              fill="#c8ff3d"
              opacity={d.failed > 0 ? 0.85 : 0.55}
            >
              <title>
                {d.day}: {d.conversions} conversions, {d.failed} failed, {d.input_mb} MB in
              </title>
            </rect>
            {i % Math.ceil(data.length / 8) === 0 && (
              <text x={x} y={H - 8} fill="#98a2b8" fontSize="10" fontFamily="monospace">
                {d.day.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      <text x={pad} y={14} fill="#98a2b8" fontSize="10" fontFamily="monospace">
        max {max}/day
      </text>
    </svg>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("week");
  const [summary, setSummary] = useState<ReportPoint[] | null>(null);
  const [pairs, setPairs] = useState<PairReport[] | null>(null);
  const [plans, setPlans] = useState<PlanReport[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [auditError, setAuditError] = useState<Error | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditOffset, setAuditOffset] = useState(0);
  const AUDIT_PAGE = 25;

  const loadReports = (r: ReportRange) => {
    setLoading(true);
    setError(null);
    Promise.all([getReportSummary(r), getReportPairs(r), getReportPlans(r)])
      .then(([s, p, pl]) => {
        setSummary(s);
        setPairs(p);
        setPlans(pl);
      })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  };

  const loadAudit = (offset: number) => {
    setAuditLoading(true);
    setAuditError(null);
    getAuditLog(AUDIT_PAGE, offset)
      .then(setAudit)
      .catch((e: Error) => setAuditError(e))
      .finally(() => setAuditLoading(false));
  };

  useEffect(() => {
    loadReports(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    loadAudit(0);
    setAuditOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const auditPage = (dir: 1 | -1) => {
    const next = Math.max(0, auditOffset + dir * AUDIT_PAGE);
    setAuditOffset(next);
    loadAudit(next);
  };

  const totals = summary
    ? summary.reduce(
        (a, r) => ({
          conversions: a.conversions + r.conversions,
          failed: a.failed + r.failed,
          mb: a.mb + r.input_mb,
        }),
        { conversions: 0, failed: 0, mb: 0 }
      )
    : null;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Conversion stats from the events table, plus the admin audit log."
        right={
          <Select value={range} onChange={(e) => setRange(e.target.value as ReportRange)}>
            {RANGES.map((r) => (
              <option key={r} value={r}>
                Last {r === "day" ? "24 hours" : r === "week" ? "7 days" : "30 days"}
              </option>
            ))}
          </Select>
        }
      />

      {loading ? (
        <Spinner label="Loading reports…" />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => loadReports(range)} />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <MiniStat label="Conversions" value={String(totals?.conversions ?? 0)} />
            <MiniStat label="Failed" value={String(totals?.failed ?? 0)} />
            <MiniStat label="Input processed" value={`${(totals?.mb ?? 0).toFixed(1)} MB`} />
          </div>

          <Card className="mb-4">
            <CardHeader title="Conversions per day" />
            <div className="px-5 py-4">
              <BarChart data={summary ?? []} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader title="Top pairs" subtitle={`Top ${pairs?.length ?? 0} by conversions`} />
              {!pairs || pairs.length === 0 ? (
                <EmptyState title="No pair data" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mist">
                      <th className="px-5 py-3 font-medium">Pair</th>
                      <th className="px-5 py-3 text-right font-medium">Conv.</th>
                      <th className="px-5 py-3 text-right font-medium">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.map((p) => (
                      <tr key={p.pair} className="border-b border-line/50 last:border-0">
                        <td className="px-5 py-2 font-mono text-xs text-paper">{p.pair}</td>
                        <td className="px-5 py-2 text-right font-mono text-xs text-acid">
                          {p.conversions}
                        </td>
                        <td className="px-5 py-2 text-right font-mono text-xs text-ember">
                          {p.failed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card>
              <CardHeader title="By plan" />
              {!plans || plans.length === 0 ? (
                <EmptyState title="No plan data" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mist">
                      <th className="px-5 py-3 font-medium">Plan</th>
                      <th className="px-5 py-3 text-right font-medium">Conv.</th>
                      <th className="px-5 py-3 text-right font-medium">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.plan} className="border-b border-line/50 last:border-0">
                        <td className="px-5 py-2">
                          <Badge tone="info">{p.plan}</Badge>
                        </td>
                        <td className="px-5 py-2 text-right font-mono text-xs text-acid">
                          {p.conversions}
                        </td>
                        <td className="px-5 py-2 text-right font-mono text-xs text-ember">
                          {p.failed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </>
      )}

      <Card className="mt-4">
        <CardHeader title="Audit log" subtitle="Every admin action, newest first." />
        {auditLoading ? (
          <Spinner label="Loading audit log…" />
        ) : auditError ? (
          <ErrorState error={auditError} onRetry={() => loadAudit(auditOffset)} />
        ) : !audit || audit.length === 0 ? (
          <EmptyState title="No audit entries" />
        ) : (
          <>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mist">
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                    <th className="px-5 py-3 font-medium">Target</th>
                    <th className="px-5 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-line/50 align-top last:border-0"
                    >
                      <td className="whitespace-nowrap px-5 py-2.5 text-xs text-mist">
                        {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-2.5 font-mono text-xs text-paper">{a.action}</td>
                      <td className="max-w-48 truncate px-5 py-2.5 font-mono text-xs text-mist">
                        {a.target ?? "—"}
                      </td>
                      <td className="max-w-72 px-5 py-2.5 font-mono text-[11px] text-mist/70">
                        {a.details ? JSON.stringify(a.details).slice(0, 120) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <span className="text-xs text-mist">
                Showing {auditOffset + 1}–{auditOffset + audit.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="subtle"
                  onClick={() => auditPage(-1)}
                  disabled={auditOffset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => auditPage(1)}
                  disabled={audit.length < AUDIT_PAGE}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] uppercase tracking-widest text-mist">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-paper">{value}</p>
    </Card>
  );
}
