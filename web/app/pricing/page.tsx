import type { Metadata } from "next";
import { PricingPlans } from "@/components/pricing/PricingPlans";
import { serverPlans } from "@/lib/api/server";

export const revalidate = 300;
export const metadata: Metadata = { title: "Pricing", description: "Free, Basic and Pro plans. Every plan uses the same converters and the same quality; paid plans raise the limits.", alternates: { canonical: "/pricing" } };

export default async function PricingPage() {
  const { plans } = await serverPlans();
  return (
    <>
      <section className="relative overflow-hidden bg-primary text-white">
        <div aria-hidden className="absolute -right-32 -top-44 size-[480px] rounded-full bg-white/10" />
        <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-14">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Simple plans</h1>
          <p className="mt-4 max-w-xl text-lg text-white/85">Every plan uses the same converters and the same quality. Paid plans just raise the limits.</p>
        </div>
      </section>
      <div className="relative z-10 mx-auto -mt-16 max-w-6xl px-4 pb-8">
        <PricingPlans plans={plans} />
      </div>
    </>
  );
}
