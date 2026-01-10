// ============================================================================
// AMBIENT AUDIO ENGINE
// Core audio engine managing Web Audio context, layers, and mixing
// ============================================================================

import { logger } from '@/lib/logger';
import type { AudioLayer } from '@/types';
import type { ActiveLayer } from './types';
import {
  createAudioLayer,
  startAudioLayer,
  stopAudioLayer,
} from './engine-layer-ops';
import {
  clampVolume,
  setGainValue,
  applyDucking,
  removeDucking,
} from './engine-volume-ops';

/**
 * Ambient Audio Engine
 * Manages Web Audio API context, procedural audio generation, and mixing
 */
export class AmbientAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private activeLayers: Map<string, ActiveLayer> = new Map();
  private isInitialized = false;
  private isDucked = false;
  private originalMasterVolume = 1.0;

  /**
   * Initialize the audio engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Audio engine already initialized');
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext: typeof AudioContext;
        }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      this.masterGainNode.gain.setValueAtTime(
        1.0,
        this.audioContext.currentTime
      );
      this.isInitialized = true;
      logger.info('Ambient audio engine initialized', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state,
      });
    } catch (error) {
      logger.error('Failed to initialize audio engine', { error });
      throw new Error('Failed to initialize audio engine');
    }
  }

  /**
   * Resume audio context (required for user interaction)
   */
  async resume(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      logger.info('Audio context resumed');
    }
  }

  /**
   * Add or update an audio layer
   */
  async addLayer(layer: AudioLayer): Promise<void> {
    if (!this.audioContext || !this.masterGainNode) {
      throw new Error('Audio engine not initialized');
    }

    await this.resume();

    if (this.activeLayers.has(layer.id)) {
      this.removeLayer(layer.id);
    }

    logger.info('Adding audio layer', { layer });

    try {
      const activeLayer = createAudioLayer(
        this.audioContext,
        this.masterGainNode,
        layer
      );
      this.activeLayers.set(layer.id, activeLayer);

      if (layer.enabled) {
        startAudioLayer(activeLayer);
      }
    } catch (error) {
      logger.error('Failed to add audio layer', { error, layer });
      throw error;
    }
  }

  /**
   * Remove an audio layer
   */
  removeLayer(layerId: string): void {
    const layer = this.activeLayers.get(layerId);
    if (!layer) return;

    stopAudioLayer(layer);
    this.activeLayers.delete(layerId);
  }

  /**
   * Update layer volume
   */
  setLayerVolume(layerId: string, volume: number): void {
    const layer = this.activeLayers.get(layerId);
    if (!layer || !this.audioContext) return;

    setGainValue(layer.gainNode, volume, this.audioContext);
    logger.debug('Layer volume updated', { layerId, volume });
  }

  /**
   * Toggle layer on/off
   */
  toggleLayer(layerId: string, enabled: boolean): void {
    const layer = this.activeLayers.get(layerId);
    if (!layer) return;

    if (enabled && !layer.started) {
      startAudioLayer(layer);
    } else if (!enabled) {
      this.setLayerVolume(layerId, 0);
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    if (!this.masterGainNode || !this.audioContext) return;

    const clampedVolume = clampVolume(volume);
    this.originalMasterVolume = clampedVolume;

    if (!this.isDucked) {
      setGainValue(this.masterGainNode, clampedVolume, this.audioContext);
    }

    logger.debug('Master volume updated', { volume: clampedVolume });
  }

  /**
   * Duck audio (reduce volume temporarily, e.g., during voice/TTS)
   */
  duck(duckedVolume = 0.2): void {
    if (!this.masterGainNode || !this.audioContext) return;

    this.isDucked = true;
    applyDucking(this.masterGainNode, this.audioContext, duckedVolume);
  }

  /**
   * Unduck audio (restore original volume)
   */
  unduck(): void {
    if (!this.masterGainNode || !this.audioContext) return;

    this.isDucked = false;
    removeDucking(
      this.masterGainNode,
      this.audioContext,
      this.originalMasterVolume
    );
  }

  /**
   * Stop all layers and cleanup
   */
  stopAll(): void {
    logger.info('Stopping all audio layers');
    const layerIds = Array.from(this.activeLayers.keys());
    layerIds.forEach((id) => this.removeLayer(id));
  }

  /**
   * Cleanup and destroy the audio engine
   */
  async destroy(): Promise<void> {
    logger.info('Destroying audio engine');
    this.stopAll();

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.masterGainNode = null;
    this.isInitialized = false;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      contextState: this.audioContext?.state || null,
      activeLayerCount: this.activeLayers.size,
      isDucked: this.isDucked,
    };
  }
}
