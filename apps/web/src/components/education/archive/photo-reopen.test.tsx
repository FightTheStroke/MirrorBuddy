import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MaterialViewer } from './material-viewer';
import { ThumbnailPreview } from './thumbnail-preview';
import { ImageRenderer } from '../knowledge-hub/renderers/image-renderer';
import type { ArchiveItem } from './types';
import { getTranslation } from '@/test/i18n-helpers';

vi.mock('@/components/education/knowledge-hub/components/related-materials', () => ({
  RelatedMaterials: () => null,
}));
vi.mock('@/components/zaino/print-button', () => ({ PrintButton: () => null }));

afterEach(cleanup);

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
const item = (content: Record<string, unknown>): ArchiveItem => ({
  id: 'owned-photo',
  toolId: 'owned-photo',
  toolType: 'webcam',
  title: 'Owned photo',
  content,
  status: 'active',
  isBookmarked: false,
  viewCount: 0,
  createdAt: new Date('2026-09-19T08:00:00Z'),
  updatedAt: new Date('2026-09-19T08:00:00Z'),
});

describe('persisted photo read compatibility', () => {
  for (const field of ['imageBase64', 'imageData', 'url']) {
    it(`reopens ${field} in the archive without rewriting stored content`, async () => {
      const content = Object.freeze({ [field]: image });
      render(<MaterialViewer item={item(content)} onClose={vi.fn()} />);
      expect(await screen.findByRole('img')).toHaveAttribute('src', image);
      expect(content).toEqual({ [field]: image });
    });

    it(`previews ${field} in the archive card`, () => {
      render(<ThumbnailPreview item={item({ [field]: image })} />);
      expect(screen.getByRole('img')).toHaveAttribute('src', image);
    });

    it(`reopens ${field} in the knowledge hub`, () => {
      render(<ImageRenderer data={{ [field]: image }} />);
      expect(screen.getByRole('img')).toHaveAttribute('src', image);
    });
  }

  it('retains the explicit missing-image state', () => {
    render(<ImageRenderer data={{ imageBase64: '', url: 12 }} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(
      screen.getByText(getTranslation('education.nessunaImmagineDisponibile')),
    ).toBeInTheDocument();
  });
});
