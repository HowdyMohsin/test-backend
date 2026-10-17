"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { adminLogout, adminMe, API_URL } from "@/lib/api";
import { AdminMe, ApiError } from "@/lib/types";
import { Spinner } from "./ui";
import { IconAlert, IconLogout, TABS_META } from "./icons";

export function Shell({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  useEffect(() => {
    adminMe()
      .then(setMe)
      .catch((e: Error) => {
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login");
        } else {
          setError(e);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-4">
        <div className="w-full max-w-md rounded-xl border border-line bg-panel p-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-ember/12">
            <IconAlert className="h-5 w-5 text-ember" />
          </div>
          <h1 className="font-display text-base font-semibold text-paper">Backend not reachable</h1>
          <p className="mt-2 text-sm text-mist">{error.message}</p>
          <p className="mt-1 font-mono text-xs text-mist/70">API: {API_URL}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg border border-line bg-panel2 px-4 py-2 text-sm text-paper hover:border-mist/40"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-ink">
        <Spinner label="Verifying admin session…" />
      </div>
    );
  }

  return <Frame me={me}>{children}</Frame>;
}

function Frame({ me, children }: { me: AdminMe; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const visibleTabs = TABS_META.filter((t) => me.tabs.includes(t.id));
  const email = me.user.email;

  const logout = async () => {
    setLoggingOut(true);
    try {
      await adminLogout();
    } catch {
      /* session already dead — still redirect */
    }
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-ink">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-panel">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-acid font-display text-sm font-bold text-ink">
            Q
          </div>
          <div>
            <p className="font-display text-sm font-bold leading-tight text-paper">
              QuickImgConvert
            </p>
            <p className="text-[11px] uppercase tracking-widest text-mist">Admin Console</p>
          </div>
        </div>
        <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
          {visibleTabs.map((t) => {
            const active = pathname === `/${t.id}` || pathname.startsWith(`/${t.id}/`);
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={`/${t.id}`}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-acid/12 font-medium text-acid"
                    : "text-mist hover:bg-white/5 hover:text-paper"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t.label}
              </Link>
            );
          })}
          {visibleTabs.length === 0 && (
            <p className="px-3 py-4 text-xs text-mist">
              No sections assigned to this account.
            </p>
          )}
        </nav>
        <div className="border-t border-line px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] text-mist">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-acid" />
            Backend connected
          </div>
          <p className="mt-1 truncate font-mono text-[10px] text-mist/60">{API_URL}</p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-ink/90 px-6 backdrop-blur">
          <p className="text-xs uppercase tracking-widest text-mist">
            {TABS_META.find((t) => pathname === `/${t.id}`)?.label ?? "Console"}
          </p>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-paper hover:bg-white/5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-acid/15 font-display text-sm font-bold text-acid">
                {email.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-48 truncate font-mono text-xs text-mist">{email}</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-line bg-panel py-1 shadow-deck">
                  <div className="border-b border-line px-4 py-2">
                    <p className="truncate font-mono text-xs text-paper">{email}</p>
                    <p className="text-[11px] uppercase tracking-wider text-mist">
                      {me.user.role}
                    </p>
                  </div>
                  <button
                    onClick={logout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-mist hover:bg-white/5 hover:text-paper"
                  >
                    <IconLogout className="h-4 w-4" />
                    {loggingOut ? "Logging out…" : "Log out"}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
