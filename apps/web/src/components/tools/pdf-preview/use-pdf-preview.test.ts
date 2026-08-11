import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePDFPreview } from './use-pdf-preview';

const processPDF = vi.hoisted(() => vi.fn());

// Fully mocked: importing the real module pulls in pdfjs, which needs
// DOMMatrix and blows up under jsdom.
vi.mock('@/lib/pdf', () => ({
  processPDF,
  PDFProcessingError: class PDFProcessingError extends Error {},
}));

const page = (n: number) => ({
  pageNumber: n,
  imageData: `data:image/png;base64,page${n}`,
  width: 100,
  height: 140,
});

function makeFile() {
  return new File(['%PDF-1.4'], 'compiti.pdf', { type: 'application/pdf' });
}

describe('usePDFPreview', () => {
  beforeEach(() => {
    processPDF.mockReset();
    processPDF.mockResolvedValue({
      pages: [page(1), page(2), page(3)],
      totalPages: 3,
      truncated: false,
    });
  });

  async function renderReady(options: Record<string, unknown>) {
    const view = renderHook(() =>
      usePDFPreview({ file: makeFile(), onClose: vi.fn(), ...options } as never),
    );
    await waitFor(() => expect(view.result.current.viewMode).toBe('preview'));
    return view;
  }

  describe('select mode (default)', () => {
    it('hands the selected pages back to onPagesSelected', async () => {
      const onPagesSelected = vi.fn();
      const { result } = await renderReady({ onPagesSelected });

      act(() => result.current.togglePageSelection(2));
      act(() => result.current.handleConfirm());

      expect(onPagesSelected).toHaveBeenCalledTimes(1);
      const pages = onPagesSelected.mock.calls[0][0];
      expect(pages.map((p: { pageNumber: number }) => p.pageNumber)).toEqual([1, 3]);
    });

    it('toggles page selection on', async () => {
      const { result } = await renderReady({ onPagesSelected: vi.fn() });

      act(() => result.current.togglePageSelection(1));

      expect(result.current.selectedPages.has(1)).toBe(true);
    });
  });

  describe('confirm mode', () => {
    it('ignores togglePageSelection so the selection never grows', async () => {
      const { result } = await renderReady({ mode: 'confirm', onConfirm: vi.fn() });

      act(() => result.current.togglePageSelection(1));
      act(() => result.current.togglePageSelection(2));

      expect(result.current.selectedPages.has(1)).toBe(false);
      expect(result.current.selectedPages.has(2)).toBe(false);
    });

    it('calls onConfirm and never onPagesSelected', async () => {
      const onConfirm = vi.fn();
      const onPagesSelected = vi.fn();
      const { result } = await renderReady({
        mode: 'confirm',
        onConfirm,
        onPagesSelected,
      });

      act(() => result.current.handleConfirm());

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onPagesSelected).not.toHaveBeenCalled();
    });

    it('leaves Space to the browser so buttons and scrolling still work', async () => {
      const { result } = await renderReady({ mode: 'confirm', onConfirm: vi.fn() });
      const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(event.defaultPrevented).toBe(false);
      expect(result.current.selectedPages.size).toBe(1);
    });

    it('swallows Space in select mode instead, to toggle the page', async () => {
      const { result } = await renderReady({ onPagesSelected: vi.fn() });
      const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });

      act(() => {
        window.dispatchEvent(event);
      });

      expect(event.defaultPrevented).toBe(true);
      expect(result.current.selectedPages.size).toBe(1);
    });

    it('still closes on Escape', async () => {
      const onClose = vi.fn();
      const { result } = await renderReady({ mode: 'confirm', onConfirm: vi.fn(), onClose });
      expect(result.current.viewMode).toBe('preview');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(onClose).toHaveBeenCalled();
    });
  });
});
