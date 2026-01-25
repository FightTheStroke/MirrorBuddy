"use client";

/**
 * MindmapToolbarMobile - Touch-friendly toolbar for mindmap on mobile devices
 * F-27: Mindmap tool has touch-friendly toolbar on mobile
 *
 * Features:
 * - Floating action bar at bottom (above BottomNav safe area)
 * - Touch targets 44px minimum (44x44 buttons)
 * - Zoom +/- buttons, fit-to-screen, export options
 * - Pinch-to-zoom hint for mobile users
 * - Responsive: bottom bar on mobile, hidden on desktop
 * - Uses useDeviceType hook for device detection
 */

import { useDeviceType } from "@/hooks/use-device-type";
import { useSafeArea } from "@/hooks/use-safe-area";
import { ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react";

interface MindmapToolbarMobileProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onExport: () => void;
}

export function MindmapToolbarMobile({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onExport,
}: MindmapToolbarMobileProps) {
  const { isDesktop } = useDeviceType();
  const safeArea = useSafeArea();

  // Hide on desktop, show on mobile/tablet
  if (isDesktop) {
    return null;
  }

  return (
    <div
      data-testid="mindmap-toolbar"
      className={`
        fixed bottom-0 left-0 right-0 z-40
        flex items-center justify-center gap-2
        bg-white dark:bg-slate-900
        border-t border-slate-200 dark:border-slate-700
        p-3 shadow-lg
        ${isDesktop ? "hidden" : ""}
      `}
      style={{ paddingBottom: `calc(0.75rem + ${safeArea.bottom}px)` }}
    >
      {/* Zoom In Button - 44x44px touch target */}
      <button
        onClick={onZoomIn}
        aria-label="Zoom in"
        className="
          h-11 w-11 rounded-lg
          flex items-center justify-center
          bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800
          text-blue-600 dark:text-blue-400
          transition-colors
          active:scale-95 duration-100
          flex-shrink-0
        "
      >
        <ZoomIn className="w-5 h-5" />
      </button>

      {/* Zoom Out Button - 44x44px touch target */}
      <button
        onClick={onZoomOut}
        aria-label="Zoom out"
        className="
          h-11 w-11 rounded-lg
          flex items-center justify-center
          bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800
          text-blue-600 dark:text-blue-400
          transition-colors
          active:scale-95 duration-100
          flex-shrink-0
        "
      >
        <ZoomOut className="w-5 h-5" />
      </button>

      {/* Fit to Screen Button - 44x44px touch target */}
      <button
        onClick={onFitToScreen}
        aria-label="Fit to screen"
        className="
          h-11 w-11 rounded-lg
          flex items-center justify-center
          bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800
          text-green-600 dark:text-green-400
          transition-colors
          active:scale-95 duration-100
          flex-shrink-0
        "
      >
        <Maximize2 className="w-5 h-5" />
      </button>

      {/* Export Button - 44x44px touch target */}
      <button
        onClick={onExport}
        aria-label="Export"
        className="
          h-11 w-11 rounded-lg
          flex items-center justify-center
          bg-purple-100 hover:bg-purple-200 dark:bg-purple-900 dark:hover:bg-purple-800
          text-purple-600 dark:text-purple-400
          transition-colors
          active:scale-95 duration-100
          flex-shrink-0
        "
      >
        <Download className="w-5 h-5" />
      </button>

      {/* Pinch-to-Zoom Hint */}
      <div className="ml-auto text-xs text-slate-500 dark:text-slate-400 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800">
        <span>👆 Pinch to zoom</span>
      </div>
    </div>
  );
}
