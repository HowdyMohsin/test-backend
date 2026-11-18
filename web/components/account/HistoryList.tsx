"use client";

import { ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { absolute, api, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { ago, bytes } from "@/lib/format";
import type { HistoryResponse } from "@/lib/types";

const tone = { done: "success", failed: "danger", expired: "neutral", cancelled: "warn", queued: "neutral", processing: "accent" } as const;
const label = { done: "Done", failed: "Failed", expired: "Expired", cancelled: "Cancelled", queued: "Waiting", processing: "Converting" } as const;

export function HistoryList() {
  const { user, ready } = useAuth();
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    setData(null);
    api.history().then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your history."));
  }, [ready, user]);

  if (error) return <p role="alert" className="rounded-2xl bg-danger-soft p-5 text-sm font-semibold text-danger">{error}</p>;
  if (!data) return <p className="p-8 text-center text-muted">Loading…</p>;
  return (
    <div className="space-y-4">
      {!data.signed_in && (
        <p className="rounded-2xl bg-accent-soft p-4 text-sm font-medium text-primary">
          This shows conversions from this connection only. <Link className="font-bold underline" href="/account">Sign in</Link> to keep your history on every device.
        </p>
      )}
      {data.items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-12 text-center">
          <p className="text-lg font-extrabold">No conversions yet</p>
          <p className="mt-1 text-muted">Your files will be listed here after you convert them.</p>
          <Link href="/#all" className="mt-5 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-ink hover:bg-primary-hover">Pick a converter</Link>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white">
          {data.items.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold" title={h.source_name ?? ""}>{h.source_name ?? "File"}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                  <span className="inline-flex items-center gap-1 font-semibold text-ink">{h.from.toUpperCase()} <ArrowRight className="size-3.5" aria-hidden /> {h.to.toUpperCase()}</span>
                  {h.in_size ? <span>{bytes(h.in_size)}{h.out_size ? ` → ${bytes(h.out_size)}` : ""}</span> : null}
                  <span>{ago(h.created_at)}</span>
                </p>
                {h.error && <p className="mt-1 text-sm text-danger">{h.error}</p>}
              </div>
              <Badge tone={tone[h.status]}>{label[h.status]}</Badge>
              {h.download_url ? (
                <a href={absolute(h.download_url)} download className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-bold text-primary-ink hover:bg-primary-hover"><Download className="size-4" aria-hidden /> Download</a>
              ) : h.status === "expired" ? <span className="text-xs text-muted">Files are deleted after an hour</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
