'use client';

import type { BaseRendererProps } from './index';

export function ImageRenderer({ data, className, readOnly }: BaseRendererProps) {
  // TODO: Task 5.14 - Implement image renderer
  return (
    <div className={className} data-readonly={readOnly}>
      <pre className="p-4 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
