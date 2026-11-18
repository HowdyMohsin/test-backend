"use client";

import type { Item } from "@/hooks/useConverter";
import { FileRow } from "./FileRow";

export function FileList({ items, onRemove, onRetry, onStripGps }: {
  items: Item[]; onRemove: (id: string) => void; onRetry: (id: string) => void; onStripGps: (to: string) => void;
}) {
  return (
    <ul className="max-h-[540px] space-y-2 overflow-y-auto pb-1 pr-1" aria-label="Your files">
      {items.map((it) => (
        <FileRow key={it.id} item={it} onRemove={() => onRemove(it.id)} onRetry={() => onRetry(it.id)} onStripGps={() => onStripGps(it.to ?? "jpg")} />
      ))}
    </ul>
  );
}
