import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function Breadcrumbs({ current, light }: { current: string; light?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${light ? "text-white/80" : "text-muted"}`}>
      <ol className="flex items-center gap-1.5">
        <li><Link href="/" className={light ? "hover:text-white" : "hover:text-primary"}>Home</Link></li>
        <li aria-hidden><ChevronRight className="size-3.5" /></li>
        <li aria-current="page" className={`font-semibold ${light ? "text-white" : "text-ink"}`}>{current}</li>
      </ol>
    </nav>
  );
}
