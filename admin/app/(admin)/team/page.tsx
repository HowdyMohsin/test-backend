"use client";

import { useEffect, useState } from "react";
import {
  adminMe,
  createTeamMember,
  deleteTeamMember,
  getTeam,
  updateTeamMember,
  type TeamCreate,
} from "@/lib/api";
import { ALL_TABS, TeamMember, TeamRole } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Toggle,
} from "@/components/ui";
import { IconPlus, IconSpinner, IconTrash } from "@/components/icons";

const ROLE_TONES: Record<TeamRole, "good" | "info" | "neutral"> = {
  owner: "good",
  admin: "info",
  viewer: "neutral",
};

export default function TeamPage() {
  const [rows, setRows] = useState<TeamMember[] | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([getTeam(), adminMe()])
      .then(([team, me]) => {
        setRows(team);
        setIsOwner(me.user.role === "owner");
        setSelfId(me.user.id);
      })
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  };

  // initial load
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRole = async (m: TeamMember, role: TeamRole) => {
    try {
      const updated = await updateTeamMember(m.id, { role });
      setRows((r) => (r ? r.map((x) => (x.id === m.id ? updated : x)) : r));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  };

  const setDisabled = async (m: TeamMember, disabled: boolean) => {
    try {
      const updated = await updateTeamMember(m.id, { disabled });
      setRows((r) => (r ? r.map((x) => (x.id === m.id ? updated : x)) : r));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (m: TeamMember) => {
    if (!confirm(`Remove ${m.email} from the team?`)) return;
    try {
      await deleteTeamMember(m.id);
      setRows((r) => (r ? r.filter((x) => x.id !== m.id) : r));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle={
          isOwner
            ? "Manage admin accounts. Only owners can change the team."
            : "View admin accounts. Only the owner can change the team."
        }
        right={
          isOwner && (
            <Button onClick={() => setShowAdd(true)}>
              <IconPlus className="h-4 w-4" /> Add member
            </Button>
          )
        }
      />

      <Card>
        {loading ? (
          <Spinner label="Loading team…" />
        ) : error ? (
          <ErrorState error={error} onRetry={load} />
        ) : !rows || rows.length === 0 ? (
          <EmptyState title="No team members" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mist">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Sections</th>
                <th className="px-5 py-3 font-medium">Active</th>
                {isOwner && <th className="px-5 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const self = m.id === selfId;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-line/50 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-2.5">
                      <span className="font-mono text-xs text-paper">{m.email}</span>
                      {self && (
                        <span className="ml-2 text-[11px] text-mist">(you)</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {isOwner && !self ? (
                        <Select
                          value={m.role}
                          onChange={(e) => setRole(m, e.target.value as TeamRole)}
                          className="!py-1 text-xs"
                        >
                          <option value="owner">owner</option>
                          <option value="admin">admin</option>
                          <option value="viewer">viewer</option>
                        </Select>
                      ) : (
                        <Badge tone={ROLE_TONES[m.role]}>{m.role}</Badge>
                      )}
                    </td>
                    <td className="max-w-64 px-5 py-2.5">
                      <span className="text-xs text-mist">
                        {m.role === "owner"
                          ? "all sections"
                          : m.allowed_tabs.length > 0
                            ? m.allowed_tabs.join(", ")
                            : "none"}
                      </span>
                      {isOwner && !self && m.role !== "owner" && (
                        <TabEditor member={m} onSaved={load} />
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      {isOwner && !self ? (
                        <Toggle
                          checked={!m.disabled}
                          onChange={(v) => setDisabled(m, !v)}
                          label={`${m.email} active`}
                        />
                      ) : m.disabled ? (
                        <Badge tone="bad">disabled</Badge>
                      ) : (
                        <Badge tone="good">active</Badge>
                      )}
                    </td>
                    {isOwner && (
                      <td className="px-5 py-2.5">
                        {!self && (
                          <button
                            onClick={() => remove(m)}
                            className="rounded-md p-1.5 text-mist hover:bg-ember/10 hover:text-ember"
                            title={`Remove ${m.email}`}
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {showAdd && (
        <AddMemberModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function TabEditor({ member, onSaved }: { member: TeamMember; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [tabs, setTabs] = useState<string[]>(member.allowed_tabs);
  const [saving, setSaving] = useState(false);

  const toggle = (t: string) =>
    setTabs((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const save = async () => {
    setSaving(true);
    try {
      await updateTeamMember(member.id, { allowed_tabs: tabs });
      setOpen(false);
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1">
      <button
        onClick={() => {
          setTabs(member.allowed_tabs);
          setOpen(true);
        }}
        className="text-[11px] text-cyanx hover:underline"
      >
        Edit sections
      </button>
      {open && (
        <Modal title={`Sections — ${member.email}`} onClose={() => setOpen(false)}>
          <div className="space-y-2">
            {ALL_TABS.map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-3 text-sm text-paper">
                <input
                  type="checkbox"
                  checked={tabs.includes(t)}
                  onChange={() => toggle(t)}
                  className="h-4 w-4 accent-[#c8ff3d]"
                />
                {t}
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AddMemberModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<TeamRole>("admin");
  const [tabs, setTabs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (t: string) =>
    setTabs((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: TeamCreate = {
        email: email.trim(),
        password,
        role,
        allowed_tabs: role === "owner" ? [] : tabs,
      };
      await createTeamMember(body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add team member" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
          />
        </Field>
        <Field label="Temporary password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set a strong password"
          />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
            <option value="admin">admin — sections below</option>
            <option value="viewer">viewer — sections below</option>
            <option value="owner">owner — all sections</option>
          </Select>
        </Field>
        {role !== "owner" && (
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-mist">
              Sections
            </span>
            <div className="grid grid-cols-3 gap-2">
              {ALL_TABS.map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2 text-xs text-paper"
                >
                  <input
                    type="checkbox"
                    checked={tabs.includes(t)}
                    onChange={() => toggle(t)}
                    className="h-4 w-4 accent-[#c8ff3d]"
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-xs text-ember">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !email.trim() || !password}>
            {saving && <IconSpinner className="spin h-4 w-4" />}
            {saving ? "Adding…" : "Add member"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
