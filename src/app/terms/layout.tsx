import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termini di Servizio | MirrorBuddy',
  description:
    'Termini di Servizio di MirrorBuddy in linguaggio semplice e comprensibile. Scopri cosa promettiamo e cosa ti chiediamo.',
  robots: 'index, follow',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
