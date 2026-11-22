import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/AccountPanel";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-bg px-4 py-10 sm:py-16 lg:flex lg:items-center lg:py-20">
      <AccountPanel />
    </div>
  );
}
