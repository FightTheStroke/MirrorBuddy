/**
 * MB-360 W1-T1 — mobile Maestro chat accessibility regressions.
 *
 * Reproduced in a real browser at 320/375/390 CSS px against the running app
 * (`/it/maestri/noether`), before this fix:
 *
 * - `SharedChatLayout`'s main column resolved its flex `min-width: auto` to its
 *   435.81px min-content size inside a 375px `overflow: hidden` parent, so the
 *   send button sat at right 427.81px and the close button at right 423.81px —
 *   both outside the viewport, while `document.scrollWidth` still read 375px.
 * - axe `button-name` on the send control (`.bg-primary`), which had no name.
 * - axe `color-contrast` 2.95:1 on the user-bubble timestamp (`#cbbce7` on
 *   `#7e57c2`), from `text-xs opacity-60` white ink.
 *
 * jsdom cannot prove layout or rendered contrast. These tests lock the
 * structural contracts that caused the rendered defects (flex min-width escape
 * hatch, translated accessible name, opaque bubble ink whose ratio is computed
 * from the actual rendered colour values). Rendered geometry, axe and real
 * contrast are covered by `e2e/a11y-maestro-chat-mobile.spec.ts`.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { ChatMessage, Maestro } from '@/types';
import itChat from '../../../../messages/it/chat.json';
import { MaestroSessionInput } from '../maestro-session-input';
import { MessageBubble } from '../message-bubble';
import { SharedChatLayout } from '@/components/chat/shared-chat-layout';

type Dictionary = Record<string, unknown>;

const chatMessages = (itChat as Dictionary).chat as Dictionary;

function translate(key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Dictionary | undefined)?.[part], chatMessages);
  if (typeof value !== 'string') throw new Error(`Missing it/chat.json key: ${key}`);
  return value;
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => translate(key),
  useLocale: () => 'it',
}));

const maestro: Maestro = {
  id: 'noether',
  name: 'Emmy Noether',
  displayName: 'Prof.ssa Emmy',
  subject: 'matematica' as Maestro['subject'],
  specialty: 'Algebra astratta',
  voice: 'shimmer' as Maestro['voice'],
  voiceInstructions: '',
  teachingStyle: '',
  avatar: '/maestri/noether.png',
  color: '#7E57C2',
  systemPrompt: '',
  greeting: 'Ciao!',
  tools: [],
};

const inputProps = {
  maestro,
  input: 'Ciao Emmy',
  isLoading: false,
  sessionEnded: false,
  isVoiceActive: false,
  showEndSession: false,
  inputRef: createRef<HTMLTextAreaElement>(),
  onInputChange: vi.fn(),
  onKeyDown: vi.fn(),
  onSubmit: vi.fn(),
  onRequestTool: vi.fn(),
  onRequestPhoto: vi.fn(),
  onEndSession: vi.fn(),
};

function userMessage(): ChatMessage {
  return {
    id: 'm1',
    role: 'user',
    content: 'Mi aiuti con le equazioni?',
    timestamp: new Date('2026-09-05T19:12:00.000Z'),
  };
}

/** WCAG 2.1 relative-luminance ratio over two opaque sRGB colours. */
function contrastRatio(foreground: string, background: string): number {
  const luminance = (color: string) => {
    const hex = color.replace('#', '');
    const expanded = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
    const [r, g, b] = [0, 2, 4]
      .map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255)
      .map((channel) =>
        channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
      );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function toHex(cssColor: string): string {
  if (cssColor.startsWith('#')) return cssColor.toLowerCase();
  const parts = cssColor.match(/\d+/g);
  if (!parts) throw new Error(`Unsupported colour: ${cssColor}`);
  return `#${parts
    .slice(0, 3)
    .map((part) => Number(part).toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('Maestro chat send control', () => {
  it('exposes the translated accessible name axe reported as missing', () => {
    render(<MaestroSessionInput {...inputProps} />);

    const send = screen.getByRole('button', { name: translate('input.sendMessage') });

    expect(send).toBeInTheDocument();
  });

  it('keeps the send target operable and not shrunk below the previous size', () => {
    render(<MaestroSessionInput {...inputProps} />);

    const send = screen.getByRole('button', { name: translate('input.sendMessage') });

    expect(send).toBeEnabled();
    expect(send.className).toContain('flex-shrink-0');
    expect(send.className).toContain('h-9');
  });

  it('lets the message field shrink inside a narrow flex row instead of forcing overflow', () => {
    render(<MaestroSessionInput {...inputProps} />);

    const field = screen.getByRole('textbox');

    expect(field.className).toContain('min-w-0');
  });
});

describe('Maestro chat message bubble contrast', () => {
  it('paints the user timestamp with opaque ink reaching AA on the Maestro colour', () => {
    const { container } = render(
      <MessageBubble
        message={userMessage()}
        maestro={maestro}
        ttsEnabled={false}
        speak={vi.fn()}
      />,
    );

    const bubble = container.querySelector<HTMLElement>('.rounded-br-md');
    const timestamp = screen.getByText(/^\d{1,2}:\d{2}$/);

    expect(bubble).not.toBeNull();
    expect(timestamp.className).not.toContain('opacity-');
    expect(
      contrastRatio(toHex(bubble!.style.color), toHex(bubble!.style.backgroundColor)),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('stays readable on a light Maestro colour, where white ink failed', () => {
    const { container } = render(
      <MessageBubble
        message={userMessage()}
        maestro={{ ...maestro, color: '#E8B64C' }}
        ttsEnabled={false}
        speak={vi.fn()}
      />,
    );

    const bubble = container.querySelector<HTMLElement>('.rounded-br-md');

    expect(
      contrastRatio(toHex(bubble!.style.color), toHex(bubble!.style.backgroundColor)),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves the assistant bubble palette untouched', () => {
    const { container } = render(
      <MessageBubble
        message={{ ...userMessage(), id: 'm2', role: 'assistant' }}
        maestro={maestro}
        ttsEnabled={false}
        speak={vi.fn()}
      />,
    );

    const bubble = container.querySelector<HTMLElement>('.rounded-bl-md');

    expect(bubble!.className).toContain('bg-white');
    expect(bubble!.style.color).toBe('');
  });
});

describe('Shared chat layout width containment', () => {
  it('gives the main column a flex minimum-width escape hatch', () => {
    const { container } = render(
      <SharedChatLayout header={<div>header</div>} footer={<div>footer</div>}>
        <p>messages</p>
      </SharedChatLayout>,
    );

    const column = container.querySelector('main[role="main"]')?.parentElement;

    expect(column?.className).toContain('min-w-0');
  });
});
