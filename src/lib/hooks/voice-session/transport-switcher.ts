// ============================================================================
// TRANSPORT SWITCHER
// Auto-switch logic for transport degradation handling
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import { probeTransports } from './transport-probe';
import {
  selectBestTransport,
  isTransportError,
} from './transport-selector';
import { invalidateCache, cacheProbeResults } from './transport-cache';
import { TransportMonitor } from './transport-monitor';
import { getTransportMonitor } from './transport-monitor-singleton';
import type { TransportSelection, DegradationEvent } from './transport-types';

/**
 * Transport switch request event
 */
export interface TransportSwitchRequest {
  fromTransport: 'webrtc' | 'websocket';
  toTransport: 'webrtc' | 'websocket';
  reason: DegradationEvent['reason'];
  selection: TransportSelection;
}

/**
 * Callback for switch requests
 */
export type SwitchRequestCallback = (request: TransportSwitchRequest) => void;

// ============================================================================
// F-07: Auto-Switch Logic
// ============================================================================

/**
 * Transport Switcher that handles automatic transport switching on degradation
 *
 * F-07: Auto-switch transport if current one degrades (>3 failures or latency spike)
 */
export class TransportSwitcher {
  private monitor: TransportMonitor;
  private switchCallbacks: Set<SwitchRequestCallback> = new Set();
  private isProbing = false;
  private lastSwitchTime = 0;
  private minSwitchIntervalMs = 30000; // Minimum 30s between switches
  private unsubscribeDegradation: (() => void) | null = null;

  constructor(monitor?: TransportMonitor) {
    this.monitor = monitor || getTransportMonitor();
  }

  /**
   * Start monitoring and auto-switch
   */
  start(): void {
    if (this.unsubscribeDegradation) {
      return; // Already started
    }

    this.unsubscribeDegradation = this.monitor.onDegradation(
      this.handleDegradation.bind(this)
    );

    this.monitor.startNetworkListeners();

    logger.info('[TransportSwitcher] Started auto-switch monitoring');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.unsubscribeDegradation) {
      this.unsubscribeDegradation();
      this.unsubscribeDegradation = null;
    }

    this.monitor.stopNetworkListeners();

    logger.info('[TransportSwitcher] Stopped auto-switch monitoring');
  }

  /**
   * Subscribe to switch requests
   */
  onSwitchRequest(callback: SwitchRequestCallback): () => void {
    this.switchCallbacks.add(callback);
    return () => this.switchCallbacks.delete(callback);
  }

  /**
   * Get the monitor instance
   */
  getMonitor(): TransportMonitor {
    return this.monitor;
  }

  /**
   * Force a transport re-evaluation
   */
  async forceReEvaluate(): Promise<TransportSelection | null> {
    return this.evaluateAndSwitch('network_change');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.switchCallbacks.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async handleDegradation(event: DegradationEvent): Promise<void> {
    // Don't switch too frequently
    const now = Date.now();
    if (now - this.lastSwitchTime < this.minSwitchIntervalMs) {
      logger.debug('[TransportSwitcher] Ignoring degradation, too soon since last switch', {
        timeSinceLastSwitch: now - this.lastSwitchTime,
        minInterval: this.minSwitchIntervalMs,
      });
      return;
    }

    // Don't probe if already probing
    if (this.isProbing) {
      logger.debug('[TransportSwitcher] Ignoring degradation, already probing');
      return;
    }

    logger.info('[TransportSwitcher] Handling degradation event', {
      reason: event.reason,
      currentTransport: event.currentTransport,
    });

    await this.evaluateAndSwitch(event.reason);
  }

  private async evaluateAndSwitch(
    reason: DegradationEvent['reason']
  ): Promise<TransportSelection | null> {
    this.isProbing = true;

    try {
      // Invalidate cache to force fresh probe
      invalidateCache();

      // Run fresh probes
      logger.info('[TransportSwitcher] Running transport probes...');
      const probeResults = await probeTransports();
      const selection = selectBestTransport(probeResults);

      if (isTransportError(selection)) {
        logger.error('[TransportSwitcher] Both transports failed during re-evaluation', {
          webrtcError: selection.webrtcError,
          websocketError: selection.websocketError,
        });
        return null;
      }

      // Cache the new selection
      cacheProbeResults(probeResults, selection);

      const currentTransport = this.monitor.getTransport();

      // Check if we should switch
      if (selection.transport !== currentTransport) {
        logger.info('[TransportSwitcher] Transport switch recommended', {
          from: currentTransport,
          to: selection.transport,
          reason,
          confidence: selection.confidence,
        });

        // Emit switch request
        const request: TransportSwitchRequest = {
          fromTransport: currentTransport,
          toTransport: selection.transport,
          reason,
          selection,
        };

        this.emitSwitchRequest(request);
        this.lastSwitchTime = Date.now();

        // Update monitor transport
        this.monitor.setTransport(selection.transport);
      } else {
        logger.info('[TransportSwitcher] Current transport still optimal', {
          transport: currentTransport,
          confidence: selection.confidence,
        });
      }

      return selection;
    } catch (error) {
      logger.error('[TransportSwitcher] Error during transport evaluation', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return null;
    } finally {
      this.isProbing = false;
    }
  }

  private emitSwitchRequest(request: TransportSwitchRequest): void {
    this.switchCallbacks.forEach((callback) => {
      try {
        callback(request);
      } catch (error) {
        logger.error('[TransportSwitcher] Switch callback error', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    });
  }
}
