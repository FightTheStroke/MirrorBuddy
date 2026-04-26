import { getTranslations } from 'next-intl/server';

export default async function MaestroLoading() {
  const t = await getTranslations('loading');

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-label={t('chatAriaLabel')}
    >
      <div className="space-y-4 w-full max-w-3xl px-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200 motion-reduce:animate-none" />
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
        </div>
        <div className="space-y-3">
          <div className="h-16 w-3/4 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
          <div className="ml-auto h-12 w-1/2 animate-pulse rounded-lg bg-blue-50 motion-reduce:animate-none" />
          <div className="h-16 w-2/3 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
        </div>
        <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
