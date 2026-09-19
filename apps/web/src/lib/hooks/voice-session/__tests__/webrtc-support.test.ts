import { afterEach, describe, expect, it, vi } from 'vitest';
import { isWebRTCSupported } from '../webrtc-support';

afterEach(() => vi.unstubAllGlobals());

describe('voice connection capability helper', () => {
  it.each([
    'RTCPeerConnection',
    'webkitRTCPeerConnection',
    'mozRTCPeerConnection',
    'msRTCPeerConnection',
  ])('recognizes %s and callable media access without requesting hardware', (name) => {
    const request = vi.fn();
    vi.stubGlobal('window', { [name]: class Peer {} });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: request } });
    expect(isWebRTCSupported()).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects server-side execution without window', () => {
    vi.stubGlobal('window', undefined);
    expect(isWebRTCSupported()).toBe(false);
  });

  it('rejects a browser without a peer constructor', () => {
    const request = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: request } });
    expect(isWebRTCSupported()).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });

  it.each([{}, { mediaDevices: {} }, { mediaDevices: { getUserMedia: undefined } }])(
    'rejects missing microphone access: %j',
    (navigator) => {
      vi.stubGlobal('window', { RTCPeerConnection: class Peer {} });
      vi.stubGlobal('navigator', navigator);
      expect(isWebRTCSupported()).toBe(false);
    },
  );
});
