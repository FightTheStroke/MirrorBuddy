"use client";

/**
 * MonitoredImage - Image component with automatic Sentry error tracking
 *
 * Wraps Next.js Image component to capture loading failures to Sentry.
 * Use this for critical images that should alert when they fail.
 *
 * @example
 * ```tsx
 * <MonitoredImage
 *   src="/maestri/euclide.webp"
 *   alt="Euclide"
 *   width={56}
 *   height={56}
 *   critical // Mark as critical for higher severity alerts
 * />
 * ```
 */

import Image, { type ImageProps } from "next/image";
import { useState, useCallback } from "react";
import { captureResourceError } from "@/lib/sentry";

interface MonitoredImageProps extends ImageProps {
  /**
   * Mark this image as critical - failures will be logged as errors
   * instead of warnings in Sentry
   */
  critical?: boolean;
  /**
   * Fallback image to show when the primary image fails to load
   */
  fallbackSrc?: string;
  /**
   * Additional context to include in Sentry reports
   */
  sentryContext?: Record<string, unknown>;
}

export function MonitoredImage({
  src,
  alt,
  critical = false,
  fallbackSrc,
  sentryContext,
  onError,
  ...props
}: MonitoredImageProps) {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      // Avoid duplicate reports
      if (hasError) return;

      setHasError(true);

      // Get the actual URL that failed
      const failedUrl =
        typeof src === "string"
          ? src
          : typeof src === "object" && "src" in src
            ? src.src
            : "unknown";

      // Report to Sentry
      captureResourceError(failedUrl, "image", {
        critical,
        alt,
        component: "MonitoredImage",
        ...sentryContext,
      });

      // Try fallback if available
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setHasError(false); // Reset to try fallback
      }

      // Call original onError if provided
      onError?.(e);
    },
    [src, alt, critical, fallbackSrc, currentSrc, hasError, sentryContext, onError],
  );

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={handleError}
    />
  );
}

export default MonitoredImage;
