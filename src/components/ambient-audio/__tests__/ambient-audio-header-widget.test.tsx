/**
 * Unit tests for AmbientAudioHeaderWidget component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getTranslation } from '@/test/i18n-helpers';
import { AmbientAudioHeaderWidget } from '../ambient-audio-header-widget';

// Mock the hooks
const mockPlay = vi.fn();
const mockPause = vi.fn();
const mockStop = vi.fn();
const mockApplyPreset = vi.fn();
const mockSetMasterVolume = vi.fn();

let mockVoiceConnected = false;
let mockPlaybackState = 'idle';

vi.mock('@/lib/hooks/use-ambient-audio', () => ({
  useAmbientAudio: () => ({
    playbackState: mockPlaybackState,
    masterVolume: 0.5,
    currentPreset: null,
    play: mockPlay,
    pause: mockPause,
    stop: mockStop,
    applyPreset: mockApplyPreset,
    setMasterVolume: mockSetMasterVolume,
  }),
}));

vi.mock('@/lib/stores', () => ({
  useVoiceSessionStore: (selector: (state: { isConnected: boolean }) => boolean) => {
    const state = { isConnected: mockVoiceConnected };
    return selector ? selector(state) : state;
  },
}));

describe('AmbientAudioHeaderWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVoiceConnected = false;
    mockPlaybackState = 'idle';
  });

  describe('Rendering', () => {
    it('renders the widget button', () => {
      render(<AmbientAudioHeaderWidget />);
      expect(screen.getByTitle('Audio Ambientale')).toBeInTheDocument();
    });

    it('renders headphones icon', () => {
      render(<AmbientAudioHeaderWidget />);
      const button = screen.getByTitle('Audio Ambientale');
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Dropdown', () => {
    it('opens dropdown on click', () => {
      render(<AmbientAudioHeaderWidget />);
      fireEvent.click(screen.getByTitle('Audio Ambientale'));
      // The heading "Audio Ambientale" appears in the dropdown
      const headings = screen.getAllByText('Audio Ambientale');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('shows quick presets in dropdown', () => {
      render(<AmbientAudioHeaderWidget />);
      fireEvent.click(screen.getByTitle('Audio Ambientale'));
      expect(screen.getByText('Focus')).toBeInTheDocument();
      expect(screen.getByText('Deep Work')).toBeInTheDocument();
    });

    it('shows volume percentage in dropdown', () => {
      render(<AmbientAudioHeaderWidget />);
      fireEvent.click(screen.getByTitle('Audio Ambientale'));
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows settings link in dropdown', () => {
      render(<AmbientAudioHeaderWidget />);
      fireEvent.click(screen.getByTitle('Audio Ambientale'));
      expect(
        screen.getByText(getTranslation('settings.ambientAudio.advancedSettings')),
      ).toBeInTheDocument();
    });
  });

  describe('Preset Selection', () => {
    it('calls applyPreset when preset is clicked', () => {
      render(<AmbientAudioHeaderWidget />);
      fireEvent.click(screen.getByTitle('Audio Ambientale'));
      fireEvent.click(screen.getByText('Focus'));
      expect(mockApplyPreset).toHaveBeenCalledWith('focus');
    });

    it('calls play after selecting preset', () => {
      render(<AmbientAudioHeaderWidget />);
      fireEvent.click(screen.getByTitle('Audio Ambientale'));
      fireEvent.click(screen.getByText('Focus'));
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  describe('Voice Session Integration', () => {
    it('shows disabled state when voice session is active', () => {
      mockVoiceConnected = true;
      render(<AmbientAudioHeaderWidget />);
      expect(screen.getByText('In pausa')).toBeInTheDocument();
    });

    it('hides main button when voice session is active', () => {
      mockVoiceConnected = true;
      render(<AmbientAudioHeaderWidget />);
      expect(screen.queryByTitle('Audio Ambientale')).not.toBeInTheDocument();
    });
  });

  describe('Playback State', () => {
    it('shows playing indicator when playing', () => {
      mockPlaybackState = 'playing';
      render(<AmbientAudioHeaderWidget />);
      const button = screen.getByTitle('Audio Ambientale');
      expect(button.className).toContain('text-purple-500');
    });
  });

  describe('Accessibility', () => {
    it('has accessible title', () => {
      render(<AmbientAudioHeaderWidget />);
      expect(screen.getByTitle('Audio Ambientale')).toBeInTheDocument();
    });

    it('button is focusable', () => {
      render(<AmbientAudioHeaderWidget />);
      const button = screen.getByTitle('Audio Ambientale');
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });
});
