"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Eye, EyeOff, FolderClock, KeyRound, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth";
import { untilReset } from "@/lib/format";

type AuthTab = "signin" | "signup";

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm font-bold text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({ visible, onToggle, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { visible: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={`pr-12 ${className}`} />
      <button type="button" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted transition hover:text-ink">
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

function PasswordForm({ required, onSave }: { required: boolean; onSave: (current: string, next: string) => Promise<void> }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (next !== confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await onSave(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setSaved(true);
    } catch (issue) {
      setError(messageOf(issue, "Could not update your password."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-line pt-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-primary"><KeyRound className="size-5" aria-hidden /></span>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{required ? "Set your own password" : "Password"}</h2>
          <p className="mt-1 text-sm text-muted">{required ? "Your temporary password must be replaced before you can convert files." : "Changing your password signs out your other active sessions."}</p>
        </div>
      </div>
      <form className="mt-6 max-w-2xl space-y-4" onSubmit={(event) => void submit(event)}>
        <Field label="Current password">
          <PasswordInput required autoComplete="current-password" className="h-12 px-4" placeholder="Enter your current password" value={current} onChange={(event) => setCurrent(event.target.value)} visible={showCurrent} onToggle={() => setShowCurrent((shown) => !shown)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password">
            <PasswordInput required minLength={6} autoComplete="new-password" className="h-12 px-4" placeholder="Create a new password" value={next} onChange={(event) => setNext(event.target.value)} visible={showNext} onToggle={() => setShowNext((shown) => !shown)} />
          </Field>
          <Field label="Confirm new password">
            <PasswordInput required minLength={6} autoComplete="off" className="h-12 px-4" placeholder="Repeat your new password" value={confirm} onChange={(event) => setConfirm(event.target.value)} visible={showConfirm} onToggle={() => setShowConfirm((shown) => !shown)} />
          </Field>
        </div>
        <p className="text-xs leading-5 text-muted">Use at least 6 characters. Choose something only you know.</p>
        {error ? <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{error}</p> : null}
        {saved ? <p role="status" className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success"><CheckCircle2 className="size-4" aria-hidden />Password updated. Other signed-in sessions were ended.</p> : null}
        <Button type="submit" size="lg" loading={busy} className="w-full sm:w-auto">{required ? "Save new password" : "Update password"}</Button>
      </form>
    </section>
  );
}

function AccountBenefits() {
  const benefits = [
    { icon: FolderClock, title: "Keep your history", text: "Find your completed conversions when you need them." },
    { icon: ArrowRight, title: "Continue faster", text: "Move between converting and downloading without losing your place." },
    { icon: ShieldCheck, title: "Keep your account secure", text: "Use a private password and change it whenever you need." },
  ];

  return (
    <aside className="hidden min-h-full flex-col justify-between bg-surface-2 p-9 lg:flex">
      <div>
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-ink shadow-sm"><LockKeyhole className="size-6" aria-hidden /></span>
        <p className="mt-8 max-w-xs text-4xl font-extrabold tracking-[-0.045em] text-ink">Your conversions, in one place.</p>
        <p className="mt-4 max-w-sm text-base leading-7 text-muted">Create an account to keep your conversion history and manage your account securely.</p>
      </div>
      <ul className="mt-10 space-y-6">
        {benefits.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm"><Icon className="size-5" aria-hidden /></span>
            <span><strong className="block text-sm text-ink">{title}</strong><span className="mt-0.5 block text-sm leading-5 text-muted">{text}</span></span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function AuthCard({ onSignIn, onSignUp }: { onSignIn: (email: string, password: string) => Promise<void>; onSignUp: (email: string, password: string) => Promise<void> }) {
  const [tab, setTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const creating = tab === "signup";

  function switchTab(nextTab: AuthTab) {
    setTab(nextTab);
    setError("");
    setPassword("");
    setConfirm("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (creating && password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (creating) await onSignUp(email.trim(), password);
      else await onSignIn(email.trim(), password);
    } catch (issue) {
      setError(messageOf(issue, creating ? "Could not create your account." : "Could not sign in. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p-6 sm:p-9 lg:p-11">
      <div role="tablist" aria-label="Account access" className="grid grid-cols-2 rounded-xl bg-surface-2 p-1">
        {([ ["signin", "Sign in"], ["signup", "Create account"] ] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => switchTab(key)} className={`h-11 rounded-lg text-sm font-bold transition ${tab === key ? "bg-white text-primary shadow-sm" : "text-muted hover:text-ink"}`}>{label}</button>
        ))}
      </div>
      <div className="mt-8 max-w-md">
        <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-ink">{creating ? "Create your free account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{creating ? "Save your conversion history and manage your account in one secure place." : "Sign in to continue with your account and conversion history."}</p>
      </div>
      <form className="mt-8 max-w-md space-y-5" onSubmit={(event) => void submit(event)}>
        <Field label="Email address">
          <Input type="email" required autoComplete="email" className="h-12 px-4" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Password">
          <PasswordInput required minLength={creating ? 6 : 1} autoComplete={creating ? "new-password" : "current-password"} className="h-12 px-4" placeholder={creating ? "Create a password" : "Enter your password"} value={password} onChange={(event) => setPassword(event.target.value)} visible={showPassword} onToggle={() => setShowPassword((shown) => !shown)} />
        </Field>
        {creating ? <>
          <Field label="Confirm password">
            <PasswordInput required minLength={6} autoComplete="off" className="h-12 px-4" placeholder="Repeat your password" value={confirm} onChange={(event) => setConfirm(event.target.value)} visible={showConfirm} onToggle={() => setShowConfirm((shown) => !shown)} />
          </Field>
          <p className="text-xs leading-5 text-muted">Use at least 6 characters. Choose something only you know.</p>
        </> : null}
        {error ? <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={busy}>{creating ? "Create account" : "Sign in"}</Button>
      </form>
      <p className="mt-6 flex max-w-md items-center gap-2 text-xs leading-5 text-muted"><LockKeyhole className="size-4 shrink-0 text-primary" aria-hidden />Your account is protected with a secure sign-in session.</p>
    </section>
  );
}

function SignedInAccount({ email, mustChangePassword, onSavePassword, onSignOut }: { email: string | null; mustChangePassword: boolean; onSavePassword: (current: string, next: string) => Promise<void>; onSignOut: () => Promise<void> }) {
  const { me } = useApp();
  const planName = me?.plan.name ?? "Free";
  const usage = me ? `${me.usage.used} of ${me.usage.limit}` : "Loading";
  const usageDetail = me ? `conversions used today · resets in ${untilReset(me.usage.resets_at)}` : "Loading account details…";

  return (
    <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[28px] border border-line bg-white shadow-[var(--shadow-card)] lg:grid-cols-[290px_1fr]">
      <aside className="bg-surface-2 p-6 sm:p-8">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-ink shadow-sm"><ShieldCheck className="size-6" aria-hidden /></span>
        <p className="mt-5 truncate text-lg font-extrabold text-ink" title={email ?? undefined}>{email}</p>
        <p className="mt-1 text-sm font-semibold text-primary">{planName} plan</p>
        <div className="mt-7 rounded-2xl border border-[#cdddf8] bg-white/70 p-4">
          <p className="text-2xl font-extrabold tracking-tight text-ink">{usage}</p>
          <p className="mt-1 text-sm leading-5 text-muted">{usageDetail}</p>
        </div>
        <nav aria-label="Account actions" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Link href="/#all" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-ink transition hover:bg-primary-hover"><ArrowRight className="size-4" aria-hidden />Convert files</Link>
          <Link href="/history" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink transition hover:border-accent"><FolderClock className="size-4" aria-hidden />View history</Link>
          <Link href="/pricing" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-ink transition hover:bg-white/70"><ArrowRight className="size-4" aria-hidden />View plans</Link>
        </nav>
        <Button variant="ghost" className="mt-3 w-full justify-start px-3 text-muted hover:text-ink" onClick={() => void onSignOut()}><LogOut className="size-4" aria-hidden />Sign out</Button>
      </aside>
      <main className="p-6 sm:p-9 lg:p-11">
        {mustChangePassword ? <p role="alert" className="mb-7 rounded-2xl border border-warn/20 bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">Your temporary password must be changed before you can use the account.</p> : null}
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-ink">Account settings</h1>
        <div className="mt-6 grid gap-4 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Account</p><p className="mt-1 break-all font-bold text-ink">{email}</p></div>
          <div className="border-line sm:border-l sm:pl-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Plan</p><p className="mt-1 font-bold text-ink">{planName} plan</p><Link href="/pricing" className="mt-1 inline-flex text-sm font-bold text-primary hover:text-primary-hover">View plans <ArrowRight className="ml-1 size-4" aria-hidden /></Link></div>
        </div>
        <PasswordForm required={mustChangePassword} onSave={onSavePassword} />
      </main>
    </div>
  );
}

export function AccountPanel() {
  const { user, ready, signIn, signUp, changePassword, signOut } = useAuth();

  if (!ready) return <div className="mx-auto max-w-md py-24 text-center text-sm font-semibold text-muted">Loading your account…</div>;
  if (user) return <SignedInAccount email={user.email} mustChangePassword={user.mustChangePassword} onSavePassword={changePassword} onSignOut={signOut} />;

  return (
    <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[28px] border border-line bg-white shadow-[var(--shadow-card)] lg:grid-cols-[0.88fr_1.12fr]">
      <AccountBenefits />
      <AuthCard onSignIn={signIn} onSignUp={signUp} />
    </div>
  );
}
