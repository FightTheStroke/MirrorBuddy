import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { UnifiedChatHeader } from '../unified-chat-header';
import type { UnifiedChatHeaderProps } from '../unified-chat-header';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- test mock for next/image
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

describe('UnifiedChatHeader', () => {
  const mockCharacter = {
    id: 'archimede',
    name: 'Archimede',
    type: 'maestro' as const,
    avatar: '/avatars/archimede.webp',
    color: '#3b82f6',
    specialty: 'Matematica e Fisica',
  };

  const defaultProps: UnifiedChatHeaderProps = {
    character: mockCharacter,
    voiceState: {
      isActive: false,
      isConnected: false,
      configError: null,
    },
    ttsEnabled: false,
    actions: {
      onClose: vi.fn(),
      onClearChat: vi.fn(),
      onVoiceCall: vi.fn(),
      onStopTTS: vi.fn(),
    },
    highContrast: false,
    dyslexiaFont: false,
  };

  it('renders character name and specialty', () => {
    render(<UnifiedChatHeader {...defaultProps} />);
    expect(screen.getByText('Archimede')).toBeInTheDocument();
    expect(screen.getByText('Matematica e Fisica')).toBeInTheDocument();
  });

  it('renders character avatar with correct styles', () => {
    render(<UnifiedChatHeader {...defaultProps} />);
    const avatar = screen.getByAltText('Archimede');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', '/avatars/archimede.webp');
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<UnifiedChatHeader {...defaultProps} />);
    const closeButton = screen.getByLabelText(/close/i);
    await user.click(closeButton);
    expect(defaultProps.actions.onClose).toHaveBeenCalledOnce();
  });

  it('calls onClearChat when clear chat button is clicked', async () => {
    const user = userEvent.setup();
    render(<UnifiedChatHeader {...defaultProps} />);
    const clearButton = screen.getByLabelText(/newConversation|clear/i);
    await user.click(clearButton);
    expect(defaultProps.actions.onClearChat).toHaveBeenCalledOnce();
  });

  it('shows TTS enabled icon when ttsEnabled is true', () => {
    render(<UnifiedChatHeader {...defaultProps} ttsEnabled={true} />);
    expect(screen.getByLabelText(/ttsActive|volume/i)).toBeInTheDocument();
  });

  it('shows TTS disabled icon when ttsEnabled is false', () => {
    render(<UnifiedChatHeader {...defaultProps} ttsEnabled={false} />);
    expect(screen.getByLabelText(/ttsInactive|mute/i)).toBeInTheDocument();
  });

  it('shows voice call button when voice is not active', () => {
    render(<UnifiedChatHeader {...defaultProps} />);
    expect(screen.getByLabelText(/voice|call/i)).toBeInTheDocument();
  });

  it('hides voice call button when voice is active', () => {
    render(
      <UnifiedChatHeader
        {...defaultProps}
        voiceState={{ isActive: true, isConnected: true, configError: null }}
      />,
    );
    expect(screen.queryByLabelText(/startVoiceCall/i)).not.toBeInTheDocument();
  });

  it('disables voice call button when configError is present', () => {
    render(
      <UnifiedChatHeader
        {...defaultProps}
        voiceState={{ isActive: false, isConnected: false, configError: 'Voice not configured' }}
      />,
    );
    const voiceButton = screen.getByLabelText(/voiceUnavailable|voice/i);
    expect(voiceButton).toBeDisabled();
  });

  it('calls onVoiceCall when voice button is clicked', async () => {
    const user = userEvent.setup();
    render(<UnifiedChatHeader {...defaultProps} />);
    const voiceButton = screen.getByLabelText(/voice|call/i);
    await user.click(voiceButton);
    expect(defaultProps.actions.onVoiceCall).toHaveBeenCalledOnce();
  });

  it('shows back button when onGoBack is provided', () => {
    const props = {
      ...defaultProps,
      actions: { ...defaultProps.actions, onGoBack: vi.fn() },
    };
    render(<UnifiedChatHeader {...props} />);
    expect(screen.getByLabelText(/back/i)).toBeInTheDocument();
  });

  it('calls onGoBack when back button is clicked', async () => {
    const user = userEvent.setup();
    const onGoBack = vi.fn();
    const props = {
      ...defaultProps,
      actions: { ...defaultProps.actions, onGoBack },
    };
    render(<UnifiedChatHeader {...props} />);
    const backButton = screen.getByLabelText(/back/i);
    await user.click(backButton);
    expect(onGoBack).toHaveBeenCalledOnce();
  });

  it('applies high contrast styles when highContrast is true', () => {
    const { container } = render(<UnifiedChatHeader {...defaultProps} highContrast={true} />);
    const header = container.querySelector('header');
    expect(header).toHaveClass('border-yellow-400', 'bg-black');
  });

  it('applies dyslexia font when dyslexiaFont is true', () => {
    render(<UnifiedChatHeader {...defaultProps} dyslexiaFont={true} />);
    const name = screen.getByText('Archimede');
    expect(name).toHaveClass('tracking-wide');
  });

  it('shows character switcher buttons when onSwitchToCoach and onSwitchToBuddy are provided', () => {
    const props = {
      ...defaultProps,
      actions: {
        ...defaultProps.actions,
        onSwitchToCoach: vi.fn(),
        onSwitchToBuddy: vi.fn(),
      },
    };
    render(<UnifiedChatHeader {...props} />);
    expect(screen.getByLabelText(/switchToCoach/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/switchToBuddy/i)).toBeInTheDocument();
  });

  it('disables coach button when current character is coach', () => {
    const coachCharacter = { ...mockCharacter, type: 'coach' as const };
    const props = {
      ...defaultProps,
      character: coachCharacter,
      actions: {
        ...defaultProps.actions,
        onSwitchToCoach: vi.fn(),
        onSwitchToBuddy: vi.fn(),
      },
    };
    render(<UnifiedChatHeader {...props} />);
    const coachButton = screen.getByLabelText(/switchToCoach/i);
    expect(coachButton).toBeDisabled();
  });

  it('disables buddy button when current character is buddy', () => {
    const buddyCharacter = { ...mockCharacter, type: 'buddy' as const };
    const props = {
      ...defaultProps,
      character: buddyCharacter,
      actions: {
        ...defaultProps.actions,
        onSwitchToCoach: vi.fn(),
        onSwitchToBuddy: vi.fn(),
      },
    };
    render(<UnifiedChatHeader {...props} />);
    const buddyButton = screen.getByLabelText(/switchToBuddy/i);
    expect(buddyButton).toBeDisabled();
  });

  it('shows character type badge', () => {
    render(<UnifiedChatHeader {...defaultProps} />);
    // The badge should be rendered based on character type
    expect(screen.getByText(/Professore|Coach|Amico/i)).toBeInTheDocument();
  });

  it('applies character color to header background', () => {
    const { container } = render(<UnifiedChatHeader {...defaultProps} />);
    const header = container.querySelector('header');
    expect(header).toHaveStyle({ backgroundColor: expect.stringContaining('#3b82f6') });
  });
});
