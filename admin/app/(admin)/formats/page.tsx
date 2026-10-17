"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getFormatStates,
  runSelfcheck,
  toBackendKey,
  toUiKey,
  updateFormatState,
  type FormatStatePatch,
} from "@/lib/api";
import { FORMAT_BY_SLUG, FORMATS, PAIRS } from "@/lib/registry";
import { FormatState, PairStatus, PlanId, SelfcheckResult } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Textarea,
  Toggle,
} from "@/components/ui";
import { IconAlert, IconBolt, IconCheck, IconSpinner } from "@/components/icons";

const FORMAT_SLUGS = new Set(FORMATS.map((f) => f.slug));
const PLAN_IDS: PlanId[] = ["anonymous", "free", "pro"];
const STATUS_TONES: Record<PairStatus, "good" | "warn" | "bad"> = {
  live: "good",
  testing: "warn",
  broken: "bad",
};

function categoryOf(from: string): string {
  const f = FORMAT_BY_SLUG[from];
  if (!f) return "unknown";
  return f.subgroup === "raw" ? "raw" : f.category;
}

export default function FormatsPage() {
  const [states, setStates] = useState<Record<string, FormatState> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [checking, setChecking] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<SelfcheckResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    getFormatStates()
      .then((rows) => {
        const map: Record<string, FormatState> = {};
        for (const s of rows) map[toUiKey(s.key)] = s;
        setStates(map);
      })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  };

  // initial load
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (uiKey: string, p: FormatStatePatch) => {
    if (!states) return;
    const prev = states[uiKey];
    if (!prev) return;
    // optimistic update
    setStates({ ...states, [uiKey]: { ...prev, ...p } as FormatState });
    updateFormatState(toBackendKey(uiKey, FORMAT_SLUGS), p).catch((e: Error) => {
      // revert on failure
      setStates((cur) => (cur ? { ...cur, [uiKey]: prev } : cur));
      setRunError(`Save failed for ${uiKey}: ${e.message}`);
    });
  };

  const doSelfcheck = (pair?: string) => {
    const key = pair ?? "FULL";
    setChecking(key);
    setRunError(null);
    runSelfcheck(pair)
      .then((r) => {
        setLastRun(r);
        load(); // refresh statuses the backend just persisted
      })
      .catch((e: Error) => setRunError(e.message))
      .finally(() => setChecking(null));
  };

  const filtered = useMemo(() => {
    if (!states) return [];
    const q = search.trim().toLowerCase();
    return PAIRS.filter((p) => {
      const st = states[p.slug];
      if (!st) return false;
      if (statusFilter !== "all" && st.status !== statusFilter) return false;
      if (catFilter !== "all" && categoryOf(p.from) !== catFilter) return false;
      if (q && !(p.slug.includes(q) || p.from.includes(q) || p.to.includes(q))) return false;
      return true;
    });
  }, [states, search, statusFilter, catFilter]);

  const counts = useMemo(() => {
    if (!states) return { live: 0, testing: 0, broken: 0 };
    const c = { live: 0, testing: 0, broken: 0 };
    for (const slug of Object.keys(states)) {
      if (slug.includes("-to-")) {
        const s = states[slug].status;
        if (s === "live" || s === "testing" || s === "broken") c[s]++;
      }
    }
    return c;
  }, [states]);

  return (
    <div>
      <PageHeader
        title="Formats"
        subtitle="210 conversion pairs. Visibility, plans and status are enforced by the backend."
        right={
          <Button onClick={() => doSelfcheck()} disabled={checking !== null}>
            {checking === "FULL" ? (
              <IconSpinner className="spin h-4 w-4" />
            ) : (
              <IconBolt className="h-4 w-4" />
            )}
            {checking === "FULL" ? "Running…" : "Run full selfcheck"}
          </Button>
        }
      />

      {lastRun && (
        <Card className="mb-4 border-acid/30">
          <div className="flex items-center gap-3 px-5 py-3 text-sm">
            <IconCheck className="h-5 w-5 text-acid" />
            <span className="text-paper">
              Selfcheck finished — {lastRun.passed} live, {lastRun.testing} testing,{" "}
              {lastRun.failed} broken (of {lastRun.total}).
            </span>
          </div>
        </Card>
      )}
      {runError && (
        <Card className="mb-4 border-ember/30">
          <div className="flex items-start gap-3 px-5 py-3 text-sm">
            <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-ember" />
            <span className="text-mist">{runError}</span>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="relative min-w-56 flex-1">
            <Input
              placeholder="Search pairs… (e.g. heic-to-jpg)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="live">Live</option>
            <option value="testing">Testing</option>
            <option value="broken">Broken</option>
          </Select>
          <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="all">All categories</option>
            <option value="image">Images</option>
            <option value="raw">RAW</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
          </Select>
          {!loading && states && (
            <span className="ml-auto text-xs text-mist">
              {filtered.length} of 210 pairs · live {counts.live} · testing {counts.testing} ·
              broken {counts.broken}
            </span>
          )}
        </div>

        {loading ? (
          <Spinner label="Loading pair states…" />
        ) : error ? (
          <ErrorState error={error} onRetry={load} />
        ) : !states ? (
          <EmptyState title="No data" />
        ) : filtered.length === 0 ? (
          <EmptyState title="No pairs match" hint="Try a different search or filter." />
        ) : (
          <div className="scroll-thin max-h-[62vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-panel">
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mist">
                  <th className="px-5 py-3 font-medium">Pair</th>
                  <th className="px-5 py-3 font-medium">Visible</th>
                  <th className="px-5 py-3 font-medium">Plans</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = states[p.slug];
                  if (!st) return null;
                  return (
                    <tr
                      key={p.slug}
                      className="border-b border-line/50 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-2.5">
                        <span className="font-mono text-xs font-medium text-paper">{p.slug}</span>
                        <span className="block text-[11px] text-mist">
                          {FORMAT_BY_SLUG[p.from]?.name ?? p.from} →{" "}
                          {FORMAT_BY_SLUG[p.to]?.name ?? p.to} · {categoryOf(p.from)}
                        </span>
                        {st.note && (
                          <span className="block max-w-xs truncate text-[11px] text-amber-300/80">
                            {st.note}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <Toggle
                          checked={st.visible}
                          onChange={(v) => patch(p.slug, { visible: v })}
                          label={`${p.slug} visible`}
                        />
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex gap-1">
                          {PLAN_IDS.map((pl) => (
                            <button
                              key={pl}
                              onClick={() =>
                                patch(p.slug, {
                                  plans: st.plans.includes(pl)
                                    ? st.plans.filter((x) => x !== pl)
                                    : [...st.plans, pl],
                                })
                              }
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                                st.plans.includes(pl)
                                  ? "bg-acid/15 text-acid"
                                  : "bg-white/5 text-mist/50 hover:text-mist"
                              }`}
                              title={pl}
                            >
                              {pl.slice(0, 1).toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-2.5">
                        <Select
                          value={st.status}
                          onChange={(e) => patch(p.slug, { status: e.target.value })}
                          className="!py-1 text-xs"
                        >
                          <option value="live">Live</option>
                          <option value="testing">Testing</option>
                          <option value="broken">Broken</option>
                        </Select>
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <Badge tone={STATUS_TONES[st.status]}>{st.status}</Badge>
                          <button
                            onClick={() => {
                              setNoteFor(p.slug);
                              setNoteDraft(st.note ?? "");
                            }}
                            className="rounded-md px-2 py-1 text-xs text-mist hover:bg-white/5 hover:text-paper"
                          >
                            Note
                          </button>
                          <button
                            onClick={() => doSelfcheck(p.slug)}
                            disabled={checking !== null}
                            className="rounded-md px-2 py-1 text-xs text-mist hover:bg-white/5 hover:text-paper disabled:opacity-40"
                          >
                            {checking === p.slug ? "Checking…" : "Check"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {noteFor && (
        <Modal title={`Note — ${noteFor}`} onClose={() => setNoteFor(null)}>
          <Textarea
            rows={4}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Internal note about this pair…"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNoteFor(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                patch(noteFor, { note: noteDraft });
                setNoteFor(null);
              }}
            >
              Save note
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
