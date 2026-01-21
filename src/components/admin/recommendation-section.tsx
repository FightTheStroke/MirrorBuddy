import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceRecommendation } from "@/lib/admin/service-recommendations";

interface RecommendationSectionProps {
  recommendation: ServiceRecommendation;
}

/**
 * Recommendation section for upgrade actions
 * F-20: Ogni alert nella dashboard include: azione raccomandata + link diretto per upgrade
 * F-28: Actionable recommendations per servizio
 */
export function RecommendationSection({ recommendation }: RecommendationSectionProps) {
  return (
    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/20">
            <ExternalLink className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              {recommendation.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              {recommendation.description}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Price:
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                {recommendation.price}
              </span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={() => window.open(recommendation.upgradeUrl, "_blank", "noopener,noreferrer")}
        >
          {recommendation.cta}
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
