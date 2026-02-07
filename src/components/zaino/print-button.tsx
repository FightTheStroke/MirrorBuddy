"use client";

/**
 * Print Button Component
 *
 * Provides accessible print functionality for Zaino materials.
 * Reads user accessibility settings and applies them to printed content.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Printer, Loader2, Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccessibilityStore } from "@/lib/accessibility";
import {
  printAccessible,
  downloadAsHtml,
  type PrintableContentType,
} from "@/lib/tools/accessible-print";
import { toast } from "@/components/ui/toast";
import { logger } from "@/lib/logger";

interface PrintButtonProps {
  title: string;
  contentType: PrintableContentType;
  content: unknown;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showDownloadOption?: boolean;
}

export function PrintButton({
  title,
  contentType,
  content,
  className,
  variant = "outline",
  size = "sm",
  showDownloadOption = true,
}: PrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const settings = useAccessibilityStore((s) => s.settings);
  const t = useTranslations("tools.print");

  const handlePrint = useCallback(async () => {
    setIsPrinting(true);
    try {
      await printAccessible({
        title,
        contentType,
        content,
        accessibility: settings,
        showDate: true,
        showWatermark: true,
      });
      toast.success(t("successTitle"), t("successMessage"));
    } catch (error) {
      logger.error("[PrintButton] Print failed", { error: String(error) });
      toast.error(t("errorTitle"), t("errorMessage"));
    } finally {
      setIsPrinting(false);
    }
  }, [title, contentType, content, settings, t]);

  const handleDownload = useCallback(() => {
    try {
      downloadAsHtml({
        title,
        contentType,
        content,
        accessibility: settings,
        showDate: true,
        showWatermark: true,
      });
      toast.success(t("downloadSuccessTitle"), t("downloadSuccessMessage"));
    } catch (error) {
      logger.error("[PrintButton] Download failed", { error: String(error) });
      toast.error(t("errorTitle"), t("errorGenericMessage"));
    }
  }, [title, contentType, content, settings, t]);

  if (!showDownloadOption) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handlePrint}
        disabled={isPrinting}
        className={className}
        aria-label={t("ariaPrint", { title })}
      >
        {isPrinting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Printer className="w-4 h-4" />
        )}
        <span className="ml-2 hidden sm:inline">{t("buttonLabel")}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isPrinting}
          className={className}
          aria-label={t("ariaOptions", { title })}
        >
          {isPrinting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          <span className="ml-2 hidden sm:inline">{t("buttonLabel")}</span>
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePrint} disabled={isPrinting}>
          <Printer className="w-4 h-4 mr-2" />
          {t("pdfOption")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          {t("htmlOption")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
