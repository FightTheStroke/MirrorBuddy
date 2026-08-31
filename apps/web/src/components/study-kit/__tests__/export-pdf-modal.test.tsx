/**
 * @vitest-environment jsdom
 *
 * Verifies the wired PDF-export chain from the modal: a keyboard-reachable
 * dialog that posts the chosen DSA profile + locale to /api/pdf-generator and
 * downloads the returned bytes. next-intl is mocked with real Italian strings
 * by the global test setup (src/test/setup.ts).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('ExportPDFModal', () => {
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
