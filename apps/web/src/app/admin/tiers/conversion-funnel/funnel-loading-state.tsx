export function FunnelLoadingState() {
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-slate-200 dark:bg-slate-700 rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
