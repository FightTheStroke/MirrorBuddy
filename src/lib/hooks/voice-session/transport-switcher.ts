// ============================================================================
// TRANSPORT SWITCHER
// WebRTC connection quality monitoring and re-evaluation
// ============================================================================

'use client';

import { clientLogger as logger } from '@/lib/logger/client';
import { probeTransports } from './transport-probe';
import { selectBestTransport, isTransportError } from './transport-selector';
import { invalidateCache, cacheProbeResults } from './transport-cache';
import { TransportMonitor } from './transport-monitor';
import { getTransportMonitor } from './transport-monitor-singleton';
import type { TransportSelection, DegradationEvent } from './transport-types';

/**
 * Transport Switcher - monitors WebRTC health and re-evaluates on degradation
 */
export class TransportSwitcher {
  private monitor: TransportMonitor;
  private isProbing = false;
  private lastProbeTime = 0;
  private minProbeIntervalMs = 30000; // Minimum 30s between probes
  private unsubscribeDegradation: (() => void) | null = null;

  constructor(monitor?: TransportMonitor) {
    this.monitor = monitor || getTransportMonitor();
  }

  /**
   * Start monitoring connection quality
   */
  start(): void {
    if (this.unsubscribeDegradation) {
      return; // Already started
    }

    this.unsubscribeDegradation = this.monitor.onDegradation(this.handleDegradation.bind(this));

    this.monitor.startNetworkListeners();

    logger.info('[TransportSwitcher] Started WebRTC monitoring');
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

    logger.info('[TransportSwitcher] Stopped monitoring');
  }

  /**
   * Get the monitor instance
   */
  getMonitor(): TransportMonitor {
    return this.monitor;
  }

  /**
   * Force a connection re-evaluation
   */
  async forceReEvaluate(): Promise<TransportSelection | null> {
    return this.evaluateConnection('network_change');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async handleDegradation(event: DegradationEvent): Promise<void> {
    // Don't probe too frequently
    const now = Date.now();
    if (now - this.lastProbeTime < this.minProbeIntervalMs) {
      logger.debug('[TransportSwitcher] Ignoring degradation, too soon since last probe');
      return;
    }

    // Don't probe if already probing
    if (this.isProbing) {
      logger.debug('[TransportSwitcher] Ignoring degradation, already probing');
      return;
    }

    logger.info('[TransportSwitcher] Handling degradation event', {
      reason: event.reason,
    });

    await this.evaluateConnection(event.reason);
  }

  private async evaluateConnection(
    reason: DegradationEvent['reason'],
  ): Promise<TransportSelection | null> {
    this.isProbing = true;

    try {
      // Invalidate cache to force fresh probe
      invalidateCache();

      // Run fresh probe
      logger.info('[TransportSwitcher] Running WebRTC probe...');
      const probeResults = await probeTransports();
      const selection = selectBestTransport(probeResults);

      if (isTransportError(selection)) {
        logger.error('[TransportSwitcher] WebRTC probe failed', {
          error: selection.webrtcError,
        });
        return null;
      }

      // Cache the result
      cacheProbeResults(probeResults, selection);
      this.lastProbeTime = Date.now();

      logger.info('[TransportSwitcher] WebRTC probe completed', {
        reason,
        confidence: selection.confidence,
        latencyMs: probeResults.webrtc.latencyMs,
      });

      return selection;
    } catch (error) {
      logger.error('[TransportSwitcher] Error during probe', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return null;
    } finally {
      this.isProbing = false;
    }
  }
}
