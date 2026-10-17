import Link from "next/link";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M17.5 6L9 17.5h6L14.5 26 23 14.5h-6l.5-8.5z" fill="#fff" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Quick Image Convert home">
      <LogoMark />
      <span className="text-lg font-bold tracking-tight text-text">
        Quick Image <span className="text-primary">Convert</span>
      </span>
    </Link>
  );
}
