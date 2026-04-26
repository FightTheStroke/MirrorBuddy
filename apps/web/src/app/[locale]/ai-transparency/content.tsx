"use client";

import { AISystemSections } from "./sections/ai-system";
import { RightsComplianceSections } from "./sections/rights-compliance";
import { FAQSupportSections } from "./sections/faq-support";
import { PhilosophySection } from "./sections/philosophy";

export function AITransparencyContent() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-slate-700 dark:prose-li:text-gray-300">
      <AISystemSections />
      <PhilosophySection />
      <RightsComplianceSections />
      <FAQSupportSections />
    </div>
  );
}
