import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WebcamCapture } from '../../webcam-capture';
import { deferred } from '../hooks/camera-manager-test-utils';
import {
  encodedCanvasStub,
  getUserMedia,
  mediaStream,
  readyVideo,
  reports,
  cameraText,
} from './composition-test-setup';

async function camera(showTimer = false) {
  const current = mediaStream();
  getUserMedia.mockResolvedValueOnce(current);
  const onCapture = vi.fn();
  const onClose = vi.fn();
  const result = render(
    <WebcamCapture
      purpose="Camera test"
      onCapture={onCapture}
      onClose={onClose}
      showTimer={showTimer}
    />,
  );
  await act(async () => {});
  return { ...result, current, onCapture, onClose };
}
const advance = async (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms);
  });
const capture = () =>
  fireEvent.click(screen.getByRole('button', { name: cameraText('takePhoto') }));

describe('real preview readiness and countdown ownership', () => {
  it('does not publish a frame that resolved immediately before unmount', async () => {
    const { unmount, current } = await camera();
    act(() => {
      readyVideo();
      unmount();
    });
    await act(async () => {});
    expect(navigator.mediaDevices.enumerateDevices).not.toHaveBeenCalled();
    expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(reports).toEqual([]);
  });

  it.each(['timeout', 'unmount', 'close'] as const)(
    'removes frame listeners and releases tracks while waiting on %s',
    async (end) => {
      vi.useFakeTimers();
      const { unmount, current } = await camera();
      const video = document.querySelector('video')!;
      const remove = vi.spyOn(video, 'removeEventListener');
      if (end === 'timeout') await advance(10000);
      else if (end === 'unmount') unmount();
      else fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      await act(async () => {});
      expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
      expect(video.srcObject).toBeNull();
      for (const event of ['loadeddata', 'resize', 'error'])
        expect(remove).toHaveBeenCalledWith(event, expect.any(Function));
      await advance(0);
      expect(vi.getTimerCount()).toBe(0);
      fireEvent.loadedData(video);
      await act(async () => {});
      expect(navigator.mediaDevices.enumerateDevices).not.toHaveBeenCalled();
      expect(reports).toEqual([]);
    },
  );

  it('reports a current frame decoding error once with the original media error', async () => {
    const { current } = await camera();
    const video = document.querySelector('video')!;
    const failure = new Error('Media decode failed');
    Object.defineProperty(video, 'error', { value: failure });
    fireEvent.error(video);
    await act(async () => {});
    expect(screen.getByRole('button', { name: cameraText('choosePhoto') })).toBeEnabled();
    expect(reports).toEqual([{ message: 'Camera error', error: failure }]);
    expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
  });

  it.each(['cancel', 'close', 'unmount', 'lost-frame'] as const)(
    'never captures a stale countdown after %s',
    async (end) => {
      vi.useFakeTimers();
      const { unmount, current, onCapture, onClose } = await camera(true);
      const video = readyVideo();
      await act(async () => {});
      capture();
      expect(screen.getByRole('status')).toHaveTextContent('3');
      await advance(1000);
      if (end === 'cancel')
        fireEvent.click(screen.getByRole('button', { name: cameraText('cancel') }));
      else if (end === 'close') fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      else if (end === 'unmount') unmount();
      else Object.defineProperty(video, 'videoWidth', { value: 0 });
      await advance(4000);
      expect(HTMLCanvasElement.prototype.toDataURL).not.toHaveBeenCalled();
      expect(onCapture).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
      if (end === 'cancel') {
        expect(current.getTracks()[0].stop).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: cameraText('takePhoto') })).toBeEnabled();
      } else expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
      if (end === 'close') expect(onClose).toHaveBeenCalledOnce();
      if (end === 'lost-frame')
        expect(screen.getByRole('status')).toHaveTextContent(cameraText('frameUnavailable'));
    },
  );

  it('ignores an old acquisition grant after timeout and real error-branch retry', async () => {
    vi.useFakeTimers();
    const old = deferred<ReturnType<typeof mediaStream>>();
    const orphan = mediaStream();
    const current = mediaStream();
    getUserMedia.mockReturnValueOnce(old.promise).mockResolvedValueOnce(current);
    render(<WebcamCapture purpose="Camera test" onCapture={vi.fn()} onClose={vi.fn()} />);
    await advance(10000);
    fireEvent.click(screen.getByRole('button', { name: cameraText('errors.retry') }));
    await act(async () => {});
    const video = readyVideo();
    await act(async () => old.resolve(orphan));
    expect(video.srcObject).toBe(current);
    expect(orphan.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    capture();
    await advance(150);
    fireEvent.click(screen.getByRole('button', { name: cameraText('confirm') }));
    expect(screen.getByRole('img').getAttribute('src')).toBe(encodedCanvasStub);
    expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(reports).toEqual([]);
  });
});
