import type { Page } from './fixtures';

interface VoiceHandshake {
  status: number;
  connected: boolean;
  error: string | null;
}

export async function connectVoiceThroughRelay(page: Page, token: string): Promise<VoiceHandshake> {
  return page.evaluate(async (ephemeralToken) => {
    const peerConnection = new RTCPeerConnection();
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) throw new Error('Fake microphone returned no audio track');
      audioTrack.enabled = false;
      peerConnection.addTrack(audioTrack, stream);
      const dataChannel = peerConnection.createDataChannel('realtime-channel');
      const offer = await peerConnection.createOffer({ offerToReceiveAudio: true });
      await peerConnection.setLocalDescription(offer);

      const getCurrentCsrfToken = async () => {
        const sessionResponse = await fetch('/api/session', { credentials: 'include' });
        if (!sessionResponse.ok) {
          throw new Error(`Session endpoint returned ${sessionResponse.status}`);
        }
        const session: unknown = await sessionResponse.json();
        if (
          typeof session !== 'object' ||
          session === null ||
          !('csrfToken' in session) ||
          typeof session.csrfToken !== 'string'
        ) {
          throw new Error('Session endpoint returned no CSRF token');
        }
        return session.csrfToken;
      };
      const postRelay = (csrfToken: string) =>
        fetch('/api/realtime/sdp-exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          credentials: 'include',
          body: JSON.stringify({
            sdp: peerConnection.localDescription?.sdp,
            token: ephemeralToken,
          }),
        });

      let response = await postRelay(await getCurrentCsrfToken());
      if (response.status === 403) {
        const errorBody: unknown = await response
          .clone()
          .json()
          .catch(() => null);
        if (
          typeof errorBody === 'object' &&
          errorBody !== null &&
          'error' in errorBody &&
          errorBody.error === 'Invalid CSRF token'
        ) {
          response = await postRelay(await getCurrentCsrfToken());
        }
      }

      const answer = await response.text();
      if (!response.ok) {
        return { status: response.status, connected: false, error: answer.slice(0, 300) };
      }

      await peerConnection.setRemoteDescription({ type: 'answer', sdp: answer });
      const connected = await new Promise<boolean>((resolve) => {
        if (dataChannel.readyState === 'open') {
          resolve(true);
          return;
        }
        const timeout = window.setTimeout(() => resolve(false), 10_000);
        dataChannel.addEventListener(
          'open',
          () => {
            window.clearTimeout(timeout);
            resolve(true);
          },
          { once: true },
        );
      });
      return {
        status: response.status,
        connected,
        error: connected ? null : `data channel state: ${dataChannel.readyState}`,
      };
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      peerConnection.close();
    }
  }, token);
}
