"use client";

import { useEffect, useState } from "react";
import { getPlans, getUsers, getUserStats, updateUser } from "@/lib/api";
import { SiteUser } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadGate,
  PageHeader,
  Select,
  Spinner,
  useAsync,
} from "@/components/ui";

const PAGE_SIZE = 50;

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [bannedFilter, setBannedFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<SiteUser[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const stats = useAsync(() => getUserStats());
  const plans = useAsync(() => getPlans());

  const load = (newOffset = offset) => {
    setLoading(true);
    setError(null);
    getUsers({
      q: q || undefined,
      plan: planFilter || undefined,
      banned: bannedFilter === "" ? undefined : bannedFilter === "true",
      limit: PAGE_SIZE,
      offset: newOffset,
    })
      .then(setRows)
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(0);
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFilter, bannedFilter]);

  const search = () => {
    setOffset(0);
    load(0);
  };

  const page = (dir: 1 | -1) => {
    const next = Math.max(0, offset + dir * PAGE_SIZE);
    setOffset(next);
    load(next);
  };

  const changePlan = async (u: SiteUser, plan_id: string) => {
    setSavingId(u.id);
    try {
      const updated = await updateUser(u.id, { plan_id });
      setRows((r) => (r ? r.map((x) => (x.id === u.id ? updated : x)) : r));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  const toggleBan = async (u: SiteUser) => {
    setSavingId(u.id);
    try {
      const updated = await updateUser(u.id, { banned: !u.banned });
      setRows((r) => (r ? r.map((x) => (x.id === u.id ? updated : x)) : r));
      stats.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Firebase users and anonymous accounts. Plan changes apply immediately."
      />

      <LoadGate state={stats} loadingLabel="Loading user stats…">
        {(s) => (
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat label="Total users" value={String(s.total)} />
            <MiniStat label="Banned" value={String(s.banned)} />
            {Object.entries(s.by_plan)
              .slice(0, 2)
              .map(([k, v]) => (
                <MiniStat key={k} label={`Plan: ${k}`} value={String(v)} />
              ))}
          </div>
        )}
      </LoadGate>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-52 flex-1">
            <Input
              placeholder="Search email or Firebase UID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </div>
          <Select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
            <option value="">All plans</option>
            <option value="anonymous">anonymous</option>
            <option value="free">free</option>
            <option value="pro">pro</option>
          </Select>
          <Select value={bannedFilter} onChange={(e) => setBannedFilter(e.target.value)}>
            <option value="">All users</option>
            <option value="false">Active</option>
            <option value="true">Banned</option>
          </Select>
          <Button variant="subtle" onClick={search}>
            Search
          </Button>
        </div>

        {loading ? (
          <Spinner label="Loading users…" />
        ) : error ? (
          <ErrorState error={error} onRetry={() => load()} />
        ) : !rows || rows.length === 0 ? (
          <EmptyState title="No users found" hint="Try a different search or filter." />
        ) : (
          <>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mist">
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-line/50 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-2.5">
                        <span className="font-mono text-xs text-paper">
                          {u.email ?? "(no email)"}
                        </span>
                        <span className="block max-w-64 truncate font-mono text-[11px] text-mist/70">
                          {u.firebase_uid ?? u.id}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        {plans.data ? (
                          <Select
                            value={u.plan_id}
                            disabled={savingId === u.id}
                            onChange={(e) => changePlan(u, e.target.value)}
                            className="!py-1 text-xs"
                          >
                            {plans.data.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.id}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Badge tone="info">{u.plan_id}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        {u.banned ? (
                          <Badge tone="bad">banned</Badge>
                        ) : (
                          <Badge tone="good">active</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2.5 text-xs text-mist">
                        {new Date(u.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-2.5">
                        <Button
                          variant={u.banned ? "subtle" : "danger"}
                          onClick={() => toggleBan(u)}
                          disabled={savingId === u.id}
                          className="!px-2.5 !py-1 text-xs"
                        >
                          {savingId === u.id ? "…" : u.banned ? "Unban" : "Ban"}
                        </Button>
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
                <Button
                  variant="subtle"
                  onClick={() => page(1)}
                  disabled={rows.length < PAGE_SIZE}
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
