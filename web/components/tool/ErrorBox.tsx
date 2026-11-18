import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function ErrorBox({ title, children, tone = "danger" }: { title: string; children: ReactNode; tone?: "danger" | "warn" }) {
  return (
    <div role="alert" className={`flex gap-3 rounded-xl p-4 ${tone === "danger" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="text-sm">
        <p className="font-semibold">{title}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}
