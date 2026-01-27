"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PDFPreviewFooterProps {
  selectedCount: number;
  allowMultiSelect: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PDFPreviewFooter({
  selectedCount,
  allowMultiSelect,
  onClose,
  onConfirm,
}: PDFPreviewFooterProps) {
  const t = useTranslations("tools.pdf.preview");

  return (
    <div className="p-4 border-t border-slate-700 flex items-center justify-between">
      <div className="text-sm text-slate-400">
        {t("selected-count", { count: selectedCount })}
        {allowMultiSelect && (
          <span className="ml-2">{t("click-to-select")}</span>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="border-slate-600"
        >
          {t("cancel")}
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-green-600 hover:bg-green-700"
          disabled={selectedCount === 0}
        >
          <Check className="w-4 h-4 mr-2" />
          {t("analyze")} {t("analyze-pages", { count: selectedCount })}
        </Button>
      </div>
    </div>
  );
}
