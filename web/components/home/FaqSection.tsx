import { FAQS } from "@/content/home";
import { Accordion } from "@/components/ui/Accordion";
import { JsonLd } from "@/components/seo/JsonLd";

/** Box 7 — FAQ accordion + FAQPage JSON-LD. */
export function FaqSection() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <section aria-label="Frequently asked questions" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h2 className="text-2xl font-bold text-text">Frequently asked questions</h2>
      <div className="mt-6 space-y-3">
        {FAQS.map((faq) => (
          <Accordion key={faq.question} title={faq.question}>
            <p className="text-sm text-text-muted">{faq.answer}</p>
          </Accordion>
        ))}
      </div>
      <JsonLd data={faqJsonLd} />
    </section>
  );
}
