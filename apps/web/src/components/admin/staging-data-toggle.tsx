"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations("admin");
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showStagingData}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded"
        />
        <span>{t("showStagingData")}</span>
      </label>
      {!showStagingData && hiddenCount !== undefined && hiddenCount > 0 && (
        <span className="text-muted-foreground">
          ({hiddenCount} {t("stagingRecordsHidden")}
        </span>
      )}
    </div>
  );
}
