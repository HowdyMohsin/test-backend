"use client";
import { useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { AnnouncementBar } from "./AnnouncementBar";
import { MobileMenu, type NavLink } from "./MobileMenu";
import { AuthModal } from "@/components/auth/AuthModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/hooks/useAuth";
import { isFirebaseConfigured } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";

const LIVE = "https://quickimgconvert.com";

const NAV_LINKS: NavLink[] = [
  { href: "#convert", label: "Tool" },
  { href: "#features", label: "Features" },
  { href: `${LIVE}/blog`, label: "Blog" },
  { href: `${LIVE}/about`, label: "About" },
  { href: `${LIVE}/contact`, label: "Contact" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const { user } = useAuth();
  const authEnabled = isFirebaseConfigured();

  const openAuth = (tab: "signin" | "signup") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-raised hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {authEnabled && !user && (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => openAuth("signin")}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => openAuth("signup")}>
                  Create account
                </Button>
              </>
            )}
            <UserMenu />
            <button
              className="rounded-lg p-2 text-text-muted hover:bg-surface-raised lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={NAV_LINKS} />
      {authEnabled && <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialTab={authTab} />}
    </>
  );
}
