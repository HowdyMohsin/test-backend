"use client";

import { useState } from "react";
import { Card, Confirm, Loading, PageHeader, Pager, Table, ago } from "@/components/data/Bits";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useLoad } from "@/hooks/useLoad";
import { useToast } from "@/hooks/useToast";
import { ApiError, adminApi } from "@/lib/api";

type U = { id: string; email: string | null; plan: string; banned: boolean; used_today: number; created_at: string; last_seen_at: string };
type List = { total: number; page: number; users: U[] };
type Wait = { entries: { id: number; email: string; plan: string; source: string | null; created_at: string }[] };

export default function UsersPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"users" | "waitlist">("users");
  const [del, setDel] = useState<U | null>(null);
  const { data, error, reload } = useLoad<List>(`/users?q=${encodeURIComponent(q)}&plan=${plan}&page=${page}`);
  const wait = useLoad<Wait>(tab === "waitlist" ? "/users/waitlist/all" : null);
  const planList = useLoad<{ plans: { id: string; name: string }[] }>("/plans");
  const plans = (planList.data?.plans ?? [{ id: "free", name: "Free" }, { id: "pro", name: "Pro" }]).filter((p) => p.id !== "anonymous");

  async function act(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast(ok); reload(true); } catch (e) { toast(e instanceof ApiError ? e.message : "Something went wrong.", true); }
  }
  return (
    <>
      <PageHeader title="Users" subtitle="Everyone who signed in. Anonymous visitors are not listed." />
      <div className="mb-4 flex gap-2">
        {(["users", "waitlist"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === t ? "bg-primary text-primary-ink" : "bg-surface-2 text-muted"}`}>{t === "users" ? "Users" : "Pro waiting list"}</button>)}
      </div>
      {tab === "waitlist" ? (
        !wait.data ? <Loading error={wait.error} /> : (
          <Card><p className="mb-3 text-sm text-muted">People who clicked Upgrade while payments are off ({wait.data.entries.length}).</p>
            <Table head={["Email", "Plan", "From", "When"]}>{wait.data.entries.map((w) => <tr key={w.id}><td className="px-3 py-2 font-medium">{w.email}</td><td className="px-3 py-2">{w.plan}</td><td className="px-3 py-2 text-muted">{w.source ?? "-"}</td><td className="px-3 py-2 text-muted">{ago(w.created_at)}</td></tr>)}</Table></Card>
        )
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Input className="max-w-64" placeholder="Search by email" aria-label="Search users" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <Select className="max-w-36" aria-label="Plan" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}><option value="">All plans</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          </div>
          {!data ? <Loading error={error} /> : (
            <>
              <Table head={["Email", "Plan", "Today", "Joined", "Last seen", "Status", "Actions"]}>
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2 font-medium">{u.email ?? u.id}</td>
                    <td className="px-3 py-2"><Select className="h-8 w-24 text-xs" aria-label={`Plan for ${u.email}`} value={u.plan} onChange={(e) => act(() => adminApi.patch(`/users/${u.id}`, { plan: e.target.value }), "Plan changed.")}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></td>
                    <td className="px-3 py-2 tabular-nums">{u.used_today}</td>
                    <td className="px-3 py-2 text-muted">{ago(u.created_at)}</td>
                    <td className="px-3 py-2 text-muted">{ago(u.last_seen_at)}</td>
                    <td className="px-3 py-2">{u.banned ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.post(`/users/${u.id}/reset-quota`), "Today's count reset.")}>Reset today</Button>
                      <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.patch(`/users/${u.id}`, { banned: !u.banned }), u.banned ? "Unblocked." : "Blocked.")}>{u.banned ? "Unblock" : "Block"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setDel(u)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </Table>
              {data.users.length === 0 && <p className="p-6 text-center text-sm text-muted">No users match.</p>}
              <Pager page={data.page} total={data.total} onPage={setPage} />
            </>
          )}
        </>
      )}
      {del && <Confirm title="Delete this user?" text={`${del.email ?? del.id} and all of their files and counts will be deleted. This cannot be undone.`} action="Delete user" onClose={() => setDel(null)} onConfirm={() => act(() => adminApi.del(`/users/${del.id}`), "User deleted.")} />}
    </>
  );
}
