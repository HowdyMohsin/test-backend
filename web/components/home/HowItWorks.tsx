import { HOW_IT_WORKS } from "@/content/home";
import { Card } from "@/components/ui/Card";

/** Box 6 — three steps. */
export function HowItWorks() {
  return (
    <section aria-label="How it works" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="text-2xl font-bold text-text">How it works</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {HOW_IT_WORKS.map((step, index) => (
          <Card key={step.title} className="p-5">
            <p className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-contrast" aria-hidden>
              {index + 1}
            </p>
            <h3 className="mt-3 font-semibold text-text">{step.title}</h3>
            <p className="mt-1.5 text-sm text-text-muted">{step.text}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
