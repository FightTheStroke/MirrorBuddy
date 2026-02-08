/**
 * Skeleton components for lazy-loaded welcome page sections.
 * These provide visual placeholders during code-split loading.
 */

import { useTranslations } from 'next-intl';

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse ${className}`} />;
}

function SkeletonCircle({ className = '' }: { className?: string }) {
  return <div className={`rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`} />;
}

function SkeletonText({ className = '' }: { className?: string }) {
  return <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`} />;
}

/**
 * Skeleton for MaestriShowcaseSection - horizontal carousel
 */
export function MaestriShowcaseSkeleton() {
  const t = useTranslations('welcome.page');

  return (
    <section className="w-full max-w-6xl mx-auto px-4 mb-16 mt-8" aria-label={t('loading')}>
      {/* Header */}
      <div className="text-center mb-8">
        <SkeletonText className="h-8 w-48 mx-auto mb-3" />
        <SkeletonText className="h-5 w-72 mx-auto" />
      </div>

      {/* Carousel */}
      <div className="flex gap-4 overflow-hidden py-4 px-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-44 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-gray-700"
          >
            <SkeletonCircle className="w-16 h-16 mx-auto mb-3" />
            <SkeletonText className="h-4 w-20 mx-auto mb-2" />
            <SkeletonText className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Skeleton for AccessibilitySection - 7-card grid
 */
export function AccessibilitySkeleton() {
  const t = useTranslations('welcome.page');

  return (
    <section className="w-full max-w-4xl mx-auto px-4 mb-12" aria-label={t('loading')}>
      {/* Header */}
      <div className="text-center mb-8">
        <SkeletonText className="h-7 w-56 mx-auto mb-3" />
        <SkeletonText className="h-4 w-64 mx-auto" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <SkeletonCard className="w-10 h-10 rounded-lg mb-3" />
            <SkeletonText className="h-4 w-24 mb-1" />
            <SkeletonText className="h-3 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Skeleton for SupportSection - coaches/buddies carousel
 */
export function SupportSkeleton() {
  const t = useTranslations('welcome.page');

  return (
    <section className="w-full max-w-6xl mx-auto px-4 mb-12" aria-label={t('loading')}>
      {/* Header */}
      <div className="text-center mb-8">
        <SkeletonText className="h-7 w-40 mx-auto mb-3" />
        <SkeletonText className="h-4 w-64 mx-auto" />
      </div>

      {/* Carousel */}
      <div className="flex gap-4 overflow-hidden py-4 px-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-44 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-gray-700"
          >
            <SkeletonCard className="h-5 w-16 mx-auto mb-2" />
            <SkeletonCircle className="w-16 h-16 mx-auto mb-3" />
            <SkeletonText className="h-4 w-20 mx-auto mb-1" />
            <SkeletonText className="h-3 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Skeleton for FeaturesSection - 2x4 grid
 */
export function FeaturesSkeleton() {
  const t = useTranslations('welcome.page');

  return (
    <section className="w-full max-w-4xl mx-auto px-4 mb-12" aria-label={t('loading')}>
      {/* Header */}
      <div className="text-center mb-8">
        <SkeletonText className="h-7 w-64 mx-auto mb-3" />
        <SkeletonText className="h-4 w-56 mx-auto" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <SkeletonCard className="w-10 h-10 rounded-lg mb-3" />
            <SkeletonText className="h-4 w-24 mb-1" />
            <SkeletonText className="h-3 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Skeleton for ComplianceSection - 2x3 grid
 */
export function ComplianceSkeleton() {
  const t = useTranslations('welcome.page');

  return (
    <section className="w-full max-w-4xl mx-auto px-4 mb-12" aria-label={t('loading')}>
      {/* Header */}
      <div className="text-center mb-8">
        <SkeletonText className="h-7 w-48 mx-auto mb-3" />
        <SkeletonText className="h-4 w-72 mx-auto" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <SkeletonCard className="w-10 h-10 rounded-lg mb-3" />
            <SkeletonText className="h-4 w-16 mb-1" />
            <SkeletonText className="h-3 w-32" />
          </div>
        ))}
      </div>
    </section>
  );
}
