"use client";

interface StagingDataToggleProps {
  showStagingData: boolean;
  onToggle: (show: boolean) => void;
  hiddenCount?: number;
}

export function StagingDataToggle({
  showStagingData,
  onToggle,
  hiddenCount,
}: StagingDataToggleProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showStagingData}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded"
        />
        <span>Show staging data</span>
      </label>
      {!showStagingData && hiddenCount !== undefined && hiddenCount > 0 && (
        <span className="text-muted-foreground">
          ({hiddenCount} staging records hidden)
        </span>
      )}
    </div>
  );
}
