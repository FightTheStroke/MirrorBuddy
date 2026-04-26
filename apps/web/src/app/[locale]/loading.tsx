import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const t = await getTranslations('loading');

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-label={t('ariaLabel')}
    >
      <div className="space-y-4 w-full max-w-2xl px-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
        <div className="h-32 w-full animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
