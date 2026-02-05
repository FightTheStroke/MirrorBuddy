interface FunnelErrorStateProps {
  error: string;
}

export function FunnelErrorState({ error }: FunnelErrorStateProps) {
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-lg">
        Error: {error}
      </div>
    </div>
  );
}
