"use client";

import { useState } from "react";
import { Card, Confirm, Loading, PageHeader, Pager, Table, ago } from "@/components/data/Bits";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useLoad } from "@/hooks/useLoad";
import { useToast } from "@/hooks/useToast";
import { ApiError, adminApi } from "@/lib/api";

type U = { id: string; email: string | null; plan: string; banned: boolean; password_set: boolean; must_change_password: boolean; used_today: number; created_at: string; last_seen_at: string };
type List = { total: number; page: number; users: U[] };
type Wait = { entries: { id: number; email: string; plan: string; source: string | null; created_at: string }[] };

export default function UsersPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"users" | "waitlist">("users");
  const [del, setDel] = useState<U | null>(null);
  const [reset, setReset] = useState<U | null>(null);
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
                    <td className="px-3 py-2">
                      {u.banned ? <Badge tone="danger">Blocked</Badge> : u.must_change_password ? <Badge tone="warn">Password reset required</Badge> : !u.password_set ? <Badge tone="warn">No local password</Badge> : <Badge tone="success">Active</Badge>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.post(`/users/${u.id}/reset-quota`), "Today's count reset.")}>Reset today</Button>
                      <Button size="sm" variant="ghost" onClick={() => act(() => adminApi.patch(`/users/${u.id}`, { banned: !u.banned }), u.banned ? "Unblocked." : "Blocked.")}>{u.banned ? "Unblock" : "Block"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setReset(u)}>Reset password</Button>
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
      {reset && <ResetPassword user={reset} onClose={() => setReset(null)} onDone={() => { setReset(null); reload(true); }} />}
    </>
  );
}

function ResetPassword({ user, onClose, onDone }: { user: U; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title="Set a temporary password" onClose={onClose}>
      <h2 className="text-lg font-bold">Set a temporary password</h2>
      <p className="mt-2 text-sm text-muted">Set a one-time password for {user.email ?? user.id}. It must be shared through a secure channel. Their other sessions will end, and they must set their own password after signing in.</p>
      <form className="mt-5 space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (password !== confirm) return setError("The passwords do not match.");
        setBusy(true);
        try {
          await adminApi.patch(`/users/${user.id}`, { new_password: password });
          toast("Temporary password set. Existing sessions were ended.");
          onDone();
        } catch (e) {
          setError(e instanceof ApiError ? e.message : "Could not reset the password.");
        } finally {
          setBusy(false);
        }
      }}>
        <Input type="password" required minLength={12} autoComplete="new-password" placeholder="Temporary password" aria-label="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input type="password" required minLength={12} autoComplete="new-password" placeholder="Confirm temporary password" aria-label="Confirm temporary password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <p className="text-xs text-muted">At least 12 characters and three of: lowercase, uppercase, number, symbol.</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Set temporary password</Button></div>
      </form>
    </Modal>
  );
}
