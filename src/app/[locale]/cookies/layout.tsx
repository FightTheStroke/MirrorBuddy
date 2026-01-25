import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy - MirrorBuddy',
  description: 'Informativa sui Cookie di MirrorBuddy',
};

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
