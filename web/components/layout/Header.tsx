"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";

const nav = [
  { href: "/#all", label: "Converters" },
  { href: "/pricing", label: "Pricing" },
  { href: "/history", label: "History" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { me } = useApp();
  const { user } = useAuth();
  return (
    <header className="relative z-30 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          {me && <span className="hidden rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold tabular-nums text-muted lg:block" title="Conversions used today">{me.usage.used}/{me.usage.limit} today</span>}
          {user ? (
            <Link href="/account" className="flex items-center gap-2 rounded-xl border border-line bg-white py-1 pl-1 pr-3 text-sm font-bold hover:border-accent" aria-label="Your account">
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-extrabold uppercase text-primary-ink">{(user.email ?? "?").charAt(0)}</span>
              <span className="hidden max-w-[130px] truncate sm:block">{user.email}</span>
            </Link>
          ) : (
            <Link href="/account" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-ink hover:bg-primary-hover">Sign in</Link>
          )}
          <button className="grid size-9 place-items-center rounded-xl hover:bg-surface-2 md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="border-t border-line bg-white px-4 py-2 md:hidden">
          {nav.map((n) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold hover:bg-surface-2">{n.label}</Link>)}
        </nav>
      )}
    </header>
  );
}
