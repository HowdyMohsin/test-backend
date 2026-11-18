"use client";

import { useApp } from "@/lib/app-context";

export function AnnouncementBar() {
  const { site } = useApp();
  const a = site?.announcement;
  if (!a) return null;
  const body = <span className="font-medium">{a.text}</span>;
  return (
    <div className="bg-primary px-4 py-2 text-center text-sm text-primary-ink">
      {a.link ? <a href={a.link} className="underline-offset-2 hover:underline">{body} →</a> : body}
    </div>
  );
}
