/**
 * @file message-bubble.test.tsx
 * @brief Tests for unified MessageBubble component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../message-bubble';
import type { ChatMessage } from '@/types';

const mockMaestro = {
  id: 'dante',
  displayName: 'Dante Alighieri',
  avatar: '/avatars/dante.webp',
  color: '#8B4513',
};

const mockMessage: ChatMessage = {
  id: 'msg-1',
  role: 'assistant',
  content: 'Hello, student!',
  timestamp: new Date('2026-02-15T10:00:00Z'),
};

const mockUserMessage: ChatMessage = {
  id: 'msg-2',
  role: 'user',
  content: 'Hi there!',
  timestamp: new Date('2026-02-15T10:01:00Z'),
};

describe('MessageBubble', () => {
  it('renders assistant message with avatar', () => {
    render(
      <MessageBubble
        message={mockMessage}
        characterType="maestro"
        characterAvatar={mockMaestro.avatar}
        characterColor={mockMaestro.color}
        characterName={mockMaestro.displayName}
      />,
    );

    expect(screen.getByText('Hello, student!')).toBeInTheDocument();
    expect(screen.getByAltText(mockMaestro.displayName)).toBeInTheDocument();
  });

  it('renders user message without avatar', () => {
    render(
      <MessageBubble
        message={mockUserMessage}
        characterType="maestro"
        characterColor={mockMaestro.color}
      />,
    );

    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('displays voice badge when isVoice is true', () => {
    const voiceMessage: ChatMessage = {
      ...mockUserMessage,
      isVoice: true,
    };

    render(
      <MessageBubble
        message={voiceMessage}
        characterType="maestro"
        characterColor={mockMaestro.color}
      />,
    );

    expect(screen.getByText(/trascrizioneVocale/i)).toBeInTheDocument();
  });

  it('shows TTS button when enabled for assistant messages', () => {
    const mockSpeak = vi.fn();

    render(
      <MessageBubble
        message={mockMessage}
        characterType="maestro"
        characterAvatar={mockMaestro.avatar}
        characterColor={mockMaestro.color}
        characterName={mockMaestro.displayName}
        ttsEnabled
        onSpeak={mockSpeak}
      />,
    );

    const ttsButton = screen.getByTitle(/leggiAdAltaVoce/i);
    expect(ttsButton).toBeInTheDocument();
  });

  it('does not show TTS button for user messages', () => {
    const mockSpeak = vi.fn();

    render(
      <MessageBubble
        message={mockUserMessage}
        characterType="maestro"
        characterColor={mockMaestro.color}
        ttsEnabled
        onSpeak={mockSpeak}
      />,
    );

    expect(screen.queryByTitle(/leggiAdAltaVoce/i)).not.toBeInTheDocument();
  });

  it('applies high contrast styles when enabled', () => {
    render(
      <MessageBubble
        message={mockUserMessage}
        characterType="maestro"
        characterColor={mockMaestro.color}
        highContrast
      />,
    );

    const bubble = screen.getByText('Hi there!').parentElement;
    expect(bubble).toHaveClass('bg-yellow-400', 'text-black');
  });

  it('applies dyslexia font styles when enabled', () => {
    render(
      <MessageBubble
        message={mockMessage}
        characterType="maestro"
        characterAvatar={mockMaestro.avatar}
        characterColor={mockMaestro.color}
        characterName={mockMaestro.displayName}
        dyslexiaFont
      />,
    );

    const bubble = screen.getByText('Hello, student!').parentElement;
    expect(bubble).toHaveClass('tracking-wide');
  });

  it('supports different character types (maestro, coach, buddy)', () => {
    const { rerender } = render(
      <MessageBubble
        message={mockMessage}
        characterType="maestro"
        characterAvatar={mockMaestro.avatar}
        characterColor={mockMaestro.color}
        characterName={mockMaestro.displayName}
      />,
    );

    expect(screen.getByText('Hello, student!')).toBeInTheDocument();

    rerender(
      <MessageBubble
        message={mockMessage}
        characterType="coach"
        characterAvatar="/avatars/coach.webp"
        characterColor="#4169E1"
        characterName="Coach"
      />,
    );

    expect(screen.getByAltText('Coach')).toBeInTheDocument();

    rerender(
      <MessageBubble
        message={mockMessage}
        characterType="buddy"
        characterAvatar="/avatars/buddy.webp"
        characterColor="#32CD32"
        characterName="Buddy"
      />,
    );

    expect(screen.getByAltText('Buddy')).toBeInTheDocument();
  });

  it('renders AI disclosure badge for assistant messages', () => {
    render(
      <MessageBubble
        message={mockMessage}
        characterType="maestro"
        characterAvatar={mockMaestro.avatar}
        characterColor={mockMaestro.color}
        characterName={mockMaestro.displayName}
        showAIDisclosure
      />,
    );

    expect(screen.getByRole('button', { name: /ai/i })).toBeInTheDocument();
  });

  it('shows copy button on hover', () => {
    const mockOnCopy = vi.fn();

    render(
      <MessageBubble
        message={mockMessage}
        characterType="maestro"
        characterAvatar={mockMaestro.avatar}
        characterColor={mockMaestro.color}
        characterName={mockMaestro.displayName}
        onCopy={mockOnCopy}
      />,
    );

    const copyButton = screen.getByTitle(/copiaMessaggio/i);
    expect(copyButton).toBeInTheDocument();
  });
});
