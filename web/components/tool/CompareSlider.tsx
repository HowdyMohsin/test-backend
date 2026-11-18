"use client";

import { useState } from "react";

/** Original on the left, converted on the right. The range input makes it work with keyboard and touch. */
export function CompareSlider({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative select-none overflow-hidden rounded-xl border border-line bg-[repeating-conic-gradient(var(--surface-2)_0%_25%,var(--surface)_0%_50%)] bg-[length:16px_16px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="Converted result" className="block max-h-[420px] w-full object-contain" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt="Original file" className="block max-h-[420px] w-full object-contain" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-xs font-bold text-slate-700 shadow-md">⇆</span>
      </div>
      <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-slate-900/70 px-2 py-0.5 text-xs font-semibold text-white">Original</span>
      <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-slate-900/70 px-2 py-0.5 text-xs font-semibold text-white">Converted</span>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Compare original and converted" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
}
