"use client";

/**
 * Knowledge Hub PDF Renderer
 *
 * Displays PDF documents or links to uploaded PDFs.
 *
 * Expected data format:
 * {
 *   title?: string;
 *   url: string;
 *   pageCount?: number;
 *   thumbnailUrl?: string;
 * }
 */

import { motion } from "framer-motion";
import { FileText, Download, ExternalLink, File } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BaseRendererProps } from "./types";

interface PdfData {
  title?: string;
  url?: string;
  pageCount?: number;
  thumbnailUrl?: string;
  filename?: string;
}

/**
 * Render a PDF preview for Knowledge Hub.
 */
export function PdfRenderer({ data, className }: BaseRendererProps) {
  const pdfData = data as PdfData;

  const title = pdfData.title || pdfData.filename || "Documento PDF";
  const url = pdfData.url;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800",
        className,
      )}
    >
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h3>
            {pdfData.pageCount && (
              <span className="text-sm text-slate-500">
                {pdfData.pageCount} pagine
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {pdfData.thumbnailUrl ? (
          <div className="mb-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pdfData.thumbnailUrl}
              alt={`Anteprima di ${title}`}
              className="w-full h-48 object-cover"
            />
          </div>
        ) : (
          <div className="mb-4 h-32 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
            <File className="w-16 h-16 text-slate-300 dark:text-slate-600" />
          </div>
        )}

        <div className="flex gap-2">
          {url && (
            <>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-accent-themed text-white hover:brightness-110 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Apri
              </a>
              <a
                href={url}
                download
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                aria-label="Scarica PDF"
              >
                <Download className="w-5 h-5" />
              </a>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
