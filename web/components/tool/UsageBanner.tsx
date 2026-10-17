import { useMe } from "@/hooks/useMe";

/** "5/25 used today, resets at …" — from /v1/me, hidden when logged out. */
export function UsageBanner() {
  const { me } = useMe();
  if (!me) return null;

  const { used, limit, resets_at } = me.usage;
  const resetTime = new Date(resets_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const nearlyOut = used / Math.max(limit, 1) >= 0.8;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${
        nearlyOut ? "border-warning/40 bg-warning/10 text-text" : "border-border bg-surface-raised text-text-muted"
      }`}
      aria-live="polite"
    >
      <span>
        <strong className="font-semibold text-text">
          {used}/{limit}
        </strong>{" "}
        conversions used today · resets at {resetTime}
      </span>
      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
        {me.plan === "pro" ? "Pro" : me.plan === "free" ? "Free" : "Guest"}
      </span>
    </div>
  );
}
