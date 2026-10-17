"use client";

import { useEffect, useState } from "react";
import { getAdSlots, updateAdSlot } from "@/lib/api";
import { AdSlot } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Spinner,
  Textarea,
  Toggle,
} from "@/components/ui";
import { IconCheck, IconPlus, IconSpinner } from "@/components/icons";

function SlotCard({ slot, onSaved }: { slot: AdSlot; onSaved: () => void }) {
  const [code, setCode] = useState(slot.code);
  const [enabled, setEnabled] = useState(slot.enabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = code !== slot.code || enabled !== slot.enabled;

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateAdSlot(slot.id, { code, enabled });
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
        title={slot.id}
        subtitle="Ad slot id"
        right={
          <div className="flex items-center gap-3">
            {slot.enabled ? (
              <Badge tone="good">enabled</Badge>
            ) : (
              <Badge tone="neutral">disabled</Badge>
            )}
            <Toggle checked={enabled} onChange={setEnabled} label={`${slot.id} enabled`} />
          </div>
        }
      />
      <div className="space-y-3 px-5 py-4">
        <Field label="Ad code (HTML / script)">
          <Textarea
            rows={5}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder='<script src="https://…"></script>'
            spellCheck={false}
          />
        </Field>
        {error && <p className="text-xs text-ember">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving && <IconSpinner className="spin h-4 w-4" />}
            {saving ? "Saving…" : "Save slot"}
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

export default function AdsPage() {
  const [slots, setSlots] = useState<AdSlot[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [newId, setNewId] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getAdSlots()
      .then(setSlots)
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    const id = newId.trim();
    if (!id) return;
    setCreating(true);
    try {
      // Slots are created on demand by PATCH — never 404s.
      await updateAdSlot(id, { code: "", enabled: false });
      setNewId("");
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ads"
        subtitle="Ad slots shown to free users. Code is injected verbatim — paste carefully."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-52 flex-1">
            <Input
              placeholder="New slot id… (e.g. homepage_top)"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>
          <Button onClick={create} disabled={creating || !newId.trim()}>
            {creating ? (
              <IconSpinner className="spin h-4 w-4" />
            ) : (
              <IconPlus className="h-4 w-4" />
            )}
            {creating ? "Creating…" : "Add slot"}
          </Button>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Loading ad slots…" />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={load} />
        </Card>
      ) : !slots || slots.length === 0 ? (
        <Card>
          <EmptyState
            title="No ad slots yet"
            hint="Add a slot id above — it is created on first save."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {slots.map((s) => (
            <SlotCard key={s.id} slot={s} onSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}
