"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminLogin } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { IconAlert, IconBolt, IconSpinner } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const me = await adminLogin(email.trim(), password);
      // Land on the first section this account may access.
      const first = me.tabs[0] ?? "dashboard";
      router.replace(`/${first}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      {/* ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(600px 300px at 50% 20%, rgba(200,255,61,0.07), transparent 70%)",
        }}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-line bg-panel p-8 shadow-deck">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-acid text-ink">
            <IconBolt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-paper">QuickImgConvert</h1>
            <p className="text-[11px] uppercase tracking-widest text-mist">Admin Console</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-mist">
              Email
            </label>
            <Input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-mist">
              Password
            </label>
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-ember/30 bg-ember/10 px-3 py-2 text-xs text-ember">
              <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy && <IconSpinner className="spin h-4 w-4" />}
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[11px] text-mist/70">
          Separate from user accounts. Sessions last 12 hours.
        </p>
      </div>
    </div>
  );
}
