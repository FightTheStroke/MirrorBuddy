import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Mark as dynamic to allow headers() in parent layout
export const dynamic = "force-dynamic";

export default async function NotFound() {
  const t = await getTranslations("errors.notFoundPage");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-slate-900 dark:text-white mb-4">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
          {t("title")}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">
          {t("description")}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
