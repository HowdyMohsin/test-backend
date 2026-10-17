"use client";
import { useEffect, useRef, useState } from "react";

/** Before/after image compare slider with zoom. */
export function CompareSlider({ before, after, label }: { before: string; after: string; label: string }) {
  const [position, setPosition] = useState(50);
  const [zoom, setZoom] = useState(false);
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div
        ref={containerRef}
        className={`relative select-none overflow-hidden rounded-xl border border-border ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        onClick={() => setZoom((value) => !value)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- compare needs raw blob/download URLs */}
        <img src={after} alt={label} className="block w-full" />
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- compare needs raw blob/download URLs */}
          <img
            src={before}
            alt="Original"
            className="block h-full max-w-none object-cover"
            style={width ? { width: `${width}px` } : undefined}
          />
        </div>
        <div className="absolute inset-y-0" style={{ left: `${position}%` }}>
          <div className="h-full w-0.5 -translate-x-1/2 bg-white shadow" />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="compare-range"
          aria-label="Compare original and converted"
          onClick={(event) => event.stopPropagation()}
        />
        <span className="absolute left-2 top-2 rounded bg-text/70 px-2 py-0.5 text-xs text-background">Before</span>
        <span className="absolute right-2 top-2 rounded bg-text/70 px-2 py-0.5 text-xs text-background">After</span>
      </div>
      <p className="mt-1 text-xs text-text-muted">Drag the slider to compare · click image to zoom</p>
    </div>
  );
}
