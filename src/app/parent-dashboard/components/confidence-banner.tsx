/**
 * @file confidence-banner.tsx
 * @brief Confidence score banner component
 */

interface ConfidenceBannerProps {
  confidenceScore: number;
}

export function ConfidenceBanner({ confidenceScore }: ConfidenceBannerProps) {
  if (confidenceScore >= 0.5) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 sm:p-4 mb-6">
      <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
        <strong>Nota:</strong> Il profilo ha una affidabilita del{' '}
        {Math.round(confidenceScore * 100)}%. Piu sessioni di studio con i
        Professori miglioreranno la precisione delle osservazioni.
      </p>
    </div>
  );
}

