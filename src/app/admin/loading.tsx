export default function AdminLoading() {
  return (
    <div className="flex min-h-screen" role="status" aria-label="Loading admin panel">
      <div className="w-64 animate-pulse bg-gray-100 motion-reduce:animate-none" />
      <div className="flex-1 space-y-4 p-6">
        <div className="h-8 w-56 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
          <div className="h-24 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
          <div className="h-24 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-gray-50 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
