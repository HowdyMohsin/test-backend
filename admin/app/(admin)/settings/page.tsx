"use client";

import { useEffect, useState } from "react";
import { getSettings, updateSetting } from "@/lib/api";
import { SettingsMap } from "@/lib/types";
import {
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
} from "@/components/ui";
import { IconCheck, IconPlus, IconSpinner } from "@/components/icons";

function SettingCard({
  settingKey,
  value,
  onSaved,
}: {
  settingKey: string;
  value: Record<string, unknown>;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = draft !== JSON.stringify(value, null, 2);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const parsed: unknown = JSON.parse(draft);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Value must be a JSON object, e.g. {\"enabled\": true}");
      }
      await updateSetting(settingKey, parsed as Record<string, unknown>);
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
      <CardHeader title={settingKey} subtitle="setting key" />
      <div className="space-y-3 px-5 py-4">
        <Field label="Value (JSON object)">
          <Textarea
            rows={6}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />
        </Field>
        {error && <p className="text-xs text-ember">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving && <IconSpinner className="spin h-4 w-4" />}
            {saving ? "Saving…" : "Save"}
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    getSettings()
      .then(setSettings)
      .catch((e: Error) => setError(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    const key = newKey.trim();
    if (!key) return;
    setCreating(true);
    try {
      // Keys are created on demand by PATCH.
      await updateSetting(key, {});
      setNewKey("");
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const keys = settings ? Object.keys(settings) : [];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Key/value app settings. Every value is a JSON object — edit carefully."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-52 flex-1">
            <Input
              placeholder="New setting key… (e.g. maintenance)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>
          <Button onClick={create} disabled={creating || !newKey.trim()}>
            {creating ? (
              <IconSpinner className="spin h-4 w-4" />
            ) : (
              <IconPlus className="h-4 w-4" />
            )}
            {creating ? "Creating…" : "Add key"}
          </Button>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Loading settings…" />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={load} />
        </Card>
      ) : keys.length === 0 ? (
        <Card>
          <EmptyState
            title="No settings yet"
            hint="Add a key above — it is created on first save."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {keys.map((k) => (
            <SettingCard key={k} settingKey={k} value={settings![k]} onSaved={load} />
          ))}
        </div>
      )}
    </div>
  );
}
