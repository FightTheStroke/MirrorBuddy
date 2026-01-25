/**
 * Analysis results display component
 */

import { cn } from "@/lib/utils";

export interface AnalysisResultsProps {
  capturedImage: string | null;
  analysisResults: string | null;
  isPhone: boolean;
}

export function AnalysisResults({
  capturedImage,
  analysisResults,
  isPhone,
}: AnalysisResultsProps) {
  if (!capturedImage && !analysisResults) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 bg-white dark:bg-slate-800 rounded-lg p-4",
        "overflow-y-auto max-h-[30vh] xs:max-h-[40vh] sm:max-h-[50vh]",
        isPhone ? "text-xs" : "text-sm",
      )}
    >
      <h3 className="font-semibold text-slate-900 dark:text-white">
        Analysis Results
      </h3>

      {capturedImage && (
        <div className="flex flex-col gap-2">
          <p className="text-slate-600 dark:text-slate-300">
            Image captured successfully
          </p>
          <div className="w-full max-h-20 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden">
            {/* Using <img> for data URLs since next/Image requires domain config */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {analysisResults && (
        <div className="text-slate-700 dark:text-slate-200">
          <p>{analysisResults}</p>
        </div>
      )}
    </div>
  );
}
