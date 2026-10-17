"use client";

import { useState } from "react";
import { getMessages, getPlans, updateMessage, updatePlan } from "@/lib/api";
import { Messages, Plan } from "@/lib/types";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  LoadGate,
  PageHeader,
  Textarea,
  useAsync,
} from "@/components/ui";
import { IconCheck, IconSpinner } from "@/components/icons";

const LIMIT_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "daily", label: "Conversions / day", hint: "0 = unlimited is NOT supported; use a high number" },
  { key: "image_mb", label: "Max image/audio MB", hint: "per file" },
  { key: "audio_mb", label: "Max audio MB", hint: "per file" },
  { key: "video_mb", label: "Max video MB", hint: "per file" },
  { key: "video_max_sec", label: "Max video seconds", hint: "duration cap" },
  { key: "batch", label: "Batch size", hint: "files per batch" },
];

function PlanCard({ plan, onSaved }: { plan: Plan; onSaved: () => void }) {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState((plan.price_cents / 100).toFixed(2));
  const [limits, setLimits] = useState<Record<string, string>>(
    Object.fromEntries(
      LIMIT_FIELDS.map((f) => [f.key, String(plan.limits[f.key] ?? "")])
    )
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    name !== plan.name ||
    price !== (plan.price_cents / 100).toFixed(2) ||
    LIMIT_FIELDS.some((f) => limits[f.key] !== String(plan.limits[f.key] ?? ""));

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const patch: { name?: string; price_cents?: number; limits?: Record<string, number> } = {};
      if (name !== plan.name) patch.name = name.slice(0, 64);
      const cents = Math.round(parseFloat(price) * 100);
      if (!Number.isNaN(cents) && cents !== plan.price_cents) {
        if (cents < 0) throw new Error("Price cannot be negative");
        patch.price_cents = cents;
      }
      const lim: Record<string, number> = {};
      for (const f of LIMIT_FIELDS) {
        const raw = limits[f.key].trim();
        if (raw === "") continue;
        const n = Number(raw);
        if (Number.isNaN(n)) throw new Error(`Limit "${f.label}" must be a number`);
        if (String(plan.limits[f.key] ?? "") !== raw) lim[f.key] = n;
      }
      if (Object.keys(lim).length > 0) patch.limits = lim;
      await updatePlan(plan.id, patch);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={plan.name}
        subtitle={`id: ${plan.id}`}
        right={
          <span className="font-mono text-xs text-mist">
            {plan.id === "anonymous" ? "guests" : plan.id === "free" ? "signed-in" : "paid"}
          </span>
        }
      />
      <div className="space-y-4 px-5 py-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Display name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={64} />
          </Field>
          <Field label="Price (USD / month)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {LIMIT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              <Input
                type="number"
                min="0"
                value={limits[f.key]}
                onChange={(e) => setLimits({ ...limits, [f.key]: e.target.value })}
                placeholder={f.hint}
                title={f.hint}
              />
            </Field>
          ))}
        </div>
        {error && <p className="text-xs text-ember">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving && <IconSpinner className="spin h-4 w-4" />}
            {saving ? "Saving…" : "Save plan"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-acid">
              <IconCheck className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function MessageRow({
  msgKey,
  text,
  onSaved,
}: {
  msgKey: string;
  text: string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateMessage(msgKey, draft);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b border-line/50 px-5 py-4 last:border-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs font-medium text-paper">{msgKey}</span>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-acid">
              <IconCheck className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          <Button variant="subtle" onClick={save} disabled={draft === text || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      <Textarea
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Message text shown to users…"
      />
      {error && <p className="mt-1 text-xs text-ember">{error}</p>}
    </div>
  );
}

export default function PlansPage() {
  const plans = useAsync(() => getPlans());
  const messages = useAsync(() => getMessages());

  return (
    <div>
      <PageHeader
        title="Plans & Messages"
        subtitle="Plan limits are enforced by the backend before every conversion. Messages are the texts users see on limits."
      />

      <h2 className="mb-3 font-display text-sm font-semibold text-paper">Plans</h2>
      <LoadGate state={plans} loadingLabel="Loading plans…">
        {(list: Plan[]) =>
          list.length === 0 ? (
            <Card>
              <EmptyState title="No plans found" hint="Seed the database first (api seed)." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {list.map((p) => (
                <PlanCard key={p.id} plan={p} onSaved={plans.reload} />
              ))}
            </div>
          )
        }
      </LoadGate>

      <h2 className="mb-3 mt-8 font-display text-sm font-semibold text-paper">Messages</h2>
      <Card>
        <LoadGate state={messages} loadingLabel="Loading messages…">
          {(msgs: Messages) => {
            const keys = Object.keys(msgs);
            if (keys.length === 0)
              return <EmptyState title="No messages" hint="Seed the database first." />;
            return (
              <div>
                {keys.map((k) => (
                  <MessageRow key={k} msgKey={k} text={msgs[k]} onSaved={messages.reload} />
                ))}
              </div>
            );
          }}
        </LoadGate>
      </Card>
    </div>
  );
}
