"use client";
import { useState } from "react";
import { Input, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SignUpForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { signUpEmail } = await import("@/lib/firebase");
      await signUpEmail(email.trim(), password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email">
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </Field>
      <Field label="Password (min 6 characters)">
        <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </Field>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create free account"}
      </Button>
      <p className="text-xs text-text-muted">Free plan: 25 conversions a day. No card required.</p>
    </form>
  );
}
