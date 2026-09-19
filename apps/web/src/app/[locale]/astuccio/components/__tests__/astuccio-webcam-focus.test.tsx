import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AstuccioView } from '../astuccio-view';
import {
  cameraText,
  getUserMedia,
  mediaStream,
  readyVideo,
} from '@/components/tools/webcam-capture/__tests__/composition-test-setup';
import { getTranslation } from '@/test/i18n-helpers';
import { TIMER_OPTIONS } from '@/components/tools/webcam-capture/constants';

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'it' }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/components/education/tool-maestro-selection-dialog', () => ({
  ToolMaestroSelectionDialog: () => null,
}));
vi.mock('@/components/study-kit/StudyKitView', () => ({ StudyKitView: () => null }));
vi.mock('@/components/typing/TypingView', () => ({ TypingView: () => null }));
vi.mock('../astuccio-info-section', () => ({ AstuccioInfoSection: () => null }));
vi.mock('@/lib/hooks/use-saved-materials', () => ({
  forceSaveMaterial: vi.fn(async () => true),
}));

const entry = () =>
  screen.getByRole('button', {
    name: `${getTranslation('tools.webcamStandalone.label')}: ${getTranslation('tools.webcamStandalone.description')}`,
  });

describe('Astuccio camera launching-control focus', () => {
  for (const close of ['button', 'escape', 'pendingImport', 'cancelledImport', 'confirm']) {
    it(`restores the remounted real launching control after ${close}`, async () => {
      const importing = close === 'pendingImport' || close === 'cancelledImport';
      if (importing)
        getUserMedia.mockRejectedValue(new DOMException('Unsupported', 'NotSupportedError'));
      else getUserMedia.mockImplementation(async () => mediaStream());
      render(<AstuccioView />);
      const original = entry();
      expect(original).not.toHaveFocus();
      original.focus();
      fireEvent.click(original);
      await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
      expect(original.isConnected).toBe(false);

      if (importing) {
        const inputs: HTMLInputElement[] = [];
        vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
          this: HTMLInputElement,
        ) {
          inputs.push(this);
        });
        fireEvent.click(await screen.findByRole('button', { name: cameraText('choosePhoto') }));
        const input = inputs[0];
        expect(input).toBeDefined();
        if (close === 'cancelledImport') {
          await act(async () => {
            input!.dispatchEvent(new Event('cancel'));
          });
          expect(screen.getByRole('button', { name: cameraText('choosePhoto') })).toBeEnabled();
        }
      }

      if (close === 'escape' || close === 'cancelledImport') {
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      } else if (close === 'confirm') {
        await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalled());
        readyVideo();
        fireEvent.click(screen.getByText(TIMER_OPTIONS[0].label));
        const capture = screen.getByRole('button', { name: cameraText('takePhoto') });
        await waitFor(() => expect(capture).toBeEnabled());
        fireEvent.click(capture);
        fireEvent.click(await screen.findByRole('button', { name: cameraText('confirm') }));
      } else {
        fireEvent.click(screen.getByRole('button', { name: cameraText('closeCamera') }));
      }

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(entry()).not.toBe(original);
      expect(entry().isConnected).toBe(true);
      expect(entry()).toHaveFocus();
    });
  }

  it('does not focus a detached launcher when the whole route unmounts', async () => {
    getUserMedia.mockImplementation(async () => mediaStream());
    const { unmount } = render(<AstuccioView />);
    const original = entry();
    original.focus();
    const focus = vi.spyOn(original, 'focus');
    fireEvent.click(original);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    unmount();
    expect(focus).not.toHaveBeenCalled();
  });
});
