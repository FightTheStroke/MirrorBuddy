import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

// System font stack - avoids external font fetching which may be blocked
// This stack uses Inter if available locally, falls back to system UI fonts
const fontFamily = {
  className: 'font-sans', // Use Tailwind's sans font stack
};

export const metadata: Metadata = {
  title: 'MirrorBuddy - The school we wished existed',
  description: 'AI-powered educational platform with 16 historical Maestros, voice tutoring, and personalized learning for students with learning differences.',
  keywords: ['education', 'AI', 'tutoring', 'voice', 'learning', 'DSA', 'ADHD', 'MirrorBuddy'],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'MirrorBuddy',
    description: 'The school we wished existed. Now it does.',
    images: [{ url: '/icon-512.png', width: 512, height: 512 }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'MirrorBuddy',
    description: 'The school we wished existed. Now it does.',
    images: ['/icon-256.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${fontFamily.className} antialiased`}>
        <Providers>
          <main id="main-content">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
