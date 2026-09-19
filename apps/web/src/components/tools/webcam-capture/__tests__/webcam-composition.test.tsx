import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WebcamCapture } from '../../webcam-capture';
import { captureImageFromVideo } from '../utils/capture-utils';
import { requestVideoStream } from '@/lib/native/media-bridge';
import {
  encodedCanvasStub,
  getUserMedia,
  mediaStream,
  readyVideo,
  reports,
  cameraText,
} from './composition-test-setup';

function renderCamera(onCapture = vi.fn(), onClose = vi.fn(), showTimer = false) {
  return {
    ...render(
      <WebcamCapture
        purpose="Camera test"
        onCapture={onCapture}
        onClose={onClose}
        showTimer={showTimer}
      />,
    ),
    onCapture,
    onClose,
  };
}
const captureButton = () => screen.getByRole('button', { name: cameraText('takePhoto') });
async function finishCapture() {
  await waitFor(() => expect(captureButton()).toBeEnabled());
  fireEvent.click(captureButton());
  fireEvent.click(captureButton());
  await screen.findByRole('button', { name: cameraText('confirm') });
}

describe('real webcam composition', () => {
  it('retries from the real error branch and attaches to the current video', async () => {
    const current = mediaStream();
    getUserMedia
      .mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'))
      .mockResolvedValueOnce(current);
    const { unmount } = renderCamera();
    fireEvent.click(await screen.findByRole('button', { name: cameraText('errors.retry') }));
    await waitFor(() => expect(document.querySelector('video')?.srcObject).toBe(current));
    readyVideo();
    await waitFor(() => expect(captureButton()).toBeEnabled());
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    unmount();
    expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
  });

  it('keeps capture disabled until decoded frame dimensions exist', async () => {
    getUserMedia.mockResolvedValueOnce(mediaStream());
    renderCamera();
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce());
    expect(captureButton()).toBeDisabled();
    readyVideo();
    await waitFor(() => expect(captureButton()).toBeEnabled());
  });

  it('does not encode an empty or not-yet-ready video frame', () => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    expect(captureImageFromVideo(video, canvas)).toBeNull();
    expect(HTMLCanvasElement.prototype.toDataURL).not.toHaveBeenCalled();
  });

  it('captures, retakes and confirms a single result even on repeated activation', async () => {
    const first = mediaStream();
    const second = mediaStream();
    getUserMedia.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { onCapture, unmount } = renderCamera();
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce());
    readyVideo();
    await finishCapture();
    expect(first.getTracks()[0].stop).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: cameraText('retake') }));
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2));
    readyVideo();
    await finishCapture();
    const confirm = screen.getByRole('button', { name: cameraText('confirm') });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onCapture).toHaveBeenCalledExactlyOnceWith(encodedCanvasStub);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledTimes(2);
    unmount();
    expect(second.getTracks()[0].stop).toHaveBeenCalledOnce();
  });

  it('reports one current unexpected acquisition failure with its original cause', async () => {
    const failure = new Error('Camera driver failed');
    getUserMedia.mockRejectedValueOnce(failure);
    renderCamera();
    await screen.findByRole('button', { name: cameraText('errors.retry') });
    expect(reports).toEqual([{ message: 'Camera error', error: failure }]);
  });

  it('offers a usable image selection instead of only Close for unsupported capability', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('Not supported', 'NotSupportedError'));
    renderCamera();
    expect(await screen.findByRole('button', { name: cameraText('choosePhoto') })).toBeEnabled();
  });

  it('invokes close only once for Escape', async () => {
    getUserMedia.mockResolvedValueOnce(mediaStream());
    const { onClose } = renderCamera();
    await act(async () => {});
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the default native helper reporter for callers that do not own errors', async () => {
    const failure = new Error('Camera driver failed');
    getUserMedia.mockRejectedValueOnce(failure);
    await expect(requestVideoStream()).rejects.toBe(failure);
    expect(reports).toEqual([{ message: '[MediaBridge] Video stream error', error: failure }]);
  });

  it('reports one original playback fault across real helper and manager', async () => {
    const current = mediaStream();
    const failure = new Error('Playback failed');
    getUserMedia.mockResolvedValueOnce(current);
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(failure);
    renderCamera();
    await screen.findByRole('button', { name: cameraText('errors.retry') });
    expect(reports).toEqual([{ message: 'Camera error', error: failure }]);
    expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(document.querySelector('video')).toBeNull();
    expect(getUserMedia).toHaveBeenCalledOnce();
  });

  it('reports canvas failure once, stops the stream and offers useful recovery', async () => {
    const current = mediaStream();
    const failure = new Error('Canvas failed');
    getUserMedia.mockResolvedValueOnce(current);
    vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockImplementationOnce(() => {
      throw failure;
    });
    const { onCapture } = renderCamera();
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce());
    readyVideo();
    await waitFor(() => expect(captureButton()).toBeEnabled());
    fireEvent.click(captureButton());
    await screen.findByRole('button', { name: cameraText('choosePhoto') });
    expect(reports).toEqual([{ message: 'Camera capture failed', error: failure }]);
    expect(current.getTracks()[0].stop).toHaveBeenCalledOnce();
    expect(onCapture).not.toHaveBeenCalled();
  });
});
