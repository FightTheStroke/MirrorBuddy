/**
 * Google Picker API Hook
 * ADR 0038 - Google Drive Integration
 *
 * Hook to load and use Google Picker API for native file selection UI.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// Google Picker types
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: { apiKey?: string; discoveryDocs?: string[] }) => Promise<void>;
      };
    };
    google: {
      picker: {
        PickerBuilder: new () => GooglePickerBuilder;
        ViewId: {
          DOCS: string;
          FOLDERS: string;
          PDFS: string;
          DOCS_IMAGES: string;
          DOCUMENTS: string;
          SPREADSHEETS: string;
        };
        DocsView: new (viewId?: string) => GoogleDocsView;
        DocsUploadView: new () => GoogleDocsView;
        Feature: {
          MULTISELECT_ENABLED: string;
          NAV_HIDDEN: string;
          SUPPORT_DRIVES: string;
        };
        Action: {
          PICKED: string;
          CANCEL: string;
        };
      };
    };
  }
}

interface GooglePickerBuilder {
  setAppId(appId: string): GooglePickerBuilder;
  setOAuthToken(token: string): GooglePickerBuilder;
  setDeveloperKey(key: string): GooglePickerBuilder;
  addView(view: GoogleDocsView): GooglePickerBuilder;
  enableFeature(feature: string): GooglePickerBuilder;
  setCallback(callback: (data: GooglePickerResponse) => void): GooglePickerBuilder;
  setTitle(title: string): GooglePickerBuilder;
  setLocale(locale: string): GooglePickerBuilder;
  build(): GooglePicker;
}

interface GoogleDocsView {
  setIncludeFolders(include: boolean): GoogleDocsView;
  setSelectFolderEnabled(enabled: boolean): GoogleDocsView;
  setMimeTypes(mimeTypes: string): GoogleDocsView;
  setQuery(query: string): GoogleDocsView;
}

interface GooglePicker {
  setVisible(visible: boolean): void;
}

interface GooglePickerResponse {
  action: string;
  docs?: GooglePickerDocument[];
}

export interface GooglePickerDocument {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  iconUrl: string;
  sizeBytes?: number;
  lastEditedUtc?: number;
}

interface UseGooglePickerOptions {
  userId: string;
  onSelect: (files: GooglePickerDocument[]) => void;
  mimeTypes?: string[];
  multiSelect?: boolean;
}

const PICKER_API_URL = 'https://apis.google.com/js/api.js';

export function useGooglePicker({
  userId,
  onSelect,
  mimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'],
  multiSelect = false,
}: UseGooglePickerOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<GooglePicker | null>(null);

  // Load Google API script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.gapi && window.google?.picker) {
      setIsReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = PICKER_API_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load('picker', () => {
        setIsReady(true);
      });
    };
    script.onerror = () => {
      setError('Failed to load Google Picker API');
    };
    document.body.appendChild(script);

    return () => {
      // Script cleanup not needed as it should persist
    };
  }, []);

  const openPicker = useCallback(async () => {
    if (!isReady || !window.google?.picker) {
      setError('Google Picker not ready');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get access token from our API
      const tokenResponse = await fetch(`/api/auth/google/token?userId=${userId}`);
      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        throw new Error(data.error || 'Failed to get access token');
      }
      const { accessToken } = await tokenResponse.json();

      // Get client ID from environment
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }

      // Extract app ID from client ID (format: xxx.apps.googleusercontent.com)
      const appId = clientId.split('.')[0];

      // Create view for files
      const docsView = new window.google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
        .setMimeTypes(mimeTypes.join(','));

      // Build picker
      const builder = new window.google.picker.PickerBuilder()
        .setAppId(appId)
        .setOAuthToken(accessToken)
        .addView(docsView)
        .setCallback((data: GooglePickerResponse) => {
          if (data.action === window.google.picker.Action.PICKED && data.docs) {
            onSelect(data.docs);
          }
        })
        .setTitle('Seleziona file da Google Drive')
        .setLocale('it');

      // Enable multiselect if requested
      if (multiSelect) {
        builder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
      }

      // Enable shared drives
      builder.enableFeature(window.google.picker.Feature.SUPPORT_DRIVES);

      const picker = builder.build();
      pickerRef.current = picker;
      picker.setVisible(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open picker');
    } finally {
      setIsLoading(false);
    }
  }, [isReady, userId, mimeTypes, multiSelect, onSelect]);

  return {
    openPicker,
    isLoading,
    isReady,
    error,
  };
}
