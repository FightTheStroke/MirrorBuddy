import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudyKitUpload } from '../StudyKitUpload';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/hooks/use-saved-materials/utils/user-id', () => ({
  getUserId: () => 'user-1',
}));

vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));

// The preview mounts pdfjs, which needs browser globals jsdom lacks.
vi.mock('@/components/tools/pdf-preview', () => ({
  PDFPreview: () => <div data-testid="pdf-preview" />,
}));

const LOCAL_FILE = new File(['%PDF-1.4'], 'compiti.pdf', {
  type: 'application/pdf',
});

vi.mock('@/components/google-drive', () => ({
  UnifiedFilePicker: ({ onFileSelect }: { onFileSelect: (f: unknown) => void }) => (
    <div>
      <button
        onClick={() =>
          onFileSelect({
            source: 'local',
            name: 'compiti.pdf',
            mimeType: 'application/pdf',
            file: LOCAL_FILE,
          })
        }
      >
        pick-local
      </button>
      <button
        onClick={() =>
          onFileSelect({
            source: 'google-drive',
            name: 'compiti.pdf',
            mimeType: 'application/pdf',
            driveFile: { id: 'drive-1' },
          })
        }
      >
        pick-drive
      </button>
    </div>
  ),
}));

describe('StudyKitUpload - PDF preview offer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers the preview once a local PDF is chosen', async () => {
    render(<StudyKitUpload />);

    await userEvent.click(screen.getByText('pick-local'));

    expect(screen.getByText('openPreview')).toBeInTheDocument();
  });

  it('does not offer the preview for a Google Drive pick, which is not a File', async () => {
    render(<StudyKitUpload />);

    await userEvent.click(screen.getByText('pick-drive'));

    expect(screen.queryByText('openPreview')).not.toBeInTheDocument();
  });

  it('shows nothing before a file is chosen', () => {
    render(<StudyKitUpload />);

    expect(screen.queryByText('openPreview')).not.toBeInTheDocument();
  });
});
