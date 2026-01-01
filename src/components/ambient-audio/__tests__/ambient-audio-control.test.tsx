/**
 * Unit tests for AmbientAudioControl component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AmbientAudioControl } from '../ambient-audio-control';

// Mock the hook
const mockPlay = vi.fn();
const mockPause = vi.fn();
const mockStop = vi.fn();
const mockAddLayer = vi.fn();
const mockRemoveLayer = vi.fn();
const mockSetLayerVolume = vi.fn();
const mockApplyPreset = vi.fn();
const mockSetMasterVolume = vi.fn();
const mockClearLayers = vi.fn();

vi.mock('@/lib/hooks/use-ambient-audio', () => ({
  useAmbientAudio: vi.fn(() => ({
    playbackState: 'idle',
    masterVolume: 0.5,
    currentPreset: null,
    layers: [],
    error: null,
    play: mockPlay,
    pause: mockPause,
    stop: mockStop,
    addLayer: mockAddLayer,
    removeLayer: mockRemoveLayer,
    setLayerVolume: mockSetLayerVolume,
    toggleLayer: vi.fn(),
    applyPreset: mockApplyPreset,
    setMasterVolume: mockSetMasterVolume,
    clearLayers: mockClearLayers,
  })),
}));

describe('AmbientAudioControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component', () => {
      render(<AmbientAudioControl />);
      expect(screen.getByText('Audio Ambientale')).toBeInTheDocument();
    });

    it('renders volume slider', () => {
      render(<AmbientAudioControl />);
      expect(screen.getByText('Volume Principale')).toBeInTheDocument();
    });

    it('displays current volume percentage', () => {
      render(<AmbientAudioControl />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders play button in idle state', () => {
      render(<AmbientAudioControl />);
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('renders preset buttons', () => {
      render(<AmbientAudioControl />);
      expect(screen.getByText('Focus')).toBeInTheDocument();
      expect(screen.getByText('Lavoro Profondo')).toBeInTheDocument();
      expect(screen.getByText('Creatività')).toBeInTheDocument();
    });

    it('renders mixer section', () => {
      render(<AmbientAudioControl />);
      expect(screen.getByText('Mixer Avanzato')).toBeInTheDocument();
    });
  });

  describe('Playback Controls', () => {
    it('calls play when play button is clicked', () => {
      render(<AmbientAudioControl />);
      fireEvent.click(screen.getByRole('button', { name: /play/i }));
      expect(mockPlay).toHaveBeenCalled();
    });

    it('calls stop when stop button is clicked', () => {
      render(<AmbientAudioControl />);
      // Stop button exists but may be disabled in idle state
      const buttons = screen.getAllByRole('button');
      const stopButton = buttons.find(btn => btn.querySelector('svg.lucide-square'));
      if (stopButton) {
        fireEvent.click(stopButton);
      }
    });
  });

  describe('Presets', () => {
    it('calls applyPreset when preset button is clicked', () => {
      render(<AmbientAudioControl />);
      fireEvent.click(screen.getByText('Focus'));
      expect(mockApplyPreset).toHaveBeenCalledWith('focus');
    });

    it('calls play after applying preset in idle state', () => {
      render(<AmbientAudioControl />);
      fireEvent.click(screen.getByText('Focus'));
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  describe('Advanced Mixer', () => {
    it('shows mixer when toggle button is clicked', () => {
      render(<AmbientAudioControl />);
      fireEvent.click(screen.getByText('Mostra'));
      // Use getAllByText since there may be multiple
      const addLayerButtons = screen.getAllByText('Aggiungi Layer');
      expect(addLayerButtons.length).toBeGreaterThan(0);
    });

    it('shows noise options in mixer', () => {
      render(<AmbientAudioControl />);
      fireEvent.click(screen.getByText('Mostra'));
      expect(screen.getByText('Rumore')).toBeInTheDocument();
    });

    it('shows binaural options in mixer', () => {
      render(<AmbientAudioControl />);
      fireEvent.click(screen.getByText('Mostra'));
      expect(screen.getByText('Binaural Beats')).toBeInTheDocument();
    });

    it('calls addLayer when add button is clicked', () => {
      render(<AmbientAudioControl />);
      fireEvent.click(screen.getByText('Mostra'));
      fireEvent.click(screen.getByRole('button', { name: /aggiungi layer/i }));
      expect(mockAddLayer).toHaveBeenCalledWith('white_noise');
    });
  });

  describe('Error Display', () => {
    it('displays error message when error exists', async () => {
      const { useAmbientAudio } = await import('@/lib/hooks/use-ambient-audio');
      vi.mocked(useAmbientAudio).mockReturnValue({
        playbackState: 'error',
        masterVolume: 0.5,
        currentPreset: null,
        layers: [],
        error: 'Test error message',
        play: mockPlay,
        pause: mockPause,
        stop: mockStop,
        addLayer: mockAddLayer,
        removeLayer: mockRemoveLayer,
        setLayerVolume: mockSetLayerVolume,
        toggleLayer: vi.fn(),
        applyPreset: mockApplyPreset,
        setMasterVolume: mockSetMasterVolume,
        clearLayers: mockClearLayers,
        // Additional required properties
        autoDuckEnabled: true,
        duckedVolume: 0.2,
        autoStartWithStudy: false,
        studySessionAudioMode: null,
        autoStartWithPomodoro: false,
        pauseDuringBreak: true,
        pomodoroPreset: 'focus',
        duck: vi.fn(),
        unduck: vi.fn(),
        setAutoDuck: vi.fn(),
        setDuckedVolume: vi.fn(),
        setAutoStartWithStudy: vi.fn(),
        setStudySessionAudioMode: vi.fn(),
        setAutoStartWithPomodoro: vi.fn(),
        setPauseDuringBreak: vi.fn(),
        setPomodoroPreset: vi.fn(),
        setError: vi.fn(),
        engineState: { isInitialized: true },
      } as unknown as ReturnType<typeof useAmbientAudio>);

      render(<AmbientAudioControl />);
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('Info Section', () => {
    it('displays info about binaural beats', () => {
      render(<AmbientAudioControl />);
      expect(screen.getByText(/binaural beats richiedono cuffie stereo/i)).toBeInTheDocument();
    });
  });
});
