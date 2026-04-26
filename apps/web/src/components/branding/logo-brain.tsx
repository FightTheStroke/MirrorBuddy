import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoBrainProps = {
  /**
   * Accessible alt text for the logo image.
   * Keep this short and descriptive.
   */
  alt: string;
  /**
   * Square size in pixels.
   */
  size?: number;
  /**
   * Additional classes applied to the <Image>.
   */
  className?: string;
  /**
   * Additional classes applied to the wrapper <div>.
   */
  wrapperClassName?: string;
  /**
   * Preload priority for above-the-fold usage.
   */
  priority?: boolean;
};

/**
 * Theme-aware MirrorBuddy brain logo.
 *
 * Note: We keep the PNG source for compatibility; Next.js will serve
 * WebP/AVIF automatically when supported. In dark mode we add a subtle
 * light halo to keep the black strokes visible on dark backgrounds.
 */
export function LogoBrain({
  alt,
  size = 36,
  className,
  wrapperClassName,
  priority,
}: LogoBrainProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl flex-shrink-0",
        wrapperClassName,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-brain.png"
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className={cn(
          "object-cover",
          "dark:[filter:drop-shadow(0_0_1.35px_rgba(255,255,255,0.85))_drop-shadow(0_0_8px_rgba(255,255,255,0.18))]",
          className,
        )}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
