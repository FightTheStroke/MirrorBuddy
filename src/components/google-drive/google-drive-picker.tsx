"use client";

/**
 * GoogleDrivePicker Component
 * ADR 0038 - Google Drive Integration
 *
 * File browser for selecting files from Google Drive.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Folder,
  FileText,
  Image as ImageIcon,
  File,
  ChevronRight,
  Search,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGoogleDrive } from "./use-google-drive";
import type { DriveFileUI } from "@/lib/google";

interface GoogleDrivePickerProps {
  userId: string;
  onFileSelect: (file: DriveFileUI) => void;
  onDownload?: (fileId: string, fileName: string) => Promise<Blob>;
  acceptedTypes?: string[]; // MIME types to filter
  className?: string;
}

export function GoogleDrivePicker({
  userId,
  onFileSelect,
  acceptedTypes,
  className,
}: GoogleDrivePickerProps) {
  const t = useTranslations("googleDrive");
  const [searchInput, setSearchInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<DriveFileUI | null>(null);

  const {
    isConnected,
    isLoading,
    connectionStatus,
    connect,
    files,
    breadcrumbs,
    isLoadingFiles,
    hasMore,
    error,
    navigateToFolder,
    searchFiles,
    loadMore,
    clearSearch,
  } = useGoogleDrive({ userId });

  // Handle search submit
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchInput.trim()) {
        searchFiles(searchInput);
      }
    },
    [searchInput, searchFiles],
  );

  // Handle file click
  const handleFileClick = useCallback(
    (file: DriveFileUI) => {
      if (file.isFolder) {
        navigateToFolder(file.id);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
      }
    },
    [navigateToFolder],
  );

  // Handle file selection confirmation
  const handleConfirmSelect = useCallback(() => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [selectedFile, onFileSelect]);

  // Filter files by accepted types
  const filteredFiles = acceptedTypes
    ? files.filter((f) => f.isFolder || acceptedTypes.includes(f.mimeType))
    : files;

  // Get icon for file type
  const getFileIcon = (file: DriveFileUI) => {
    if (file.isFolder) return <Folder className="w-5 h-5 text-amber-500" />;
    if (file.mimeType.startsWith("image/"))
      return <ImageIcon className="w-5 h-5 text-green-500" />;
    if (file.mimeType === "application/pdf")
      return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-blue-500" />;
  };

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className={cn("text-center p-8 space-y-4", className)}>
        <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-lg">{t("connectButton")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("connectPrompt")}
          </p>
        </div>
        <Button onClick={connect}>{t("connectButton")}</Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with account info and search */}
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {connectionStatus?.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={connectionStatus.avatarUrl}
              alt={connectionStatus?.displayName || "Google account avatar"}
              className="w-6 h-6 rounded-full"
            />
          )}
          <span className="truncate max-w-[150px]">
            {connectionStatus?.email}
          </span>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  clearSearch();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Drive sections */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50 dark:bg-slate-900">
        <button
          onClick={() => navigateToFolder("root")}
          className={cn(
            "px-3 py-1 text-sm rounded-full transition-colors",
            breadcrumbs[0]?.id === "root"
              ? "bg-primary text-primary-foreground"
              : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
          )}
        >
          {t("myDrive")}
        </button>
        <button
          onClick={() => navigateToFolder("shared")}
          className={cn(
            "px-3 py-1 text-sm rounded-full transition-colors",
            breadcrumbs[0]?.id === "shared"
              ? "bg-primary text-primary-foreground"
              : "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600",
          )}
        >
          {t("sharedWithMe")}
        </button>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 px-4 py-2 text-sm overflow-x-auto border-b">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />
            )}
            <button
              onClick={() => navigateToFolder(crumb.id)}
              className={cn(
                "hover:underline whitespace-nowrap",
                index === breadcrumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingFiles && files.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            {t("noFilesFound")}
          </div>
        ) : (
          <div className="divide-y">
            {filteredFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => handleFileClick(file)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left",
                  selectedFile?.id === file.id && "bg-blue-50 dark:bg-blue-950",
                )}
              >
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    {file.modifiedAt && (
                      <span>
                        {new Date(file.modifiedAt).toLocaleDateString("it-IT")}
                      </span>
                    )}
                    {file.size && <span>{formatSize(file.size)}</span>}
                  </div>
                </div>
                {file.isFolder && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="p-4 text-center">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={isLoadingFiles}
            >
              {isLoadingFiles ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {t("loadMore")}
            </Button>
          </div>
        )}
      </div>

      {/* Footer with selection */}
      {selectedFile && (
        <div className="flex items-center justify-between gap-4 p-4 border-t bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2 min-w-0">
            {getFileIcon(selectedFile)}
            <span className="font-medium truncate">{selectedFile.name}</span>
          </div>
          <Button onClick={handleConfirmSelect}>{t("select")}</Button>
        </div>
      )}
    </div>
  );
}
