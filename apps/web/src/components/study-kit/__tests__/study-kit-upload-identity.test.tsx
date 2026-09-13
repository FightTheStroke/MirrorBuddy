import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { csrfFetch, getClientIdentity, setClientIdentity, type ClientIdentity } from '@/lib/auth';
import { IdentityNotice } from '@/components/ui/identity-notice';
import type { SelectedFile } from '@/components/google-drive';
import { StudyKitUpload } from '../StudyKitUpload';

const callbacks = vi.hoisted<{ submit?: () => Promise<void> }>(() => ({}));
vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  csrfFetch: vi.fn(),
}));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/components/google-drive', () => ({
  UnifiedFilePicker: ({
    userId,
    onFileSelect,
  }: {
    userId: string;
    onFileSelect: (file: SelectedFile) => void;
  }) => (
    <>
      <button
        data-testid="picker-owner"
        onClick={() =>
          onFileSelect({
            source: 'local',
            name: 'lesson.pdf',
            size: 8,
            mimeType: 'application/pdf',
            file: new File(['%PDF-1.4'], 'lesson.pdf', { type: 'application/pdf' }),
          })
        }
      >
        {userId}
      </button>
      <button
        onClick={() =>
          onFileSelect({
            source: 'google-drive',
            name: 'lesson.pdf',
            size: 8,
            mimeType: 'application/pdf',
            driveFile: {
              id: 'drive-pdf',
              name: 'lesson.pdf',
              mimeType: 'application/pdf',
              size: 8,
              modifiedAt: new Date(),
              isFolder: false,
            },
          })
        }
      >
        select-drive
      </button>
    </>
  ),
}));
vi.mock('../components/study-kit-pdf-confirm', () => ({ StudyKitPdfConfirm: () => null }));
vi.mock('../components/upload-form', () => ({
  UploadForm: ({ title, onSubmit }: { title: string; onSubmit: () => Promise<void> }) => {
    callbacks.submit = onSubmit;
    return <button onClick={onSubmit}>upload {title}</button>;
  },
}));

const account: ClientIdentity = {
  status: 'authenticated',
  userId: 'confirmed-upload-owner',
  role: 'USER',
  legacyOrigin: false,
  needsLegacyUpgrade: false,
};
const blocked: ClientIdentity[] = [
  { status: 'pending' },
  { status: 'anonymous' },
  { status: 'unavailable', reason: 'SESSION_UNAVAILABLE' },
  { status: 'unavailable', reason: 'SESSION_REJECTED' },
];

beforeEach(() => {
  vi.clearAllMocks();
  callbacks.submit = undefined;
  setClientIdentity({ status: 'pending' });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  cleanup();
  setClientIdentity({ status: 'pending' });
  vi.unstubAllGlobals();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('Study Kit upload is gated by confirmed identity', () => {
  it.each(blocked)(
    'does not crash or mount owner-bound controls for $status ($reason)',
    (identity) => {
      setClientIdentity(identity);
      render(
        <>
          <IdentityNotice />
          <StudyKitUpload />
        </>,
      );

      expect(screen.queryByTestId('picker-owner')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert') !== null).toBe(identity.status === 'unavailable');
      expect(getClientIdentity()).toBe(identity);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('retains a selected local draft while refresh hides upload controls', () => {
    setClientIdentity(account);
    render(
      <>
        <IdentityNotice />
        <StudyKitUpload />
      </>,
    );
    fireEvent.click(screen.getByTestId('picker-owner'));
    expect(screen.getByRole('button', { name: 'upload lesson' })).toBeInTheDocument();

    act(() => setClientIdentity({ status: 'pending' }));
    expect(screen.queryByTestId('picker-owner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'upload lesson' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    act(() => setClientIdentity(account));
    expect(screen.getByTestId('picker-owner')).toHaveTextContent('confirmed-upload-owner');
    expect(screen.getByRole('button', { name: 'upload lesson' })).toBeInTheDocument();

    act(() => setClientIdentity({ status: 'unavailable', reason: 'SESSION_REJECTED' }));
    expect(screen.queryByTestId('picker-owner')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('unavailable');
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['pending', 'unavailable'])(
    'refuses a retained local-upload callback after identity becomes %s',
    async (status) => {
      setClientIdentity(account);
      render(<StudyKitUpload />);
      fireEvent.click(screen.getByTestId('picker-owner'));
      expect(callbacks.submit).toBeDefined();
      act(() =>
        setClientIdentity(
          status === 'pending'
            ? { status: 'pending' }
            : { status: 'unavailable', reason: 'SESSION_REJECTED' },
        ),
      );

      await act(async () => {
        await callbacks.submit?.();
      });

      expect(csrfFetch).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      act(() => setClientIdentity(account));
      expect(screen.getByRole('button', { name: 'upload lesson' })).toBeInTheDocument();
      expect(screen.queryByText('status.error')).not.toBeInTheDocument();
    },
  );

  it('pauses upload-status polling on unknown identity without substituting a visitor', async () => {
    vi.useFakeTimers();
    vi.mocked(csrfFetch).mockResolvedValue(Response.json({ studyKitId: 'owner-kit' }));
    setClientIdentity(account);
    render(<StudyKitUpload />);
    fireEvent.click(screen.getByTestId('picker-owner'));
    await act(async () => {
      await callbacks.submit?.();
    });
    expect(csrfFetch).toHaveBeenCalledTimes(1);
    act(() => setClientIdentity({ status: 'pending' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(csrfFetch).toHaveBeenCalledTimes(1);
  });

  it('does not send an upload after a Drive download crosses into pending identity', async () => {
    setClientIdentity(account);
    render(<StudyKitUpload />);
    fireEvent.click(screen.getByRole('button', { name: 'select-drive' }));
    vi.mocked(fetch).mockImplementation(async () => {
      setClientIdentity({ status: 'pending' });
      return new Response('%PDF-1.4');
    });

    await act(async () => {
      await callbacks.submit?.();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/google-drive/files/drive-pdf/download?userId=confirmed-upload-owner',
    );
    expect(csrfFetch).not.toHaveBeenCalled();
    act(() => setClientIdentity(account));
    expect(screen.getByRole('button', { name: 'upload lesson' })).toBeInTheDocument();
    expect(screen.queryByText('status.error')).not.toBeInTheDocument();
  });
});
