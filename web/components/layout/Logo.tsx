import Link from "next/link";

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight" aria-label="Quick Image Convert home">
      <span className={`grid size-9 place-items-center rounded-xl shadow-sm ${light ? "bg-white text-primary" : "bg-primary text-primary-ink"}`}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 8h13l-3-3M20 16H7l3 3" />
        </svg>
      </span>
      <span className="hidden text-lg min-[430px]:inline">Quick Image Convert</span>
    </Link>
  );
}
