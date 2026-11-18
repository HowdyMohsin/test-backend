"use client";

import { BarChart3, FileText, Gauge, Layers, LayoutDashboard, Megaphone, Settings, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/lib/auth";

const items = [
  { tab: "dashboard", href: "/", label: "Dashboard", icon: LayoutDashboard },
  { tab: "formats", href: "/formats", label: "Formats", icon: Layers },
  { tab: "plans", href: "/plans", label: "Plans & Messages", icon: FileText },
  { tab: "users", href: "/users", label: "Users", icon: Users },
  { tab: "team", href: "/team", label: "Team", icon: UserCog },
  { tab: "jobs", href: "/jobs", label: "Jobs", icon: Gauge },
  { tab: "ads", href: "/ads", label: "Ads", icon: Megaphone },
  { tab: "reports", href: "/reports", label: "Reports", icon: BarChart3 },
  { tab: "settings", href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { admin } = useAdmin();
  const path = usePathname();
  const allowed = items.filter((i) => admin?.role === "super_admin" || admin?.tabs.includes(i.tab));
  return (
    <nav aria-label="Sections" className="flex gap-1 overflow-x-auto p-3 lg:flex-col">
      {allowed.map((i) => {
        const on = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <Link key={i.tab} href={i.href} aria-current={on ? "page" : undefined}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium ${on ? "bg-primary text-primary-ink" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
            <i.icon className="size-4" aria-hidden /> {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
