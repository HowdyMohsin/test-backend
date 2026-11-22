"use client";

import { useState } from "react";
import { Card, Confirm, Loading, PageHeader, ago } from "@/components/data/Bits";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { useLoad } from "@/hooks/useLoad";
import { useToast } from "@/hooks/useToast";
import { ApiError, adminApi } from "@/lib/api";

type M = { id: string; email: string; role: string; tabs: string[]; active: boolean; must_change_password: boolean; last_login_at: string | null };
type Data = { members: M[]; tabs: string[] };

function Tabs({ all, value, onChange }: { all: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return <div className="flex flex-wrap gap-x-4 gap-y-1">{all.map((t) => <label key={t} className="flex items-center gap-1.5 text-sm capitalize"><input type="checkbox" checked={value.includes(t)} onChange={(e) => onChange(e.target.checked ? [...value, t] : value.filter((x) => x !== t))} />{t}</label>)}</div>;
}

export default function TeamPage() {
  const toast = useToast();
  const { data, error, reload } = useLoad<Data>("/team");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [tabs, setTabs] = useState<string[]>([]);
  const [del, setDel] = useState<M | null>(null);
  if (!data) return <Loading error={error} />;
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); reload(true); } catch (e) { toast(e instanceof ApiError ? e.message : "Something went wrong.", true); } };
  return (
    <>
      <PageHeader title="Team" subtitle="Super admins can do everything. Staff can only open the sections you tick." />
      <Card title="Add a team member" className="mb-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Input type="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" minLength={12} placeholder="Temporary password (12+ characters)" aria-label="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}><option value="staff">Staff</option><option value="super_admin">Super admin</option></Select>
          <Button disabled={!email || password.length < 12} onClick={() => act(async () => { await adminApi.post("/team", { email, password, role, tabs }); setEmail(""); setPassword(""); setTabs([]); }, "Member added. They must change the password at first sign in.")}>Add member</Button>
        </div>
        {role === "staff" && <div className="mt-3"><p className="mb-1 text-sm font-medium">Sections they can open</p><Tabs all={data.tabs} value={tabs} onChange={setTabs} /></div>}
      </Card>
      <div className="space-y-3">
        {data.members.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-semibold">{m.email} {!m.active && <Badge tone="danger">Disabled</Badge>}</p><p className="text-xs text-muted">Last sign in: {ago(m.last_login_at)}</p></div>
              <div className="flex flex-wrap items-center gap-3">
                <Select className="h-9 w-36" aria-label={`Role of ${m.email}`} value={m.role} onChange={(e) => act(() => adminApi.patch(`/team/${m.id}`, { role: e.target.value }), "Role changed.")}><option value="staff">Staff</option><option value="super_admin">Super admin</option></Select>
                <label className="flex items-center gap-2 text-sm">Active <Switch checked={m.active} onChange={(v) => act(() => adminApi.patch(`/team/${m.id}`, { active: v }), v ? "Enabled." : "Disabled.")} label={`${m.email} active`} /></label>
                <Button size="sm" variant="ghost" onClick={() => { const p = window.prompt("New temporary password (12+ characters, three character types)"); if (p && p.length >= 12) act(() => adminApi.patch(`/team/${m.id}`, { new_password: p }), "Password reset."); }}>Reset password</Button>
                <Button size="sm" variant="ghost" onClick={() => setDel(m)}>Remove</Button>
              </div>
            </div>
            {m.role === "staff" && <div className="mt-3 border-t border-line pt-3"><Tabs all={data.tabs} value={m.tabs} onChange={(v) => act(() => adminApi.patch(`/team/${m.id}`, { tabs: v }), "Access updated.")} /></div>}
          </Card>
        ))}
      </div>
      {del && <Confirm title="Remove this member?" text={`${del.email} will lose access immediately.`} action="Remove" onClose={() => setDel(null)} onConfirm={() => act(() => adminApi.del(`/team/${del.id}`), "Member removed.")} />}
    </>
  );
}
