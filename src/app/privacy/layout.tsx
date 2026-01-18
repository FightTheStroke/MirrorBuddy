import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - MirrorBuddy',
  description: 'Informativa sulla Privacy di MirrorBuddy',
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
