"use client";
import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";

export interface NavLink {
  href: string;
  label: string;
}

export function MobileMenu({
  open,
  onClose,
  links,
}: {
  open: boolean;
  onClose: () => void;
  links: NavLink[];
}) {
  return (
    <Drawer open={open} onClose={onClose}>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            onClick={onClose}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-text hover:bg-surface-raised"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </Drawer>
  );
}
