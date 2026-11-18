"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";

export function UsageBanner() {
  const { me } = useApp();
  if (!me?.banner.text) return null;
  const hit = me.banner.kind === "quota_hit";
  const plan = me.plan.id;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${hit ? "bg-warn-soft text-warn" : "bg-surface-2 text-muted"}`}>
      <p className="font-medium">{me.banner.text}</p>
      {plan !== "pro" && (hit || plan === "anonymous") && (
        <Link href={plan === "anonymous" ? "/account" : "/pricing"} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${hit ? "bg-primary text-primary-ink hover:bg-primary-hover" : "border border-line bg-white text-ink hover:border-accent"}`}>
          {plan === "anonymous" ? "Sign in free" : "See plans"}
        </Link>
      )}
    </div>
  );
}
