"use client";

import { AlertCircle, X } from "lucide-react";
import Link from "next/link";
import type { Notice } from "@/hooks/useConverter";
import { useApp } from "@/lib/app-context";

/** The inline replacement for the old popups: it appears inside the tool, only after the user tried something. */
export function LimitNotice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const { me } = useApp();
  const plan = me?.plan.id ?? "anonymous";
  const showUpgrade = !["info", "account"].includes(notice.reason) && plan !== "pro";
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-warn">
      <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">{notice.message}</p>
        {notice.reason === "account" && <Link href="/account" className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 font-bold text-primary-ink hover:bg-primary-hover">Go to account</Link>}
        {showUpgrade && (
          <div className="mt-3 flex flex-wrap gap-2">
            {plan === "anonymous" && <Link href="/account" className="rounded-xl bg-primary px-4 py-2 font-bold text-primary-ink hover:bg-primary-hover">Create a free account</Link>}
            <Link href="/pricing" className={`rounded-xl px-4 py-2 font-bold ${plan === "anonymous" ? "border border-line bg-white text-ink hover:border-accent" : "bg-primary text-primary-ink hover:bg-primary-hover"}`}>See plans</Link>
          </div>
        )}
      </div>
      <button onClick={onClose} aria-label="Dismiss" className="text-warn/70 hover:text-warn"><X className="size-4" /></button>
    </div>
  );
}
