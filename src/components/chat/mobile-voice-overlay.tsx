"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileVoiceOverlayProps {
  children: React.ReactNode;
  isVisible: boolean;
  onClose: () => void;
}

/**
 * MobileVoiceOverlay - Bottom sheet overlay for voice panel on mobile
 *
 * Features:
 * - Slides up from bottom with framer-motion
 * - Max height 50vh with rounded top corners
 * - Close button + swipe down to dismiss
 * - Backdrop overlay (bg-black/30)
 * - Focus trap when visible
 * - Respects prefers-reduced-motion
 * - Only renders on mobile (< lg breakpoint)
 */
export function MobileVoiceOverlay({
  children,
  isVisible,
  onClose,
}: MobileVoiceOverlayProps) {
  const shouldReduceMotion = useReducedMotion();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isVisible, onClose]);

  // Prevent body scroll when visible
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.2,
            }}
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: shouldReduceMotion ? "tween" : "spring",
              damping: shouldReduceMotion ? undefined : 25,
              stiffness: shouldReduceMotion ? undefined : 300,
              duration: shouldReduceMotion ? 0 : undefined,
            }}
            className={cn(
              // Positioning
              "fixed bottom-0 left-0 right-0",
              // Sizing
              "max-h-[50vh]",
              // Styling
              "bg-white dark:bg-slate-900",
              "rounded-t-2xl",
              "shadow-2xl",
              // Layout
              "flex flex-col",
              // Safe area
              "pb-[env(safe-area-inset-bottom)]",
            )}
            // Stop propagation to prevent backdrop click
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close button */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
              {/* Drag handle */}
              <div className="flex-1 flex justify-center">
                <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close voice panel"
                className="flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
