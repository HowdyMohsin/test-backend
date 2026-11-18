import type { Metadata } from "next";
import { HistoryList } from "@/components/account/HistoryList";

export const metadata: Metadata = { title: "Your history", robots: { index: false } };

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-extrabold tracking-tight">Your history</h1>
      <p className="mb-8 mt-2 text-muted">Your recent conversions. The converted files themselves are deleted automatically after an hour, so download what you need.</p>
      <HistoryList />
    </div>
  );
}
