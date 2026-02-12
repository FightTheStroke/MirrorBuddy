'use client';

/**
 * useGoogleDrive Hook
 * ADR 0038 - Google Drive Integration
 *
 * Client-side hook for Google Drive connection status and file operations.
 */

import { useState, useEffect, useCallback } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import { csrfFetch } from '@/lib/auth';
import type { GoogleConnectionStatus, DriveFileUI, DriveBreadcrumb } from '@/lib/google';

interface UseGoogleDriveOptions {
  userId: string;
}

interface UseGoogleDriveReturn {
  // Connection
  isConnected: boolean;
  isLoading: boolean;
  connectionStatus: GoogleConnectionStatus | null;
  connect: () => void;
  disconnect: () => Promise<void>;
  refreshStatus: () => Promise<void>;

  // File browser
  files: DriveFileUI[];
  breadcrumbs: DriveBreadcrumb[];
  currentFolderId: string;
  isLoadingFiles: boolean;
  hasMore: boolean;
  error: string | null;

  // Actions
  navigateToFolder: (folderId: string) => Promise<void>;
  searchFiles: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearSearch: () => Promise<void>;
}

export function useGoogleDrive({ userId }: UseGoogleDriveOptions): UseGoogleDriveReturn {
  // Connection state
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<GoogleConnectionStatus | null>(null);

  // File browser state
  const [files, setFiles] = useState<DriveFileUI[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  // Fetch connection status
  const refreshStatus = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/google/status?userId=${userId}`);
      if (response.ok) {
        const status = await response.json();
        setConnectionStatus(status);
      }
    } catch (err) {
      logger.error('[useGoogleDrive] Failed to get status:', {
        error: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Check URL for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      refreshStatus();
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('google_connected');
      window.history.replaceState({}, '', url.toString());
    }
    if (params.get('google_error')) {
      setError(`Google connection failed: ${params.get('google_error')}`);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('google_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [refreshStatus]);

  // Connect to Google
  const connect = useCallback(() => {
    const returnUrl = window.location.pathname;
    window.location.href = `/api/auth/google?userId=${userId}&returnUrl=${encodeURIComponent(returnUrl)}`;
  }, [userId]);

  // Disconnect from Google
  const disconnect = useCallback(async () => {
    try {
      const response = await csrfFetch('/api/auth/google/disconnect', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setConnectionStatus({ isConnected: false });
        setFiles([]);
        setBreadcrumbs([]);
      }
    } catch (err) {
      logger.error('[useGoogleDrive] Failed to disconnect:', {
        error: String(err),
      });
    }
  }, [userId]);

  // Fetch files from API
  const fetchFiles = useCallback(
    async (folderId: string, search?: string, pageToken?: string) => {
      setIsLoadingFiles(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId });
        if (folderId && !search) params.set('folderId', folderId);
        if (search) params.set('search', search);
        if (pageToken) params.set('pageToken', pageToken);

        const response = await fetch(`/api/google-drive/files?${params.toString()}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch files');
        }

        const data = await response.json();

        if (pageToken) {
          // Append to existing files
          setFiles((prev) => [...prev, ...data.files]);
        } else {
          // Replace files
          setFiles(data.files);
          setBreadcrumbs(data.breadcrumbs);
        }

        setNextPageToken(data.nextPageToken);
        setHasMore(data.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch files');
      } finally {
        setIsLoadingFiles(false);
      }
    },
    [userId],
  );

  // Navigate to folder
  const navigateToFolder = useCallback(
    async (folderId: string) => {
      setCurrentFolderId(folderId);
      setSearchQuery(null);
      await fetchFiles(folderId);
    },
    [fetchFiles],
  );

  // Search files
  const searchFiles = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        // Clear search inline to avoid dependency issues
        setSearchQuery(null);
        await fetchFiles(currentFolderId);
        return;
      }
      setSearchQuery(query);
      await fetchFiles('root', query);
    },
    [fetchFiles, currentFolderId],
  );

  // Clear search and go back to folder view
  const clearSearch = useCallback(async () => {
    setSearchQuery(null);
    await fetchFiles(currentFolderId);
  }, [fetchFiles, currentFolderId]);

  // Load more files (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || !nextPageToken) return;
    await fetchFiles(currentFolderId, searchQuery || undefined, nextPageToken);
  }, [fetchFiles, currentFolderId, searchQuery, hasMore, nextPageToken]);

  // Auto-load files when connected
  useEffect(() => {
    if (connectionStatus?.isConnected && !files.length && !isLoadingFiles) {
      fetchFiles('root');
    }
  }, [connectionStatus?.isConnected, files.length, isLoadingFiles, fetchFiles]);

  return {
    // Connection
    isConnected: connectionStatus?.isConnected ?? false,
    isLoading,
    connectionStatus,
    connect,
    disconnect,
    refreshStatus,

    // File browser
    files,
    breadcrumbs,
    currentFolderId,
    isLoadingFiles,
    hasMore,
    error,

    // Actions
    navigateToFolder,
    searchFiles,
    loadMore,
    clearSearch,
  };
}
