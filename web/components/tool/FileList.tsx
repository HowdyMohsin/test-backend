"use client";
import { memo, useEffect, useRef, useState } from "react";
import type { QueueFile } from "@/hooks/useFileQueue";
import { FileRow, type FileRowProps } from "./FileRow";

const MemoRow = memo(FileRow);
const ROW_HEIGHT = 172;
const OVERSCAN = 4;
const MAX_HEIGHT = 520;

type RowHandlers = Omit<FileRowProps, "queueFile" | "targetOptions">;

/** Virtualized file list — smooth up to 100 files. */
export function FileList({
  files,
  getTargetOptions,
  ...handlers
}: { files: QueueFile[]; getTargetOptions: (queueFile: QueueFile) => string[] } & RowHandlers) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(MAX_HEIGHT);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setViewportHeight(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (files.length === 0) return null;

  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(files.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
  const visible = files.slice(start, end);

  return (
    <div
      ref={containerRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className="scroll-thin overflow-y-auto rounded-xl"
      style={{ maxHeight: MAX_HEIGHT }}
      aria-label={`${files.length} files`}
    >
      <div style={{ height: files.length * ROW_HEIGHT, position: "relative" }}>
        {visible.map((queueFile, index) => (
          <div
            key={queueFile.id}
            style={{
              position: "absolute",
              top: (start + index) * ROW_HEIGHT,
              left: 0,
              right: 0,
              height: ROW_HEIGHT,
              paddingBottom: 8,
            }}
          >
            <MemoRow queueFile={queueFile} targetOptions={getTargetOptions(queueFile)} {...handlers} />
          </div>
        ))}
      </div>
    </div>
  );
}
