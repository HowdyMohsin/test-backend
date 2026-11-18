"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { useApp } from "@/lib/app-context";

/** Renders an ad only if the admin switched this slot on. Never placed inside the converter. Pro users get nothing. */
export function AdSlot({ slot }: { slot: string }) {
  const { me } = useApp();
  const [code, setCode] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!me || me.plan.id === "pro") return;
    api.ads().then((r) => setCode(r.slots[slot] ?? "")).catch(() => undefined);
  }, [me, slot]);
  useEffect(() => {
    if (!code || !box.current) return;
    box.current.replaceChildren(document.createRange().createContextualFragment(code));
  }, [code]);
  if (!code) return null;
  return <div ref={box} aria-label="Advertisement" className="mx-auto my-8 flex min-h-[90px] max-w-6xl justify-center px-4" />;
}
