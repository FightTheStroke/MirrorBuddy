'use client';

import { useState, useEffect, useMemo } from 'react';
import { Wifi, WifiOff, Radio, Globe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getTransportSwitcher,
  TransportSwitchRequest,
} from '@/lib/hooks/voice-session/transport-switcher';
import {
  getTransportDisplayName,
  getConfidenceDescription,
} from '@/lib/hooks/voice-session/transport-selector';

/**
 * Props for TransportStatusIndicator
 */
interface TransportStatusIndicatorProps {
  /** Current transport being used */
  transport?: 'webrtc' | 'websocket';
  /** Whether currently probing */
  isProbing?: boolean;
  /** Whether connection is active */
  isConnected?: boolean;
  /** Show detailed info on hover */
  showDetails?: boolean;
  /** Compact mode for small spaces */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Transport status for display
 */
type TransportStatus = 'webrtc' | 'websocket' | 'probing' | 'offline';

/**
 * Status configuration for each transport type
 */
const statusConfig: Record<TransportStatus, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
}> = {
  webrtc: {
    icon: Radio,
    label: 'WebRTC',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  websocket: {
    icon: Globe,
    label: 'WebSocket',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  probing: {
    icon: Loader2,
    label: 'Rilevamento...',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  offline: {
    icon: WifiOff,
    label: 'Offline',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
  },
};

/**
 * Transport Status Indicator Component
 *
 * Shows the current voice transport status (WebRTC/WebSocket/Probing)
 *
 * F-09: Show transport status indicator in UI
 */
export function TransportStatusIndicator({
  transport,
  isProbing = false,
  isConnected = false,
  showDetails = true,
  compact = false,
  className,
}: TransportStatusIndicatorProps) {
  const [switchedTransport, setSwitchedTransport] = useState<'webrtc' | 'websocket' | null>(null);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('high');
  const [showTooltip, setShowTooltip] = useState(false);

  // Compute current transport status from props and switch state
  const currentTransport = useMemo<TransportStatus>(() => {
    if (isProbing) return 'probing';
    if (!isConnected) return 'offline';
    if (switchedTransport) return switchedTransport;
    if (transport) return transport;
    return 'offline';
  }, [isProbing, isConnected, switchedTransport, transport]);

  // Listen for transport switches from external events
  useEffect(() => {
    const switcher = getTransportSwitcher();

    const unsubscribe = switcher.onSwitchRequest((request: TransportSwitchRequest) => {
      setSwitchedTransport(request.toTransport);
      setConfidence(request.selection.confidence);
    });

    return unsubscribe;
  }, []);

  // Reset switched transport when props transport changes
  useEffect(() => {
    if (transport) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync of derived state from props
      setSwitchedTransport(null);
    }
  }, [transport]);

  const config = statusConfig[currentTransport];
  const Icon = config.icon;
  const isAnimating = currentTransport === 'probing';

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs',
          config.bgColor,
          config.color,
          className
        )}
        title={`${config.label} - ${getConfidenceDescription(confidence)}`}
      >
        <Icon className={cn('h-3 w-3', isAnimating && 'animate-spin')} />
        <span className="font-medium">{config.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg',
        config.bgColor,
        className
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Icon className={cn('h-4 w-4', config.color, isAnimating && 'animate-spin')} />

      <div className="flex flex-col">
        <span className={cn('text-sm font-medium', config.color)}>
          {config.label}
        </span>
        {showDetails && isConnected && !isProbing && (
          <span className="text-xs text-slate-400">
            {getConfidenceDescription(confidence)}
          </span>
        )}
      </div>

      {/* Connection indicator */}
      {isConnected && !isProbing && (
        <Wifi className="h-3 w-3 text-green-400 ml-1" aria-hidden="true" />
      )}

      {/* Tooltip with detailed info */}
      {showTooltip && showDetails && (
        <div
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
            'px-3 py-2 rounded-lg bg-slate-800 border border-slate-700',
            'text-xs whitespace-nowrap z-50 shadow-lg'
          )}
          role="tooltip"
        >
          <div className="font-medium text-white mb-1">
            {getTransportDisplayName(transport || 'websocket')}
          </div>
          <div className="text-slate-400">
            Qualità: {getConfidenceDescription(confidence)}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1">
            <div className="border-8 border-transparent border-t-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
}

export default TransportStatusIndicator;
