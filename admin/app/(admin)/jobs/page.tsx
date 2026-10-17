"use client";

import { useEffect, useState } from "react";
import { getJobs, getJobStats } from "@/lib/api";
import { Job, JobStatus } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Spinner,
} from "@/components/ui";

const PAGE_SIZE = 50;
const STATUSES: JobStatus[] = ["queued", "processing", "done", "failed", "expired"];

const STATUS_TONES: Record<JobStatus, "neutral" | "info" | "good" | "bad" | "warn"> = {
  queued: "neutral",
  processing: "info",
  done: "good",
  failed: "bad",
  expired: "warn",
};

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [pairFilter, setPairFilter] = useState("");
  const [pairInput, setPairInput] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Job[] | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const load = (newOffset = offset, status = statusFilter, pair = pairFilter) => {
    setLoading(true);
    setError(null);
    Promise.all([
      getJobs({
        status: status || undefined,
        pair: pair || undefined,
        limit: PAGE_SIZE,
        offset: newOffset,
      }),
      getJobStats(),
    ])
      .then(([jobs, s]) => {
        setRows(jobs);
        setStats(s.by_status);
      })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setOffset(0);
    load(0, statusFilter, pairFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pairFilter]);

  const page = (dir: 1 | -1) => {
    const next = Math.max(0, offset + dir * PAGE_SIZE);
    setOffset(next);
    load(next);
  };

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="The conversion queue. One row is written per conversion attempt."
      />

      {stats && (
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                statusFilter === s
                  ? "border-acid/50 bg-acid/10 text-acid"
                  : "border-line text-mist hover:text-paper"
              }`}
            >
              {s}: {stats[s] ?? 0}
            </button>
          ))}
          <button
            onClick={() => {
              setStatusFilter("");
              setPairFilter("");
              setPairInput("");
            }}
            className="rounded-full border border-line px-3 py-1 text-xs text-mist hover:text-paper"
          >
            Clear filters
          </button>
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-52 flex-1">
            <Input
              placeholder="Filter by pair slug… (e.g. mp4-to-mp3)"
              value={pairInput}
              onChange={(e) => setPairInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setPairFilter(pairInput.trim())}
            />
          </div>
          <Button variant="subtle" onClick={() => setPairFilter(pairInput.trim())}>
            Apply
          </Button>
        </div>

        {loading ? (
          <Spinner label="Loading jobs…" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => load()} />
        ) : !rows || rows.length === 0 ? (
          <EmptyState title="No jobs found" hint="Try a different filter." />
        ) : (
          <>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mist">
                    <th className="px-5 py-3 font-medium">Job</th>
                    <th className="px-5 py-3 font-medium">Pair</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Progress</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((j) => (
                    <tr
                      key={j.id}
                      className="border-b border-line/50 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-2.5">
                        <span className="font-mono text-xs text-paper">
                          {j.id.slice(0, 8)}…
                        </span>
                        <span className="block max-w-48 truncate font-mono text-[11px] text-mist/70">
                          {j.owner_key}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 font-mono text-xs text-paper">{j.pair_slug}</td>
                      <td className="px-5 py-2.5">
                        <Badge tone={STATUS_TONES[j.status] ?? "neutral"}>{j.status}</Badge>
                        {j.error_code && (
                          <span className="block font-mono text-[11px] text-ember">
                            {j.error_code}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-acid"
                              style={{ width: `${Math.round(j.progress * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-mist">
                            {Math.round(j.progress * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge tone="neutral">{j.plan_id}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-xs text-mist">
                        {new Date(j.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <span className="text-xs text-mist">
                Showing {offset + 1}–{offset + rows.length}
              </span>
              <div className="flex gap-2">
                <Button variant="subtle" onClick={() => page(-1)} disabled={offset === 0}>
                  Previous
                </Button>
                <Button variant="subtle" onClick={() => page(1)} disabled={rows.length < PAGE_SIZE}>
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
