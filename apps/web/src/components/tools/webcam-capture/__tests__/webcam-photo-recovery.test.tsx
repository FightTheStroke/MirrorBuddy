import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WebcamCapture } from '../../webcam-capture';
import { deferred } from '../hooks/camera-manager-test-utils';
import {
  getUserMedia,
  mediaStream,
  readyVideo,
  reports,
  cameraText,
} from './composition-test-setup';
import { decodeImage, interceptPicker } from './photo-test-setup';

async function unsupportedCamera() {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
  const onCapture = vi.fn();
  const result = render(
    <WebcamCapture purpose="Camera test" onCapture={onCapture} onClose={vi.fn()} />,
  );
  const choose = await screen.findByRole('button', { name: cameraText('choosePhoto') });
  return { ...result, choose, onCapture };
}

describe('real gallery recovery composition with a simulated image decoder', () => {
  it('completes keyboard image selection, preview and confirmation without a camera', async () => {
    const user = userEvent.setup();
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const picker = interceptPicker();
    const { choose, onCapture, unmount } = await unsupportedCamera();
    expect(screen.getByRole('status')).toHaveTextContent(/fotocamera/i);
    await user.tab();
    await user.tab();
    expect(choose).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(picker.click).toHaveBeenCalledOnce();
    expect(picker.input()).toHaveAttribute('accept', 'image/*');
    expect(picker.input()).not.toHaveAttribute('capture');
    expect(screen.getByRole('status')).toHaveTextContent(cameraText('choosingPhoto'));
    picker.select();
    const confirm = await screen.findByRole('button', { name: cameraText('confirm') });
    expect(confirm).toHaveFocus();
    expect(decodeImage).toHaveBeenCalledOnce();
    const preview = screen.getByRole('img', { name: cameraText('fotoCatturata') });
    expect(preview.getAttribute('src')).toBe('data:image/png;base64,c3ludGhldGljIGltYWdlIGJ5dGVz');
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');
    expect(onCapture).toHaveBeenCalledExactlyOnceWith(preview.getAttribute('src'));
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(reports).toHaveLength(0);
    expect(picker.input().onchange).toBeNull();
    expect(picker.input().oncancel).toBeNull();
    expect(picker.input().onerror).toBeNull();
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('cancels the picker quietly, restores focus and allows another selection', async () => {
    const picker = interceptPicker();
    const { choose } = await unsupportedCamera();
    fireEvent.click(choose);
    fireEvent(picker.input(), new Event('cancel'));
    await waitFor(() => expect(choose).toBeEnabled());
    expect(choose).toHaveFocus();
    expect(reports).toHaveLength(0);
    fireEvent.click(choose);
    expect(picker.click).toHaveBeenCalledTimes(2);
    picker.select();
    await screen.findByRole('button', { name: cameraText('confirm') });
  });

  it.each(['decode', 'empty', 'format', 'dimensions'] as const)(
    'shows useful retry after %s failure without a duplicate report',
    async (failureType) => {
      const picker = interceptPicker();
      const failure = new Error('Synthetic decoder failure');
      if (failureType === 'decode') decodeImage.mockRejectedValueOnce(failure);
      if (failureType === 'dimensions')
        vi.mocked(
          Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth')!.get!,
        ).mockReturnValue(0);
      const { choose, onCapture } = await unsupportedCamera();
      fireEvent.click(choose);
      picker.select(
        new File(failureType === 'empty' ? [] : ['invalid image bytes'], 'photo', {
          type: failureType === 'format' ? 'image/webp' : 'image/png',
        }),
      );
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(cameraText('importFailed')),
      );
      expect(choose).toBeEnabled();
      expect(onCapture).not.toHaveBeenCalled();
      expect(reports).toHaveLength(1);
      expect(reports[0].message).toBe('Camera image import failed');
      if (failureType === 'decode') expect(reports[0].error).toBe(failure);
      expect(picker.input().onchange).toBeNull();
    },
  );

  it.each(['retry', 'close', 'unmount'] as const)(
    'ignores a late decoded import after %s',
    async (end) => {
      const pending = deferred<void>();
      decodeImage.mockReturnValueOnce(pending.promise);
      const picker = interceptPicker();
      const { choose, onCapture, unmount } = await unsupportedCamera();
      fireEvent.click(choose);
      picker.select();
      await waitFor(() => expect(decodeImage).toHaveBeenCalledOnce());
      if (end === 'unmount') unmount();
      else if (end === 'close') fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      else {
        Object.defineProperty(navigator, 'mediaDevices', {
          configurable: true,
          value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
        });
        getUserMedia.mockResolvedValueOnce(mediaStream());
        fireEvent.click(screen.getByRole('button', { name: cameraText('errors.retry') }));
        await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce());
        readyVideo();
      }
      await act(async () => pending.resolve());
      expect(screen.queryByRole('button', { name: cameraText('confirm') })).not.toBeInTheDocument();
      expect(onCapture).not.toHaveBeenCalled();
      expect(reports).toHaveLength(0);
    },
  );

  it('traps Tab within the actual dialog controls in both directions', async () => {
    const user = userEvent.setup();
    const { choose } = await unsupportedCamera();
    const buttons = screen
      .getAllByRole('button')
      .filter((button) => !button.hasAttribute('disabled'));
    buttons[0].focus();
    await user.tab({ shift: true });
    expect(buttons[buttons.length - 1]).toHaveFocus();
    await user.tab();
    expect(buttons[0]).toHaveFocus();
    await user.tab();
    expect(choose).toHaveFocus();
  });

  it('keeps capture-error recovery mounted while importing and after cancelling', async () => {
    getUserMedia.mockResolvedValueOnce(mediaStream());
    vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockReturnValueOnce('data:,');
    const picker = interceptPicker();
    render(<WebcamCapture purpose="Camera test" onCapture={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce());
    readyVideo();
    const capture = screen.getByRole('button', { name: cameraText('takePhoto') });
    await waitFor(() => expect(capture).toBeEnabled());
    fireEvent.click(capture);
    const choose = await screen.findByRole('button', { name: cameraText('choosePhoto') });
    fireEvent.click(choose);
    expect(choose).toBeInTheDocument();
    expect(choose).toBeDisabled();
    expect(capture).toBeDisabled();
    fireEvent(picker.input(), new Event('cancel'));
    await waitFor(() => expect(choose).toBeEnabled());
    expect(choose).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent(cameraText('frameUnavailable'));
    fireEvent.click(choose);
    picker.select();
    await screen.findByRole('button', { name: cameraText('confirm') });
    expect(getUserMedia).toHaveBeenCalledOnce();
  });
});
