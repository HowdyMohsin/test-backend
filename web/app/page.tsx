import { Hero } from "@/components/home/Hero";
import { ConverterTool } from "@/components/tool/ConverterTool";
import { CategoryBlocks } from "@/components/home/CategoryBlocks";
import { PopularGrid } from "@/components/home/PopularGrid";
import { FeatureGrid } from "@/components/home/FeatureGrid";
import { HowItWorks } from "@/components/home/HowItWorks";
import { FaqSection } from "@/components/home/FaqSection";
import { AdSlot } from "@/components/ads/AdSlot";
import { Container } from "@/components/layout/Container";

/**
 * Homepage — the 9 boxes in order (guide sections 3-4):
 * Hero, ConverterTool, CategoryBlocks, PopularGrid, FeatureGrid,
 * HowItWorks, FaqSection, Footer (in layout). Ad slots sit between
 * PopularGrid/FeatureGrid and below the FAQ — never inside the tool.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <section id="convert" aria-label="Converter">
        <Container className="py-8">
          <ConverterTool />
        </Container>
      </section>
      <CategoryBlocks />
      <PopularGrid />
      <AdSlot slot="home-mid" />
      <FeatureGrid />
      <HowItWorks />
      <FaqSection />
      <AdSlot slot="home-bottom" />
    </>
  );
}
