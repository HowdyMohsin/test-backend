"use client";
import { useEffect, useState } from "react";
import { getAd } from "@/lib/api/client";
import { useMe } from "@/hooks/useMe";

/** Ad slot for free users only. Never rendered inside the converter tool. */
export function AdSlot({ slot }: { slot: string }) {
  const { me } = useMe();
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAd(slot)
      .then((response) => {
        if (!cancelled) setCode(response.code || null);
      })
      .catch(() => {
        if (!cancelled) setCode(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slot]);

  if (me?.plan === "pro" || !code) return null;
  return (
    <div className="mx-auto my-8 w-full max-w-6xl px-4 sm:px-6" aria-label="Advertisement">
      <div dangerouslySetInnerHTML={{ __html: code }} />
    </div>
  );
}
