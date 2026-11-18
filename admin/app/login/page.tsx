"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api";
import { useAdmin } from "@/lib/auth";

export default function LoginPage() {
  const { admin, ready, login } = useAdmin();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (ready && admin) router.replace("/");
  }, [ready, admin, router]);
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form className="w-full max-w-sm space-y-4 rounded-[var(--radius-card)] border border-line bg-surface p-7 shadow-[var(--shadow-card)]"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try { await login(email.trim(), password); } catch (err) { setError(err instanceof ApiError ? err.message : "Could not sign in."); } finally { setBusy(false); }
        }}>
        <div>
          <span className="grid size-10 place-items-center rounded-xl bg-primary font-bold text-primary-ink">Q</span>
          <h1 className="mt-4 text-xl font-bold">Admin sign in</h1>
          <p className="text-sm text-muted">For the QuickImgConvert team only.</p>
        </div>
        <Input type="email" required autoComplete="username" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" required autoComplete="current-password" placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={busy}>Sign in</Button>
      </form>
    </div>
  );
}
