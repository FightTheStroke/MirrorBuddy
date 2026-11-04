/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import itChat from '../../../../../messages/it/chat.json';
import enChat from '../../../../../messages/en/chat.json';
import { MaestroSessionInput } from '../../maestro-session-input';
import { MaestroSessionToolButtons } from '../../maestro-session-tool-buttons';
import { AttachmentChips } from '../attachment-chips';
import type { AttachmentItem } from '../use-conversation-attachments';

type Dict = Record<string, unknown>;
let dictionary: Dict = (itChat as Dict).chat as Dict;

function translate(key: string, params?: Record<string, string | number>): string {
  {
    const value = key
      .split('.')
      .reduce<unknown>((node, part) => (node as Dict | undefined)?.[part], dictionary);
    if (typeof value !== 'string') throw new Error(`Missing key: ${key}`);
    return value
      .replace(/\{(\w+), plural, one \{([^}]*)\} other \{([^}]*)\}\}/g, (_m, name, one, other) =>
        Number(params?.[name]) === 1 ? one : other,
      )
      .replace(/#/g, String(params?.count ?? ''))
      .replace(/\{(\w+)\}/g, (_m, name) => String(params?.[name] ?? ''));
  }
}

vi.mock('next-intl', () => ({
  useLocale: () => 'it',
  useTranslations: () => translate,
}));

const attachments = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    items: [],
    readyDocs: [],
    busy: false,
    announcement: null,
    consentOpen: false,
    pickFiles: vi.fn(),
    confirmConsent: vi.fn(),
    declineConsent: vi.fn(),
    cancel: vi.fn(),
    retry: vi.fn(),
    remove: vi.fn().mockResolvedValue(true),
    restore: vi.fn(),
    reset: vi.fn(),
    ...over,
  }) as never;

function renderInput(a = attachments()) {
  const inputRef = createRef<HTMLTextAreaElement>();
  render(
    <MaestroSessionInput
      maestro={
        { id: 'manzoni', displayName: 'Manzoni', color: '#336699', tools: ['quiz'] } as never
      }
      input="ciao"
      isLoading={false}
      sessionEnded={false}
      isVoiceActive={false}
      showEndSession={false}
      inputRef={inputRef}
      onInputChange={vi.fn()}
      onKeyDown={vi.fn()}
      onSubmit={vi.fn()}
      onRequestTool={vi.fn()}
      onRequestPhoto={vi.fn()}
      onEndSession={vi.fn()}
      attachments={a}
    />,
  );
  return { inputRef, a };
}

describe('paperclip in the Maestro input row', () => {
  it('is a 44px keyboard button, states supported types, and hands files to the hook', () => {
    const a = attachments();
    const { inputRef } = renderInput(a);
    const button = screen.getByRole('button', { name: 'Allega un file' });
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('w-11');
    expect(screen.getByText(/PDF, JPEG, PNG o WebP/)).toBeVisible();

    const input = screen.getByTestId('attachment-file-input') as HTMLInputElement;
    expect(input.accept).toBe('application/pdf,image/jpeg,image/png,image/webp');
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    expect((a as { pickFiles: ReturnType<typeof vi.fn> }).pickFiles).toHaveBeenCalledWith([file]);
    expect(document.activeElement).toBe(inputRef.current);
  });

  it('blocks sending while a file is still being prepared', () => {
    renderInput(attachments({ busy: true }));
    expect(screen.getByRole('button', { name: translate('input.sendMessage') })).toBeDisabled();
  });

  it('keeps the consent dialog out of the DOM until a file is picked', () => {
    renderInput();
    expect(screen.queryByRole('dialog')).toBeNull();
    renderInput(attachments({ consentOpen: true }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Usare questo file nella chat?');
    expect(screen.getByRole('button', { name: 'Usa in chat' })).toBeInTheDocument();
  });
});

describe('toolbar labels come from next-intl', () => {
  it('renders English labels with no Italian', () => {
    dictionary = (enChat as Dict).chat as Dict;
    render(
      <MaestroSessionToolButtons
        isLoading={false}
        sessionEnded={false}
        onRequestTool={vi.fn()}
        onRequestPhoto={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Create a diagram' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Scatta foto' })).toBeNull();
    dictionary = (itChat as Dict).chat as Dict;
  });
});

describe('AttachmentChips', () => {
  const item = (over: Partial<AttachmentItem>): AttachmentItem => ({
    localId: 'a',
    name: 'verifica.pdf',
    status: 'ready',
    done: 1,
    total: 1,
    skippedPages: [],
    remote: true,
    ...over,
  });

  it('shows partial coverage, errors, and live announcements', () => {
    render(
      <AttachmentChips
        items={[
          item({ skippedPages: [2, 3] }),
          item({ localId: 'b', name: 'x.pdf', status: 'error', errorCode: 'encrypted' }),
        ]}
        announcement={{ type: 'ready', name: 'verifica.pdf' }}
        onCancel={vi.fn()}
        onRetry={vi.fn()}
        onRemove={vi.fn()}
        onFocusFallback={vi.fn()}
      />,
    );
    expect(screen.getByText(/2 pagine senza testo leggibile/)).toBeInTheDocument();
    expect(screen.getByText(/protetto da password/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      translate('attachments.announce.ready', { name: 'verifica.pdf' }),
    );
  });

  it('moves focus to a safe target only after the removal really succeeded', async () => {
    const onFocusFallback = vi.fn();
    const onRemove = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(
      <AttachmentChips
        items={[item({})]}
        announcement={null}
        onCancel={vi.fn()}
        onRetry={vi.fn()}
        onRemove={onRemove}
        onFocusFallback={onFocusFallback}
      />,
    );
    const remove = screen.getByRole('button', {
      name: translate('attachments.removeLabel', { name: 'verifica.pdf' }),
    });
    fireEvent.click(remove);
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1));
    expect(onFocusFallback).not.toHaveBeenCalled();
    fireEvent.click(remove);
    await waitFor(() => expect(onFocusFallback).toHaveBeenCalledTimes(1));
  });
});
