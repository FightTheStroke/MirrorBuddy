/**
 * HreflangLinks - Client component for rendering hreflang tags
 * Detects current pathname and renders appropriate hreflang tags
 */

"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { generateHreflangTags } from "@/lib/seo/hreflang";
import type { Locale } from "@/lib/seo/hreflang.types";

interface HreflangLinksProps {
  locales?: readonly Locale[];
  baseUrl?: string;
}

/**
 * Client component that automatically renders hreflang links for the current page
 * Place this in your head section (it will render link tags to the head)
 */
export function HreflangLinks({
  locales = ["it", "en", "fr", "de", "es"] as const,
  baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mirrorbuddy.edu",
}: HreflangLinksProps) {
  const pathname = usePathname();

  useEffect(() => {
    const tags = generateHreflangTags(baseUrl, pathname, locales);

    // Remove existing hreflang tags
    const existingTags = document.querySelectorAll(
      'link[rel="alternate"][hreflang]',
    );
    existingTags.forEach((tag) => tag.remove());

    // Add new hreflang tags to head
    tags.forEach((tag) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.setAttribute("hreflang", tag.hreflang);
      link.href = tag.href;
      document.head.appendChild(link);
    });

    // Cleanup
    return () => {
      tags.forEach((tag) => {
        const links = document.querySelectorAll(
          `link[rel="alternate"][hreflang="${tag.hreflang}"]`,
        );
        links.forEach((link) => {
          if (link.getAttribute("href") === tag.href) {
            link.remove();
          }
        });
      });
    };
  }, [pathname, baseUrl, locales]);

  // Component doesn't render anything, it manipulates the DOM directly
  return null;
}
