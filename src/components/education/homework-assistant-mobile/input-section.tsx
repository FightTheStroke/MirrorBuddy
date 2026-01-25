/**
 * Input Section Component
 *
 * Camera-first input for homework assistant
 */

import { useRef } from "react";
import { Camera, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TouchTarget } from "@/components/ui/touch-target";
import {
  SUBJECTS,
  getValidationError,
} from "../homework-assistant-mobile-helpers";

interface InputSectionProps {
  onFileSelect: (file: File) => void;
  onError?: (error: string) => void;
  isAnalyzing: boolean;
  uploadProgress: number;
  error: string | null;
  analysisSuccess: boolean;
  selectedSubject: string;
  onSubjectSelect: (subject: string) => void;
}

export function InputSection({
  onFileSelect,
  onError,
  isAnalyzing,
  uploadProgress,
  error,
  analysisSuccess,
  selectedSubject,
  onSubjectSelect,
}: InputSectionProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    const validationError = getValidationError(file);
    if (validationError) {
      onError?.(validationError);
      return;
    }

    onFileSelect(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files?.[0] || null);
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Subject Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Select Subject (Optional)
        </label>
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
          {SUBJECTS.map((subject) => (
            <TouchTarget key={subject} asChild>
              <button
                type="button"
                onClick={() => onSubjectSelect(subject)}
                className={cn(
                  "px-3 py-2 rounded-lg border-2 text-sm font-medium",
                  "transition-colors duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "focus:ring-offset-2 dark:focus:ring-offset-slate-950",
                  selectedSubject === subject
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600",
                )}
              >
                {subject}
              </button>
            </TouchTarget>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </motion.div>
      )}

      {/* Success State */}
      {analysisSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 flex gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 dark:text-green-300">
            Analysis complete! Generating solution...
          </p>
        </motion.div>
      )}

      {/* Upload Progress */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Analyzing homework...
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {Math.round(uploadProgress)}%
            </p>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 dark:bg-blue-400"
              initial={{ width: "0%" }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {/* Camera-First Actions */}
      <div className="space-y-3 flex flex-col">
        {/* Camera Button - Primary Action on Mobile */}
        <TouchTarget asChild>
          <button
            type="button"
            onClick={handleCameraClick}
            disabled={isAnalyzing}
            aria-label="Capture homework with camera"
            className={cn(
              "w-full",
              "py-4 px-4",
              "flex items-center justify-center gap-3",
              "rounded-lg border-2 border-blue-500 dark:border-blue-400",
              "bg-blue-50 dark:bg-blue-950",
              "text-blue-700 dark:text-blue-300",
              "font-semibold text-base transition-colors duration-200",
              "hover:bg-blue-100 dark:hover:bg-blue-900",
              "hover:border-blue-600 dark:hover:border-blue-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
              "xs:text-lg",
            )}
          >
            <Camera className="w-6 h-6" />
            <span>Take Photo</span>
          </button>
        </TouchTarget>

        {/* Gallery Button - Alternative */}
        <TouchTarget asChild>
          <button
            type="button"
            onClick={handleGalleryClick}
            disabled={isAnalyzing}
            aria-label="Choose homework from gallery"
            className={cn(
              "w-full",
              "py-4 px-4",
              "flex items-center justify-center gap-3",
              "rounded-lg border-2 border-slate-300 dark:border-slate-700",
              "bg-slate-50 dark:bg-slate-900",
              "text-slate-700 dark:text-slate-300",
              "font-semibold text-base transition-colors duration-200",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              "hover:border-slate-400 dark:hover:border-slate-600",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
              "xs:text-lg",
            )}
          >
            <Upload className="w-6 h-6" />
            <span>Choose File</span>
          </button>
        </TouchTarget>
      </div>

      {/* Helper Text */}
      <p className="text-xs xs:text-sm text-slate-500 dark:text-slate-400 text-center">
        Supported: JPEG, PNG, WebP, PDF • Max 50MB
      </p>

      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </motion.div>
  );
}
