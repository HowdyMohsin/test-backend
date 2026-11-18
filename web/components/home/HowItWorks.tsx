import { steps } from "@/content/home";

export function HowItWorks() {
  return (
    <section className="mx-auto mt-20 max-w-6xl px-4" aria-labelledby="how">
      <h2 id="how" className="text-2xl font-bold tracking-tight">How it works</h2>
      <ol className="mt-8 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-ink">{i + 1}</span>
            <div><h3 className="font-semibold">{s.title}</h3><p className="mt-1 text-muted">{s.text}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}
