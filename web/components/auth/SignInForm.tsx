"use client";
import { useState } from "react";
import { Input, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SignInForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { signInEmail } = await import("@/lib/firebase");
      await signInEmail(email.trim(), password);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email">
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </Field>
      <Field label="Password">
        <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </Field>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
