// ============================================================================
// TRANSPORT MONITOR
// Runtime monitoring of connection quality for adaptive transport switching
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import { invalidateCache } from './transport-selector';

/**
 * Connection quality metrics
 */
export interface ConnectionMetrics {
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  lastLatencyMs: number;
  avgLatencyMs: number;
  latencySpikes: number;
  lastUpdated: number;
}

/**
 * Transport degradation event
 */
export interface DegradationEvent {
  reason: 'failures' | 'latency_spike' | 'network_change';
  currentTransport: 'webrtc' | 'websocket';
  metrics: ConnectionMetrics;
  timestamp: number;
}

/**
 * Callback for degradation events
 */
export type DegradationCallback = (event: DegradationEvent) => void;

/**
 * Monitor configuration
 */
interface MonitorConfig {
  maxConsecutiveFailures: number;
  latencySpikeThresholdMs: number;
  latencySpikeMultiplier: number;
}

const DEFAULT_CONFIG: MonitorConfig = {
  maxConsecutiveFailures: 3,
  latencySpikeThresholdMs: 1000,
  latencySpikeMultiplier: 2.5,
};

// ============================================================================
// F-06: Connection Quality Monitoring
// ============================================================================

/**
 * Transport Monitor for tracking connection quality during active sessions
 *
 * F-06: Monitor connection quality during active session
 */
export class TransportMonitor {
  private currentTransport: 'webrtc' | 'websocket' = 'webrtc';
  private metrics: ConnectionMetrics;
  private config: MonitorConfig;
  private degradationCallbacks: Set<DegradationCallback> = new Set();
  private networkListenersBound = false;
  private latencyHistory: number[] = [];
  private maxHistorySize = 10;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = this.createInitialMetrics();
  }

  private createInitialMetrics(): ConnectionMetrics {
    return {
      consecutiveFailures: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      lastLatencyMs: 0,
      avgLatencyMs: 0,
      latencySpikes: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Set the current transport being monitored
   */
  setTransport(transport: 'webrtc' | 'websocket'): void {
    if (this.currentTransport !== transport) {
      logger.info('[TransportMonitor] Transport changed', {
        from: this.currentTransport,
        to: transport,
      });
      this.currentTransport = transport;
      this.reset();
    }
  }

  /**
   * Get current transport
   */
  getTransport(): 'webrtc' | 'websocket' {
    return this.currentTransport;
  }

  /**
   * Get current metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Record a successful operation with latency
   */
  recordSuccess(latencyMs: number): void {
    this.metrics.consecutiveFailures = 0;
    this.metrics.totalSuccesses++;
    this.metrics.lastLatencyMs = latencyMs;
    this.metrics.lastUpdated = Date.now();

    // Update latency history and average
    this.latencyHistory.push(latencyMs);
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory.shift();
    }
    this.metrics.avgLatencyMs = this.calculateAvgLatency();

    // Check for latency spike
    if (this.isLatencySpike(latencyMs)) {
      this.metrics.latencySpikes++;
      logger.warn('[TransportMonitor] Latency spike detected', {
        latencyMs,
        avgLatencyMs: this.metrics.avgLatencyMs,
        transport: this.currentTransport,
      });
      this.emitDegradation('latency_spike');
    }

    logger.debug('[TransportMonitor] Success recorded', {
      latencyMs,
      avgLatencyMs: this.metrics.avgLatencyMs.toFixed(0),
    });
  }

  /**
   * Record a failed operation
   */
  recordFailure(error?: string): void {
    this.metrics.consecutiveFailures++;
    this.metrics.totalFailures++;
    this.metrics.lastUpdated = Date.now();

    logger.warn('[TransportMonitor] Failure recorded', {
      consecutiveFailures: this.metrics.consecutiveFailures,
      totalFailures: this.metrics.totalFailures,
      error,
      transport: this.currentTransport,
    });

    // Check if we've exceeded the failure threshold
    if (this.metrics.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.emitDegradation('failures');
    }
  }

  /**
   * Check if connection is degraded
   */
  isDegraded(): boolean {
    return (
      this.metrics.consecutiveFailures >= this.config.maxConsecutiveFailures ||
      this.metrics.latencySpikes >= 3
    );
  }

  /**
   * Calculate success rate
   */
  getSuccessRate(): number {
    const total = this.metrics.totalSuccesses + this.metrics.totalFailures;
    if (total === 0) return 1;
    return this.metrics.totalSuccesses / total;
  }

  /**
   * Subscribe to degradation events
   */
  onDegradation(callback: DegradationCallback): () => void {
    this.degradationCallbacks.add(callback);
    return () => this.degradationCallbacks.delete(callback);
  }

  /**
   * Reset metrics (e.g., after transport switch)
   */
  reset(): void {
    this.metrics = this.createInitialMetrics();
    this.latencyHistory = [];
    logger.debug('[TransportMonitor] Metrics reset');
  }

  // ============================================================================
  // F-08: Network Change Detection
  // ============================================================================

  /**
   * Start listening for network change events
   *
   * F-08: Re-probe on network change events (online/offline)
   */
  startNetworkListeners(): void {
    if (this.networkListenersBound || typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.networkListenersBound = true;

    logger.debug('[TransportMonitor] Network listeners started');
  }

  /**
   * Stop listening for network change events
   */
  stopNetworkListeners(): void {
    if (!this.networkListenersBound || typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.networkListenersBound = false;

    logger.debug('[TransportMonitor] Network listeners stopped');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopNetworkListeners();
    this.degradationCallbacks.clear();
    this.reset();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private calculateAvgLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
    return sum / this.latencyHistory.length;
  }

  private isLatencySpike(latencyMs: number): boolean {
    // Need some history first
    if (this.latencyHistory.length < 3) return false;

    // Check if latency exceeds absolute threshold
    if (latencyMs > this.config.latencySpikeThresholdMs) return true;

    // Check if latency exceeds multiplier of average
    const avgWithoutCurrent = this.latencyHistory
      .slice(0, -1)
      .reduce((a, b) => a + b, 0) / (this.latencyHistory.length - 1);

    return latencyMs > avgWithoutCurrent * this.config.latencySpikeMultiplier;
  }

  private emitDegradation(reason: DegradationEvent['reason']): void {
    const event: DegradationEvent = {
      reason,
      currentTransport: this.currentTransport,
      metrics: this.getMetrics(),
      timestamp: Date.now(),
    };

    logger.warn('[TransportMonitor] Degradation detected', {
      reason,
      transport: this.currentTransport,
      consecutiveFailures: this.metrics.consecutiveFailures,
      latencySpikes: this.metrics.latencySpikes,
    });

    this.degradationCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        logger.error('[TransportMonitor] Degradation callback error', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    });
  }

  private handleOnline = (): void => {
    logger.info('[TransportMonitor] Network online detected');
    invalidateCache();
    this.emitDegradation('network_change');
  };

  private handleOffline = (): void => {
    logger.info('[TransportMonitor] Network offline detected');
    // Just log, don't emit degradation (nothing we can do while offline)
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let monitorInstance: TransportMonitor | null = null;

/**
 * Get the singleton TransportMonitor instance
 */
export function getTransportMonitor(): TransportMonitor {
  if (!monitorInstance) {
    monitorInstance = new TransportMonitor();
  }
  return monitorInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetTransportMonitor(): void {
  if (monitorInstance) {
    monitorInstance.destroy();
    monitorInstance = null;
  }
}
