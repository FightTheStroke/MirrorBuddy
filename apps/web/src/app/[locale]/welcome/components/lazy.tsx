/**
 * Lazy-loaded components for Welcome page sections below the fold.
 *
 * Uses Next.js dynamic imports with skeleton fallbacks for progressive loading.
 * ssr: false ensures these components only load on the client after hydration.
 */
import dynamic from "next/dynamic";
import {
  MaestriShowcaseSkeleton,
  SupportSkeleton,
  AccessibilitySkeleton,
  FeaturesSkeleton,
  ComplianceSkeleton,
} from "./welcome-skeletons";

export const LazyMaestriShowcaseSection = dynamic(
  () =>
    import("./maestri-showcase-section").then((m) => ({
      default: m.MaestriShowcaseSection,
    })),
  {
    loading: () => <MaestriShowcaseSkeleton />,
    ssr: false,
  },
);

export const LazySupportSection = dynamic(
  () =>
    import("./support-section").then((m) => ({
      default: m.SupportSection,
    })),
  {
    loading: () => <SupportSkeleton />,
    ssr: false,
  },
);

export const LazyAccessibilitySection = dynamic(
  () =>
    import("./accessibility-section").then((m) => ({
      default: m.AccessibilitySection,
    })),
  {
    loading: () => <AccessibilitySkeleton />,
    ssr: false,
  },
);

export const LazyFeaturesSection = dynamic(
  () =>
    import("./features-section").then((m) => ({
      default: m.FeaturesSection,
    })),
  {
    loading: () => <FeaturesSkeleton />,
    ssr: false,
  },
);

export const LazyComplianceSection = dynamic(
  () =>
    import("./compliance-section").then((m) => ({
      default: m.ComplianceSection,
    })),
  {
    loading: () => <ComplianceSkeleton />,
    ssr: false,
  },
);
