import type { Metadata } from "next";

/**
 * Privacy Policy layout metadata
 * Used by all locale-specific privacy pages
 * F-75: Localized metadata for search engines
 */
export const metadata: Metadata = {
  title: "Privacy Policy - MirrorBuddy",
  description:
    "Read MirrorBuddy privacy policy explaining how we protect your data and personal information.",
  robots: "index, follow",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
