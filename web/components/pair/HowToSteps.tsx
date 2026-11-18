export function HowToSteps({ from, to }: { from: string; to: string }) {
  const steps = [
    `Add your ${from} file by dragging it in or choosing it from your device.`,
    `The converter is already set to ${to}. Open the options if you want to change quality, size or anything else.`,
    `Press Convert, check the before and after, and download your ${to} file.`,
  ];
  return (
    <section aria-labelledby="howto">
      <h2 id="howto" className="text-xl font-bold tracking-tight">How to convert {from} to {to}</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-sm font-bold text-primary">{i + 1}</span>
            <p className="pt-0.5 text-muted">{s}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
