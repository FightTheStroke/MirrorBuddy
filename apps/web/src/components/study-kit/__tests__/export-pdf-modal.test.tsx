/**
 * @vitest-environment jsdom
 *
 * Verifies the wired PDF-export chain from the modal: a keyboard-reachable
 * dialog that posts the chosen DSA profile + locale to /api/pdf-generator and
 * downloads the returned bytes. next-intl is mocked with real Italian strings
 * by the global test setup (src/test/setup.ts).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportPDFModal } from '../ExportPDFModal';
import type { StudyKit } from '@/types/study-kit';

const mockCsrfFetch = vi.fn();
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args) };
});

vi.mock('@/components/ui/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const studyKit: StudyKit = {
  id: 'kit-123',
  userId: 'user-1',
  sourceFile: 'lesson.pdf',
  title: 'Fotosintesi',
  subject: 'Scienze',
  status: 'ready',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function pdfResponse(): Response {
  return {
    ok: true,
    headers: new Headers({
      'Content-Disposition': 'attachment; filename="Fotosintesi_DSA.pdf"',
      'X-Saved-To-Zaino': 'false',
    }),
    blob: async () => new Blob([new Uint8Array([37, 80, 68, 70])], { type: 'application/pdf' }),
    json: async () => ({}),
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:pdf'), writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
});

// Radix defers the dialog's unmount auto-focus callback to a macrotask
// (@radix-ui/react-focus-scope dist/index.mjs:87-99), so removing the DOM is
// not the end of the dialog's lifecycle: that callback still has to run inside
// this environment. This helper is the file's single unmount path, so the
// regression below observes the real Radix callback and never a mock of it.
const AUTOFOCUS_ON_UNMOUNT = 'focusScope.autoFocusOnUnmount';

async function unmountDialogs(): Promise<void> {
  cleanup();
  // Radix dispatches that callback from a zero-delay timer, so awaiting one
  // macrotask inside act() lets it run while this environment is still alive,
  // instead of leaving it pending until the environment is torn down.
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

afterEach(unmountDialogs);

describe('ExportPDFModal', () => {
  it('drains the dialog unmount auto-focus callback before the environment is torn down', async () => {
    render(<ExportPDFModal studyKit={studyKit} isOpen onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    let autoFocusedOnUnmount = false;
    dialog.addEventListener(AUTOFOCUS_ON_UNMOUNT, () => {
      autoFocusedOnUnmount = true;
    });

    await unmountDialogs();

    expect(dialog.isConnected).toBe(false);
    expect(autoFocusedOnUnmount).toBe(true);
  });

  it('exposes an accessible dialog with a name when open', () => {
    render(<ExportPDFModal studyKit={studyKit} isOpen onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Esporta in PDF' })).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<ExportPDFModal studyKit={studyKit} isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('marks the chosen reading profile as pressed', async () => {
    const user = userEvent.setup();
    render(<ExportPDFModal studyKit={studyKit} isOpen onClose={vi.fn()} />);

    const adhd = screen.getByRole('button', { name: /DOP\/ADHD/ });
    await user.click(adhd);
    expect(adhd).toHaveAttribute('aria-pressed', 'true');
  });

  it('posts the selected profile, format and locale then closes on success', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCsrfFetch.mockResolvedValue(pdfResponse());

    render(<ExportPDFModal studyKit={studyKit} isOpen onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Disprassia/ }));
    await user.click(screen.getByRole('button', { name: 'Esporta PDF' }));

    await waitFor(() => expect(mockCsrfFetch).toHaveBeenCalledTimes(1));
    const [url, init] = mockCsrfFetch.mock.calls[0];
    expect(url).toBe('/api/pdf-generator');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      kitId: 'kit-123',
      profile: 'dyspraxia',
      format: 'A4',
      locale: 'it',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
