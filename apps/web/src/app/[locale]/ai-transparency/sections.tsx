import { ReactNode } from "react";

interface SectionProps {
  number?: number;
  title: string;
  children: ReactNode;
}

export function Section({ number, title, children }: SectionProps) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-start gap-3">
        {number && (
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">
            {number}
          </span>
        )}
        {title}
      </h2>
      <div className="text-slate-700 dark:text-gray-300 leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  );
}
