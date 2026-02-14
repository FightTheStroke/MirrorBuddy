'use client';

interface MaintenancePageClientProps {
  title: string;
  heading: string;
  description: string;
  apology: string;
  refreshPageLabel: string;
  estimatedReturn: string;
}

export function MaintenancePageClient({
  title,
  heading,
  description,
  apology,
  refreshPageLabel,
  estimatedReturn,
}: MaintenancePageClientProps) {
  const refreshPage = () => {
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900 sm:px-6 lg:px-8">
      <section
        aria-labelledby="maintenance-heading"
        className="mx-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</p>
        <h1 id="maintenance-heading" className="mt-2 text-3xl font-bold text-slate-900">
          {heading}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-800">{description}</p>
        <p className="mt-4 text-base leading-7 text-slate-800">{apology}</p>
        <p className="mt-4 text-sm font-medium text-slate-700">{estimatedReturn}</p>

        <div className="mt-8">
          <button
            type="button"
            onClick={refreshPage}
            className="inline-flex items-center rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            {refreshPageLabel}
          </button>
        </div>
      </section>
    </main>
  );
}
