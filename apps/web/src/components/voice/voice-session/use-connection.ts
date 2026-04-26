import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import type { Maestro } from '@/types';
import type { ConnectionInfo, ConnectionError } from './types';

interface UseConnectionProps {
  maestro: Maestro;
  connect: (maestro: Maestro, connectionInfo: ConnectionInfo) => Promise<void>;
  isConnected: boolean;
  connectionState: string;
  permissionsMicrophone: string;
  permissionsLoading: boolean;
  onPermissionError: (error: string) => void;
}

export function useConnection({
  maestro,
  connect,
  isConnected,
  connectionState,
  permissionsMicrophone,
  permissionsLoading,
  onPermissionError,
}: UseConnectionProps) {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [configError, setConfigError] = useState<ConnectionError | null>(null);
  const hasAttemptedConnection = useRef(false);

  // Fetch connection info
  useEffect(() => {
    async function init() {
      try {
        const response = await fetch('/api/realtime/token');
        const data = await response.json();
        if (data.error) {
          logger.error('API error', { error: data.error });
          setConfigError(data as ConnectionError);
          return;
        }
        setConnectionInfo(data as ConnectionInfo);
      } catch (error) {
        logger.error('Failed to get connection info', { error: String(error) });
        setConfigError({
          error: 'Connection failed',
          message: 'Unable to connect to the API server',
        });
      }
    }
    init();
  }, []);

  // Connect when connection info is available
  useEffect(() => {
    const startConnection = async () => {
      if (hasAttemptedConnection.current) {
        return;
      }

      if (!connectionInfo || isConnected || connectionState !== 'idle' || permissionsLoading) {
        return;
      }

      if (permissionsMicrophone === 'denied') {
        onPermissionError('Microphone access was denied. Please enable it in your browser settings.');
        return;
      }

      hasAttemptedConnection.current = true;
      onPermissionError('');

      try {
        await connect(maestro, connectionInfo);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          onPermissionError('Microphone access is required for voice sessions. Please grant permission.');
        }
      }
    };

    startConnection();
  }, [
    connectionInfo,
    isConnected,
    connectionState,
    maestro,
    connect,
    permissionsMicrophone,
    permissionsLoading,
    onPermissionError,
  ]);

  return { connectionInfo, configError };
}
