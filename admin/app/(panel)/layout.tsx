"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Loading } from "@/components/data/Bits";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAdmin } from "@/lib/auth";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { admin, ready, logout } = useAdmin();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  useEffect(() => {
    if (ready && !admin) router.replace("/login");
  }, [ready, admin, router]);
  if (!ready || !admin) return <Loading />;
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-ink">Q</span>
          <div className="leading-tight"><p className="text-sm font-bold">QuickImgConvert</p><p className="text-xs text-muted">Admin panel</p></div>
        </div>
        <Sidebar />
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-end gap-3 border-b border-line bg-surface px-6 py-3 text-sm">
          <span className="text-muted">{admin.email} · {admin.role === "super_admin" ? "Super admin" : "Staff"}</span>
          <button aria-label="Toggle theme" className="grid size-8 place-items-center rounded-lg hover:bg-surface-2" onClick={() => {
            const next = dark ? "light" : "dark";
            document.documentElement.dataset.theme = next;
            try { localStorage.setItem("qic.theme", next); } catch { /* ignore */ }
            setDark(!dark);
          }}>{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium hover:bg-surface-2"><LogOut className="size-4" aria-hidden /> Sign out</button>
        </header>
        <main className="mx-auto max-w-7xl p-6">{children}</main>
      </div>
    </div>
  );
}
