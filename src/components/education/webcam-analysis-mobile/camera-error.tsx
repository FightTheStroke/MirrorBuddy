/**
 * Camera error display component
 */

import { AlertCircle, RotateCw } from "lucide-react";

export interface CameraErrorProps {
  error: string;
  onRetry: () => void;
}

export function CameraError({ error, onRetry }: CameraErrorProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-red-900/20 rounded">
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <div>
          <p className="text-sm font-semibold text-red-300 mb-2">{error}</p>
          <button
            onClick={onRetry}
            className="min-h-[44px] min-w-[100px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
            aria-label="Retry camera access"
          >
            <RotateCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
