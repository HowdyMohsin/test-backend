import { AdSlot } from "@/components/ads/AdSlot";
import { Explorer } from "@/components/home/Explorer";
import { FaqSection, faqItems } from "@/components/home/FaqSection";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { HeroPicker } from "@/components/home/HeroPicker";
import { HowItWorks } from "@/components/home/HowItWorks";
import { JsonLd } from "@/components/seo/JsonLd";
import { serverCatalog, serverPlans } from "@/lib/api/server";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const revalidate = 300;

export default async function Home() {
  const [catalog, { plans }] = await Promise.all([serverCatalog(), serverPlans()]);
  const { formats, pairs } = catalog.counts;
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL }} />
      <HeroPicker catalog={catalog} />
      <Explorer catalog={catalog} />
      <AdSlot slot="between_categories" />
      <FeatureGrid formats={formats} pairs={pairs} free={plans.find((p) => p.id === "free")} anon={plans.find((p) => p.id === "anonymous")} />
      <HowItWorks />
      <FaqSection items={faqItems(plans, formats, pairs)} />
      <AdSlot slot="below_faq" />
    </>
  );
}
