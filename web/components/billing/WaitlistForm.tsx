"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";

export function WaitlistForm({ source, plan = "pro" }: { source: string; plan?: string }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  if (state === "done") {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-success-soft p-4 text-success">
        <Check className="mt-0.5 size-5 shrink-0" aria-hidden />
        <p className="text-sm font-medium">You are on the list. We will email {email} the moment paid plans open.</p>
      </div>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        setError("");
        try {
          await api.waitlist(email.trim(), source, plan);
          setState("done");
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Could not save your email. Please try again.");
          setState("idle");
        }
      }}
    >
      <label className="block text-sm font-medium" htmlFor="wait-email">
        Your email
      </label>
      <Input id="wait-email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" loading={state === "sending"}>
        Notify me when it opens
      </Button>
    </form>
  );
}
