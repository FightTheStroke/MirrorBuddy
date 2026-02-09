"use client";

/**
 * Knowledge Hub Image Renderer
 *
 * Displays images captured from webcam or uploaded photos.
 *
 * Expected data format:
 * {
 *   title?: string;
 *   url: string;
 *   caption?: string;
 *   alt?: string;
 * }
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Download, ZoomIn, ZoomOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BaseRendererProps } from "./types";
import { useTranslations } from "next-intl";

interface ImageData {
  title?: string;
  url?: string;
  caption?: string;
  alt?: string;
}

/**
 * Render an image for Knowledge Hub.
 */
export function ImageRenderer({ data, className }: BaseRendererProps) {
  const t = useTranslations("education");
  const imageData = data as ImageData;
  const [isZoomed, setIsZoomed] = useState(false);

  const title = imageData.title || "Immagine";
  const url = imageData.url;
  const alt = imageData.alt || title;

  if (!url) {
    return (
      <div className={cn("p-4 text-center text-slate-500", className)}>
        <ImageIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
        {t("nessunaImmagineDisponibile")}
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800",
          className,
        )}
      >
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="w-full h-auto object-contain max-h-96"
          />

          {/* Overlay actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={() => setIsZoomed(true)}
              className="p-2 rounded-full bg-white/90 hover:bg-white shadow-lg"
              aria-label={t("ingrandisci")}
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <a
              href={url}
              download
              className="p-2 rounded-full bg-white/90 hover:bg-white shadow-lg"
              aria-label={t("scarica")}
            >
              <Download className="w-5 h-5" />
            </a>
          </div>
        </div>

        {(title || imageData.caption) && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-700">
            {title && (
              <h4 className="font-medium text-slate-900 dark:text-slate-100">
                {title}
              </h4>
            )}
            {imageData.caption && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {imageData.caption}
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Fullscreen zoom modal */}
      {isZoomed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label={t("chiudi")}
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-2"
          >
            <ZoomOut className="w-5 h-5" />
            {t("riduci")}
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="max-w-full max-h-full object-contain"
          />
        </motion.div>
      )}
    </>
  );
}
