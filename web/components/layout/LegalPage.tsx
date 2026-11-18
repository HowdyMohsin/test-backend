import type { ReactNode } from "react";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/site";

export type LegalSection = { title: string; body: ReactNode };

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated: {LEGAL_UPDATED}</p>
      <p className="mt-6 text-lg text-muted">{intro}</p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-xl font-bold">{s.title}</h2>
            <div className="mt-2 space-y-3 text-muted">{s.body}</div>
          </section>
        ))}
        {CONTACT_EMAIL && (
          <section>
            <h2 className="text-xl font-bold">Contact</h2>
            <p className="mt-2 text-muted">Questions, or a request to delete your data: <a className="font-semibold text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
          </section>
        )}
      </div>
    </article>
  );
}
