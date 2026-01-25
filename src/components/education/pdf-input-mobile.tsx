"use client";

import { useState, useRef } from "react";
import { Upload, Camera, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getValidationError } from "./pdf-input-mobile-helpers";

interface PdfInputMobileProps {
  onUpload: (file: File) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * PdfInputMobile - Touch-optimized PDF/image upload component for mobile
 * Provides camera capture and file picker with 44px+ touch targets (F-26)
 */
export function PdfInputMobile({
  onUpload,
  onError,
  className,
}: PdfInputMobileProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    const error = getValidationError(file);
    if (error) {
      setUploadError(error);
      onError?.(error);
      return;
    }

    setUploadError(null);
    setUploadSuccess(false);
    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) =>
        prev >= 90 ? prev : prev + Math.random() * 30,
      );
    }, 200);

    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setIsUploading(false);
      setUploadSuccess(true);
      onUpload(file);

      setTimeout(() => {
        setUploadSuccess(false);
        setUploadProgress(0);
      }, 2000);
    }, 1500);
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    handleFileSelect(event.target.files?.[0] || null);
  };

  const handleFilePickerClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "w-full max-w-md mx-auto p-4",
        "bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800",
        "shadow-sm dark:shadow-lg",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Upload Document
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Choose a PDF or image to get started
        </p>
      </div>

      {/* Status Messages */}
      {uploadError && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">
            {uploadError}
          </p>
        </div>
      )}

      {uploadSuccess && (
        <div
          role="status"
          className="mb-4 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 flex items-start gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 dark:text-green-300">
            File uploaded successfully!
          </p>
        </div>
      )}

      {/* Progress Indicator */}
      {isUploading && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Uploading...
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {Math.round(uploadProgress)}%
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(uploadProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Controls */}
      <div className="space-y-3 flex flex-col">
        {/* File Picker Button */}
        <button
          type="button"
          onClick={handleFilePickerClick}
          disabled={isUploading}
          aria-label="Choose a file from your device"
          className={cn(
            "w-full",
            "min-h-[44px] min-w-[44px] h-auto",
            "py-3 px-4",
            "flex items-center justify-center gap-2",
            "rounded-lg border-2 border-slate-300 dark:border-slate-700",
            "bg-slate-50 dark:bg-slate-900",
            "text-slate-700 dark:text-slate-300",
            "font-medium text-sm transition-colors duration-200",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            "hover:border-slate-400 dark:hover:border-slate-600",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
            isUploading && "opacity-50 cursor-not-allowed",
          )}
        >
          <Upload className="w-5 h-5" />
          <span>Choose File</span>
        </button>

        {/* Camera Capture Button */}
        <button
          type="button"
          onClick={handleCameraClick}
          disabled={isUploading}
          aria-label="Capture document with camera"
          className={cn(
            "w-full",
            "min-h-[44px] min-w-[44px] h-auto",
            "py-3 px-4",
            "flex items-center justify-center gap-2",
            "rounded-lg border-2 border-blue-500 dark:border-blue-400",
            "bg-blue-50 dark:bg-blue-950",
            "text-blue-700 dark:text-blue-300",
            "font-medium text-sm transition-colors duration-200",
            "hover:bg-blue-100 dark:hover:bg-blue-900",
            "hover:border-blue-600 dark:hover:border-blue-300",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
            isUploading && "opacity-50 cursor-not-allowed",
          )}
        >
          <Camera className="w-5 h-5" />
          <span>Scan Document</span>
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Helper Text */}
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
        Accepted formats: PDF, JPEG, PNG, WebP • Max 50MB
      </p>
    </div>
  );
}
