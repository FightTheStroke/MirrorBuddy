/**
 * Google Picker API Hook
 * ADR 0038 - Google Drive Integration
 *
 * Hook to load and use Google Picker API for native file selection UI.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import toast from '@/components/ui/toast';

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
      logger.debug('[GooglePicker] API already loaded');
      setIsReady(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${PICKER_API_URL}"]`);
    if (existingScript) {
      logger.debug('[GooglePicker] Script tag exists, waiting for load');
      return;
    }

    logger.debug('[GooglePicker] Loading Google API script');
    const script = document.createElement('script');
    script.src = PICKER_API_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      logger.debug('[GooglePicker] Script loaded, loading picker module');
      window.gapi.load('picker', () => {
        logger.debug('[GooglePicker] Picker module ready');
        setIsReady(true);
      });
    };
    script.onerror = () => {
      logger.error('[GooglePicker] Failed to load script');
      setError('Failed to load Google Picker API');
    };
    document.body.appendChild(script);

    return () => {
      // Script cleanup not needed as it should persist
    };
  }, []);

  const openPicker = useCallback(async () => {
    logger.debug('[GooglePicker] openPicker called, isReady:', { isReady });
    if (!isReady || !window.google?.picker) {
      const msg = 'Google Picker not ready';
      logger.warn('[GooglePicker] Google Picker not ready');
      setError(msg);
      toast.error('Google Picker non pronto. Riprova tra qualche secondo.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get access token from our API
      logger.debug('[GooglePicker] Fetching access token for user:', { userId });
      const tokenResponse = await fetch(`/api/auth/google/token?userId=${userId}`);
      if (!tokenResponse.ok) {
        const data = await tokenResponse.json();
        const errorMsg = data.error || 'Failed to get access token';
        logger.error('[GooglePicker] Token error:', { errorMessage: errorMsg });
        if (errorMsg.includes('Not connected')) {
          toast.error('Devi prima connettere Google Drive nelle Impostazioni.');
        } else {
          toast.error(errorMsg);
        }
        throw new Error(errorMsg);
      }
      const { accessToken } = await tokenResponse.json();
      logger.debug('[GooglePicker] Got access token');

      // Get client ID from environment
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        const msg = 'Google Client ID not configured';
        logger.error('[GooglePicker] Google Client ID not configured');
        toast.error('Configurazione Google mancante');
        throw new Error(msg);
      }

      // Extract app ID from client ID (format: xxx.apps.googleusercontent.com)
      const appId = clientId.split('.')[0];
      logger.debug('[GooglePicker] Building picker with appId:', { appId });

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
          logger.debug('[GooglePicker] Callback received:', { action: data.action });
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
      logger.debug('[GooglePicker] Opening picker');
      picker.setVisible(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to open picker';
      logger.error('[GooglePicker] Error:', { errorMessage: errorMsg });
      setError(errorMsg);
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
