import { MarketingHero } from "./components/marketing-hero";
import { FeaturesGrid } from "./components/features-grid";
import { PricingSection } from "./components/pricing-section";
import { SocialProof } from "./components/social-proof";
import { FaqSection } from "./components/faq-section";
import { MarketingCta } from "./components/marketing-cta";
import { MarketingFooter } from "./components/marketing-footer";
import { MarketingStructuredData } from "./components/marketing-structured-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MirrorBuddy - Learn with History's Greatest Teachers",
  description:
    "AI-powered tutoring with 26 historic professors. Adaptive learning for every student, including those with learning differences. Voice conversations, mind maps, quizzes.",
  openGraph: {
    title: "MirrorBuddy - Learn with History's Greatest Teachers",
    description:
      "AI-powered tutoring with 26 historic professors. Adaptive learning for every student.",
    type: "website",
  },
};

interface MarketingPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MarketingPage({ params }: MarketingPageProps) {
  const { locale } = await params;

  return (
    <>
      <MarketingStructuredData locale={locale} />
      <MarketingHero />
      <FeaturesGrid />
      <PricingSection />
      <SocialProof />
      <FaqSection />
      <MarketingCta />
      <MarketingFooter />
    </>
  );
}
