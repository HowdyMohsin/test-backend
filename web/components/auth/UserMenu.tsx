"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMe } from "@/hooks/useMe";
import { Badge } from "@/components/ui/Badge";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { me } = useMe();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;
  const initial = (user.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-semibold text-primary-contrast"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-border bg-surface p-4 shadow-lg">
          <p className="truncate text-sm font-medium text-text">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={me?.plan === "pro" ? "success" : "info"}>{me?.plan === "pro" ? "Pro" : "Free"}</Badge>
            {me && (
              <span className="text-xs text-text-muted">
                {me.usage.used}/{me.usage.limit} used today
              </span>
            )}
          </div>
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-raised"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

