import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import { getNonce } from "@/lib/security/csp-nonce";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: "MirrorBuddy - The school we wished existed",
  description:
    "AI-powered educational platform with 17 historical Maestros, 5 Coaches, 5 Buddies, voice tutoring, and personalized learning for students with learning differences.",
  keywords: [
    "education",
    "AI",
    "tutoring",
    "voice",
    "learning",
    "DSA",
    "ADHD",
    "MirrorBuddy",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "MirrorBuddy",
    description: "The school we wished existed. Now it does.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "MirrorBuddy",
    description: "The school we wished existed. Now it does.",
    images: ["/icon-256.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get CSP nonce for Next.js hydration scripts
  // Next.js will automatically add this nonce to inline scripts when available
  const nonce = await getNonce();

  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers nonce={nonce}>
          <main id="main-content" data-testid="main-content">
            {children}
          </main>
        </Providers>
        <Analytics nonce={nonce} />
      </body>
    </html>
  );
}
