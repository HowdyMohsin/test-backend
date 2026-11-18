"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WaitlistForm } from "@/components/billing/WaitlistForm";
import { Badge } from "@/components/ui/Badge";
import { api, ApiError } from "@/lib/api/client";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth";
import { price } from "@/lib/format";
import { planFeatures } from "@/lib/plan-copy";
import type { PlanInfo } from "@/lib/types";

const blurb: Record<string, string> = {
  free: "For the odd file now and then.",
  basic: "For regular everyday use.",
  pro: "For heavy and professional work.",
};

export function PricingPlans({ plans }: { plans: PlanInfo[] }) {
  const { me } = useApp();
  const { user } = useAuth();
  const [checkout, setCheckout] = useState(false);
  const [wait, setWait] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const shown = plans.filter((p) => p.id !== "anonymous");
  const current = me?.plan.id;

  useEffect(() => { api.billingConfig().then((c) => setCheckout(c.checkout_enabled)).catch(() => undefined); }, []);

  async function choose(id: string) {
    setError("");
    if (!checkout) { setWait(id); setTimeout(() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); return; }
    if (!user) { window.location.href = "/account"; return; }
    setBusy(id);
    try { window.location.href = (await api.checkout()).url; } catch (e) { setError(e instanceof ApiError ? e.message : "Could not start checkout."); setBusy(""); }
  }

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-3">
        {shown.map((p) => {
          const featured = p.id === "basic";
          const mine = current === p.id;
          return (
            <section key={p.id} aria-labelledby={`plan-${p.id}`} className={`relative flex flex-col rounded-3xl border-2 bg-white p-7 shadow-[var(--shadow-card)] ${featured ? "border-primary" : "border-line"}`}>
              {featured && <span className="absolute -top-3 left-7"><Badge tone="accent">Most popular</Badge></span>}
              <h2 id={`plan-${p.id}`} className="text-xl font-extrabold">{p.name}</h2>
              <p className="mt-1 text-sm text-muted">{blurb[p.id] ?? ""}</p>
              <p className="mt-5 text-4xl font-extrabold tracking-tight">{price(p.price_cents)}{p.price_cents > 0 && <span className="text-base font-semibold text-muted"> / month</span>}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {planFeatures(p.limits).map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /><span>{f}</span></li>)}
              </ul>
              <div className="mt-7">
                {mine ? (
                  <p className="rounded-xl bg-success-soft py-3 text-center text-sm font-bold text-success">Your current plan</p>
                ) : p.id === "free" ? (
                  <Link href={user ? "/#all" : "/account"} className="block rounded-xl border-2 border-line py-3 text-center text-sm font-bold hover:border-accent">{user ? "Start converting" : "Start free"}</Link>
                ) : (
                  <button onClick={() => choose(p.id)} disabled={busy === p.id} className={`w-full rounded-xl py-3 text-sm font-bold ${featured ? "bg-primary text-primary-ink hover:bg-primary-hover" : "border-2 border-primary text-primary hover:bg-accent-soft"}`}>Choose {p.name}</button>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-danger">{error}</p>}
      {wait && (
        <div id="waitlist" className="mx-auto mt-10 max-w-md rounded-3xl border border-line bg-white p-7 shadow-[var(--shadow-card)]">
          <h2 className="text-xl font-extrabold">{shown.find((p) => p.id === wait)?.name} opens soon</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Payments are not switched on yet. Leave your email and you will be the first to know.</p>
          <WaitlistForm source="pricing" plan={wait} />
        </div>
      )}
    </div>
  );
}
