import type { ButtonHTMLAttributes, ReactNode } from "react";

export function IconButton({ children, label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-raised hover:text-text ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
