import type { ReactNode } from "react";
import { Container } from "./Container";

export function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`py-12 sm:py-16 ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-8 max-w-2xl text-center">
      <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-2 text-text-muted">{subtitle}</p>}
    </div>
  );
}
