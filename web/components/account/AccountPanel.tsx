"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth";
import { untilReset } from "@/lib/format";

export function AccountPanel() {
  const { user, ready, mode, signIn, signUp, google, devSignIn, signOut } = useAuth();
  const { me } = useApp();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(fn: () => Promise<void> | void) {
    setBusy(true);
    setError("");
    try { await fn(); } catch (e) { const m = e instanceof Error ? e.message : ""; if (m) setError(m); } finally { setBusy(false); }
  }

  if (!ready) return <div className="mx-auto max-w-md px-4 py-24 text-center text-muted">Loading…</div>;

  if (user) {
    const pro = me?.plan.id === "pro";
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded-3xl border border-line bg-white p-7 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary text-2xl font-extrabold uppercase text-primary-ink">{(user.email ?? "?").charAt(0)}</span>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold">{user.email}</p>
              <div className="mt-1"><Badge tone={pro ? "success" : "accent"}>{me?.plan.name ?? "Free"} plan</Badge></div>
            </div>
          </div>
          {me && <p className="mt-5 rounded-xl bg-surface-2 p-3.5 text-sm text-muted">{me.usage.used} of {me.usage.limit} conversions used today. Resets in {untilReset(me.usage.resets_at)}.</p>}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link href="/#all" className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-primary-ink hover:bg-primary-hover">Convert files</Link>
            <Link href="/history" className="rounded-xl border border-line px-4 py-3 text-center text-sm font-bold hover:border-accent">Your history</Link>
            {!pro && <Link href="/pricing" className="rounded-xl border border-line px-4 py-3 text-center text-sm font-bold hover:border-accent sm:col-span-2">See plans</Link>}
          </div>
        </div>
        <Button variant="secondary" className="w-full" onClick={() => signOut()}>Sign out</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-line bg-white p-7 shadow-[var(--shadow-card)]">
      {mode === "none" ? (
        <p className="rounded-xl bg-warn-soft p-4 text-sm font-semibold text-warn">Sign-in is not set up on this site yet.</p>
      ) : (
        <>
          <div role="tablist" aria-label="Account" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {([["signin", "Sign in"], ["signup", "Create account"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setError(""); }} className={`rounded-lg py-2.5 text-sm font-bold ${tab === k ? "bg-white text-primary shadow-sm" : "text-muted hover:text-ink"}`}>{l}</button>
            ))}
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight">{tab === "signin" ? "Welcome back" : "Create your free account"}</h1>
          <p className="mt-1 text-sm text-muted">{tab === "signin" ? "Sign in to see your history on every device." : "Free accounts convert more files every day. No card needed."}</p>
          <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); void run(() => (mode === "dev" ? devSignIn(email.trim()) : tab === "signin" ? signIn(email.trim(), password) : signUp(email.trim(), password))); }}>
            <Input type="email" required autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {mode === "firebase" && <Input type="password" required minLength={6} autoComplete={tab === "signin" ? "current-password" : "new-password"} placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy}>{mode === "dev" ? "Continue (test login)" : tab === "signin" ? "Sign in" : "Create account"}</Button>
            {mode === "firebase" && <Button type="button" variant="secondary" size="lg" className="w-full" disabled={busy} onClick={() => void run(google)}>Continue with Google</Button>}
          </form>
          {mode === "dev" && <p className="mt-4 text-xs text-muted">Test login: any email works. Use admin@gmail.com to try the Pro plan.</p>}
        </>
      )}
    </div>
  );
}
