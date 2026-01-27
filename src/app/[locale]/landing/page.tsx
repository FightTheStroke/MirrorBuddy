import { redirect } from "next/navigation";

interface LandingPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * /{locale}/landing route - redirects to /{locale}/welcome
 * Kept for backwards compatibility with provider-check and proxy redirects.
 */
export default async function LandingRedirect({ params }: LandingPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/welcome`);
}
