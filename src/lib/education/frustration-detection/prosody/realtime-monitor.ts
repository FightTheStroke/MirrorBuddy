/**
 * Real-time prosody monitor using Web Audio API
 * Runs client-side for low latency frustration detection
 */

import type { RealTimeProbe, ProsodyResult, EmotionalIndicators } from './types';
import { analyzeProsody, detectPitch, calculateRMS } from './analyzer';

export interface MonitorConfig {
  /** Buffer size for analysis (default: 4096) */
  bufferSize: number;
  /** How often to emit probes in ms (default: 100) */
  probeInterval: number;
  /** Sample rate (default: from audio context) */
  sampleRate?: number;
  /** Callback for real-time probes */
  onProbe?: (probe: RealTimeProbe) => void;
  /** Callback for full analysis results */
  onAnalysis?: (result: ProsodyResult) => void;
  /** Interval for full analysis in ms (default: 2000) */
  analysisInterval: number;
}

const DEFAULT_CONFIG: MonitorConfig = {
  bufferSize: 4096,
  probeInterval: 100,
  analysisInterval: 2000,
};

/**
 * Real-time prosody monitor
 * Connects to microphone and analyzes prosodic features
 */
export class ProsodyMonitor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private probeTimer: ReturnType<typeof setInterval> | null = null;
  private analysisTimer: ReturnType<typeof setInterval> | null = null;
  private config: MonitorConfig;
  private audioBuffer: Float32Array[] = [];
  private isRunning = false;

  // Rolling emotional state (EMA)
  private emotionalState: EmotionalIndicators = {
    frustration: 0,
    stress: 0,
    confusion: 0,
    engagement: 0.5,
    valence: 0,
  };

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start monitoring microphone input
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up Web Audio API
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.bufferSize * 2;

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      this.isRunning = true;

      // Start probe timer
      this.probeTimer = setInterval(() => this.emitProbe(), this.config.probeInterval);

      // Start analysis timer
      this.analysisTimer = setInterval(() => this.runAnalysis(), this.config.analysisInterval);
    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to start prosody monitor: ${error}`);
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.cleanup();
  }

  /**
   * Get current emotional state (EMA smoothed)
   */
  getEmotionalState(): EmotionalIndicators {
    return { ...this.emotionalState };
  }

  /**
   * Check if monitor is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  private emitProbe(): void {
    if (!this.analyser || !this.audioContext) return;

    const samples = new Float32Array(this.config.bufferSize);
    this.analyser.getFloatTimeDomainData(samples);

    // Store for later analysis
    this.audioBuffer.push(samples.slice());

    // Limit buffer size (keep last 10 seconds)
    const maxBuffers = Math.ceil((10 * this.audioContext.sampleRate) / this.config.bufferSize);
    if (this.audioBuffer.length > maxBuffers) {
      this.audioBuffer.shift();
    }

    // Calculate probe values
    const volume = calculateRMS(samples);
    const pitch = detectPitch(samples, this.audioContext.sampleRate);
    const voiceActive = volume > 0.01;

    const probe: RealTimeProbe = {
      volume,
      pitch,
      voiceActive,
      timestamp: Date.now(),
    };

    this.config.onProbe?.(probe);
  }

  private runAnalysis(): void {
    if (!this.audioContext || this.audioBuffer.length === 0) return;

    // Concatenate recent buffers
    const totalSamples = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    const combined = new Float32Array(totalSamples);

    let offset = 0;
    for (const buf of this.audioBuffer) {
      combined.set(buf, offset);
      offset += buf.length;
    }

    // Run full analysis
    const result = analyzeProsody(combined, {
      sampleRate: this.audioContext.sampleRate,
    });

    // Update emotional state with EMA
    const alpha = 0.3;
    this.emotionalState = {
      frustration: alpha * result.emotions.frustration + (1 - alpha) * this.emotionalState.frustration,
      stress: alpha * result.emotions.stress + (1 - alpha) * this.emotionalState.stress,
      confusion: alpha * result.emotions.confusion + (1 - alpha) * this.emotionalState.confusion,
      engagement: alpha * result.emotions.engagement + (1 - alpha) * this.emotionalState.engagement,
      valence: alpha * result.emotions.valence + (1 - alpha) * this.emotionalState.valence,
    };

    this.config.onAnalysis?.(result);

    // Clear old buffers, keep recent
    const keepBuffers = Math.ceil((2 * this.audioContext.sampleRate) / this.config.bufferSize);
    if (this.audioBuffer.length > keepBuffers) {
      this.audioBuffer = this.audioBuffer.slice(-keepBuffers);
    }
  }

  private cleanup(): void {
    if (this.probeTimer) {
      clearInterval(this.probeTimer);
      this.probeTimer = null;
    }

    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.audioBuffer = [];
    this.isRunning = false;
  }
}

// Singleton instance
let globalMonitor: ProsodyMonitor | null = null;

export function getGlobalProsodyMonitor(): ProsodyMonitor {
  if (!globalMonitor) {
    globalMonitor = new ProsodyMonitor();
  }
  return globalMonitor;
}

export function resetGlobalProsodyMonitor(): void {
  if (globalMonitor) {
    globalMonitor.stop();
    globalMonitor = null;
  }
}
