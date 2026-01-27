import type { Metadata } from "next";

/**
 * Terms of Service layout metadata
 * Used by all locale-specific terms pages
 * F-75: Localized metadata for search engines
 * F-81: SEO optimization with proper robots and canonical tags
 */
export const metadata: Metadata = {
  title: "Terms of Service - MirrorBuddy",
  description:
    "Terms of Service for MirrorBuddy. Understand our service terms, user rights, and responsibilities.",
  robots: "index, follow",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
