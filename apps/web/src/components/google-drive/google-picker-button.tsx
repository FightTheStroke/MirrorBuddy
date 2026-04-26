/**
 * Google Picker Button Component
 * ADR 0038 - Google Drive Integration
 *
 * Button that opens native Google Drive file picker.
 * Falls back to custom picker if native API unavailable.
 */

'use client';

import { useCallback, useState } from 'react';
import { Cloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGooglePicker, type GooglePickerDocument } from './use-google-picker';
import { useGoogleDrive } from './use-google-drive';
import { cn } from '@/lib/utils';

interface GooglePickerButtonProps {
  userId: string;
  onFileSelect: (file: { id: string; name: string; mimeType: string }) => void;
  acceptedTypes?: string[];
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
}

export function GooglePickerButton({
  userId,
  onFileSelect,
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'],
  className,
  variant = 'outline',
  size = 'default',
  children,
}: GooglePickerButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { isConnected, isLoading: isCheckingConnection } = useGoogleDrive({ userId });

  const handleSelect = useCallback(
    async (docs: GooglePickerDocument[]) => {
      if (docs.length === 0) return;

      const doc = docs[0];
      setIsDownloading(true);

      try {
        // Pass the selected file info to parent
        onFileSelect({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mimeType,
        });
      } finally {
        setIsDownloading(false);
      }
    },
    [onFileSelect]
  );

  const { openPicker, isLoading: isOpeningPicker, isReady, error } = useGooglePicker({
    userId,
    onSelect: handleSelect,
    mimeTypes: acceptedTypes,
    multiSelect: false,
  });

  const handleClick = useCallback(() => {
    if (!isConnected) {
      // Redirect to Google OAuth
      window.location.href = `/api/auth/google?userId=${userId}&returnUrl=${window.location.pathname}`;
      return;
    }
    openPicker();
  }, [isConnected, userId, openPicker]);

  const isLoading = isCheckingConnection || isOpeningPicker || isDownloading;
  const buttonDisabled = isLoading || (!isReady && isConnected);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={buttonDisabled}
      className={cn('gap-2', className)}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Cloud className="w-4 h-4" />
      )}
      {children || (isConnected ? 'Da Google Drive' : 'Connetti Google Drive')}
      {error && <span className="text-red-500 text-xs ml-2">{error}</span>}
    </Button>
  );
}
