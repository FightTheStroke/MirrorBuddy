// ============================================================================
// AMBIENT AUDIO ENGINE
// Core audio engine managing Web Audio context, layers, and mixing
// ============================================================================

import { logger } from '@/lib/logger';
import type { AudioMode, AudioLayer } from '@/types';
import { createAudioNodeForMode } from './generators';

/**
 * Represents an active audio layer with its Web Audio nodes
 */
interface ActiveLayer {
  id: string;
  mode: AudioMode;
  gainNode: GainNode;
  sourceNode: AudioNode | null;
  oscillators?: OscillatorNode[]; // For binaural beats
  started: boolean;
}

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
      // Create audio context
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Create master gain node
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
      this.masterGainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);

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

    // Remove existing layer if present
    if (this.activeLayers.has(layer.id)) {
      this.removeLayer(layer.id);
    }

    logger.info('Adding audio layer', { layer });

    try {
      // Create gain node for this layer
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(layer.volume, this.audioContext.currentTime);
      gainNode.connect(this.masterGainNode);

      // Create audio source node based on mode
      const result = createAudioNodeForMode(this.audioContext, layer.mode);
      
      if (!result) {
        logger.warn('Audio mode not yet implemented', { mode: layer.mode });
        return;
      }

      let sourceNode: AudioNode;
      let oscillators: OscillatorNode[] | undefined;

      // Handle binaural beats (returns object with merger and oscillators)
      if ('merger' in result && 'oscillators' in result) {
        sourceNode = result.merger;
        oscillators = result.oscillators;
        result.merger.connect(gainNode);
      } else {
        // Regular audio nodes (noise generators)
        sourceNode = result;
        sourceNode.connect(gainNode);
      }

      const activeLayer: ActiveLayer = {
        id: layer.id,
        mode: layer.mode,
        gainNode,
        sourceNode,
        oscillators,
        started: false,
      };

      this.activeLayers.set(layer.id, activeLayer);

      // Start audio sources if enabled
      if (layer.enabled) {
        this.startLayer(layer.id);
      }
    } catch (error) {
      logger.error('Failed to add audio layer', { error, layer });
      throw error;
    }
  }

  /**
   * Start playback for a specific layer
   */
  private startLayer(layerId: string): void {
    const layer = this.activeLayers.get(layerId);
    if (!layer || layer.started) return;

    logger.info('Starting audio layer', { layerId });

    // Start oscillators for binaural beats
    if (layer.oscillators) {
      layer.oscillators.forEach((osc) => osc.start());
    }

    layer.started = true;
  }

  /**
   * Remove an audio layer
   */
  removeLayer(layerId: string): void {
    const layer = this.activeLayers.get(layerId);
    if (!layer) return;

    logger.info('Removing audio layer', { layerId });

    try {
      // Stop oscillators
      if (layer.oscillators) {
        layer.oscillators.forEach((osc) => {
          try {
            osc.stop();
          } catch {
            // Ignore if already stopped
          }
        });
      }

      // Disconnect nodes
      if (layer.sourceNode) {
        layer.sourceNode.disconnect();
      }
      layer.gainNode.disconnect();

      this.activeLayers.delete(layerId);
    } catch (error) {
      logger.error('Error removing audio layer', { error, layerId });
    }
  }

  /**
   * Update layer volume
   */
  setLayerVolume(layerId: string, volume: number): void {
    const layer = this.activeLayers.get(layerId);
    if (!layer || !this.audioContext) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    layer.gainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
    logger.debug('Layer volume updated', { layerId, volume: clampedVolume });
  }

  /**
   * Toggle layer on/off
   */
  toggleLayer(layerId: string, enabled: boolean): void {
    const layer = this.activeLayers.get(layerId);
    if (!layer) return;

    if (enabled && !layer.started) {
      this.startLayer(layerId);
    } else if (!enabled) {
      // Mute instead of stopping (smoother UX)
      this.setLayerVolume(layerId, 0);
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    if (!this.masterGainNode || !this.audioContext) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.originalMasterVolume = clampedVolume;
    
    if (!this.isDucked) {
      this.masterGainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
    }
    
    logger.debug('Master volume updated', { volume: clampedVolume });
  }

  /**
   * Duck audio (reduce volume temporarily, e.g., during voice/TTS)
   */
  duck(duckedVolume = 0.2): void {
    if (!this.masterGainNode || !this.audioContext) return;

    this.isDucked = true;
    const clampedVolume = Math.max(0, Math.min(1, duckedVolume));
    
    // Smooth volume reduction over 200ms
    this.masterGainNode.gain.linearRampToValueAtTime(
      clampedVolume,
      this.audioContext.currentTime + 0.2
    );
    
    logger.debug('Audio ducked', { duckedVolume: clampedVolume });
  }

  /**
   * Unduck audio (restore original volume)
   */
  unduck(): void {
    if (!this.masterGainNode || !this.audioContext) return;

    this.isDucked = false;
    
    // Smooth volume restoration over 200ms
    this.masterGainNode.gain.linearRampToValueAtTime(
      this.originalMasterVolume,
      this.audioContext.currentTime + 0.2
    );
    
    logger.debug('Audio unducked', { volume: this.originalMasterVolume });
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
  getState(): {
    isInitialized: boolean;
    contextState: string | null;
    activeLayerCount: number;
    isDucked: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      contextState: this.audioContext?.state || null,
      activeLayerCount: this.activeLayers.size,
      isDucked: this.isDucked,
    };
  }
}

// Singleton instance
let engineInstance: AmbientAudioEngine | null = null;

/**
 * Get the singleton audio engine instance
 */
export function getAudioEngine(): AmbientAudioEngine {
  if (!engineInstance) {
    engineInstance = new AmbientAudioEngine();
  }
  return engineInstance;
}
