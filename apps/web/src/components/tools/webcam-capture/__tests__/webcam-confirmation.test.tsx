import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
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

type CaptureHandler = ComponentProps<typeof WebcamCapture>['onCapture'];
const flush = () => act(async () => {});
async function takePhoto() {
  await flush();
  readyVideo();
  await flush();
  fireEvent.click(screen.getByRole('button', { name: cameraText('takePhoto') }));
  await act(async () => {
    vi.advanceTimersByTime(150);
  });
}
async function renderPhoto(onCapture: CaptureHandler) {
  vi.useFakeTimers();
  getUserMedia.mockResolvedValueOnce(mediaStream());
  const result = render(
    <WebcamCapture purpose="Camera test" onCapture={onCapture} onClose={vi.fn()} />,
  );
  await takePhoto();
  return result;
}
const confirm = () => screen.getByRole('button', { name: cameraText('confirm') });

describe('real confirmation callback boundary', () => {
  it('blocks repeated confirmation until a pending callback resolves and after acceptance', async () => {
    const pending = deferred<boolean>();
    const onCapture = vi.fn<CaptureHandler>().mockReturnValue(pending.promise);
    await renderPhoto(onCapture);
    fireEvent.click(confirm());
    fireEvent.click(confirm());
    expect(confirm()).toBeDisabled();
    expect(onCapture).toHaveBeenCalledExactlyOnceWith(encodedCanvasStub);
    await act(async () => pending.resolve(true));
    fireEvent.click(confirm());
    expect(onCapture).toHaveBeenCalledOnce();
  });

  it('allows retry when the existing save callback returns false', async () => {
    const onCapture = vi
      .fn<CaptureHandler>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    await renderPhoto(onCapture);
    fireEvent.click(confirm());
    await flush();
    expect(confirm()).toBeEnabled();
    fireEvent.click(confirm());
    await flush();
    expect(onCapture).toHaveBeenCalledTimes(2);
    expect(confirm()).toBeDisabled();
    expect(reports).toEqual([]);
  });

  it('keeps callback errors visible once with the original cause and allows retry', async () => {
    const failure = new Error('Save callback failed');
    const onCapture = vi
      .fn<CaptureHandler>()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(true);
    await renderPhoto(onCapture);
    fireEvent.click(confirm());
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent(cameraText('confirmFailed'));
    expect(reports).toEqual([{ message: 'Camera confirmation failed', error: failure }]);
    expect(confirm()).toBeEnabled();
    fireEvent.click(confirm());
    await flush();
    expect(onCapture).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent(cameraText('fotoCatturata'));
  });

  it('does not let an old confirmation unlock the newer image', async () => {
    const old = deferred<boolean>();
    const current = deferred<boolean>();
    const onCapture = vi
      .fn<CaptureHandler>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    await renderPhoto(onCapture);
    fireEvent.click(confirm());
    getUserMedia.mockResolvedValueOnce(mediaStream());
    fireEvent.click(screen.getByRole('button', { name: cameraText('retake') }));
    await takePhoto();
    fireEvent.click(confirm());
    await act(async () => old.resolve(false));
    expect(confirm()).toBeDisabled();
    fireEvent.click(confirm());
    expect(onCapture).toHaveBeenCalledTimes(2);
    await act(async () => current.resolve(true));
  });

  it('retries a failed confirmation without acquiring another hidden camera', async () => {
    const onCapture = vi
      .fn<CaptureHandler>()
      .mockRejectedValueOnce(new Error('Save callback failed'))
      .mockResolvedValueOnce(true);
    await renderPhoto(onCapture);
    fireEvent.click(confirm());
    await flush();
    fireEvent.click(screen.getByRole('button', { name: cameraText('errors.retry') }));
    await flush();
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(onCapture).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent(cameraText('fotoCatturata'));
  });
});
