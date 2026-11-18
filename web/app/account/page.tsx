import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/AccountPanel";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="bg-bg px-4 py-16 sm:py-24">
      <AccountPanel />
    </div>
  );
}
