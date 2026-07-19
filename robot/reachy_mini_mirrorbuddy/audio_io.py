"""Bridge the robot's microphone/speaker to the Azure Realtime client.

- Captures microphone audio, downmixes to mono, resamples to the realtime rate and
  forwards it to a callback (which sends it to Azure).
- Plays back the model's speech through the robot speaker, resampling to the robot's
  output rate, and forwards the same audio to the movement engine for lip-sync.
"""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable

import numpy as np
from math import gcd
from scipy.signal import resample_poly

from .azure_realtime import SAMPLE_RATE

logger = logging.getLogger(__name__)


def _resample(audio: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    """Low-latency polyphase resampling (faster + cleaner than FFT resample)."""
    if src_rate == dst_rate or audio.size == 0:
        return audio
    g = gcd(src_rate, dst_rate)
    up = dst_rate // g
    down = src_rate // g
    return resample_poly(audio, up, down)


class AudioIO:
    """Microphone capture + speaker playback for the realtime session."""

    def __init__(
        self,
        robot,
        on_input_pcm16: Callable[[bytes], None],
        movements=None,
    ) -> None:
        self.robot = robot
        self.on_input_pcm16 = on_input_pcm16
        self.movements = movements

        self._recording = False
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._in_rate: int | None = None
        self._out_rate: int | None = None

    # ------------------------------------------------------------------ lifecycle
    def start(self) -> None:
        self.robot.media.start_recording()
        self.robot.media.start_playing()
        time.sleep(1.0)  # let the gstreamer pipelines come up
        self._probe_rates()

        self._recording = True
        self._stop.clear()
        self._thread = threading.Thread(target=self._input_loop, name="MirrorBuddyMic", daemon=True)
        self._thread.start()

    def _probe_rates(self) -> None:
        """Read the actual mic/speaker sample rates from the media server.

        Must run before any playback: play() resamples from the realtime rate to
        the speaker rate, and an unknown speaker rate makes the first audio chunks
        play at the wrong pitch (a "ghost" voice) until the rate is known.
        """
        try:
            self._in_rate = int(self.robot.media.get_input_audio_samplerate())
        except Exception:
            self._in_rate = 16000
        try:
            self._out_rate = int(self.robot.media.get_output_audio_samplerate())
        except Exception:
            self._out_rate = 16000
        logger.info("Audio rates — mic: %s Hz, speaker: %s Hz, realtime: %s Hz",
                    self._in_rate, self._out_rate, SAMPLE_RATE)

    def stop(self) -> None:
        self._recording = False
        self._stop.set()
        try:
            self.robot.media.stop_recording()
        except Exception:
            pass
        try:
            self.robot.media.stop_playing()
        except Exception:
            pass
        if self._thread:
            self._thread.join(timeout=2.0)
            self._thread = None

    # ------------------------------------------------------------------ playback
    def play(self, pcm16: bytes) -> None:
        """Play model speech (PCM16 @ realtime rate) through the robot speaker."""
        if not pcm16:
            return
        audio = np.frombuffer(pcm16, dtype=np.int16)

        # Lip-sync / head movement is driven by the raw speech signal.
        if self.movements is not None:
            try:
                self.movements.feed(audio, SAMPLE_RATE)
            except Exception as e:
                logger.debug("movement feed error: %s", e)

        out_rate = self._out_rate or SAMPLE_RATE
        if self._out_rate is None:
            # Playback started before rates were probed (e.g. an early greeting):
            # probe now so we don't emit the first chunks at the wrong rate.
            self._probe_rates()
            out_rate = self._out_rate or SAMPLE_RATE
        if out_rate != SAMPLE_RATE and audio.size:
            audio = _resample(audio, SAMPLE_RATE, out_rate)
        audio_f32 = (np.asarray(audio, dtype=np.float32)) / 32768.0
        try:
            self.robot.media.push_audio_sample(audio_f32)
        except Exception as e:
            logger.debug("push_audio_sample error: %s", e)

    def interrupt(self) -> None:
        """Stop current playback (barge-in) and reset movement state."""
        # clear_output_buffer() is deprecated and a no-op on this firmware; clear_player()
        # actually flushes the queued speaker audio so speech stops immediately.
        try:
            self.robot.media.audio.clear_player()
        except Exception:
            try:
                self.robot.media.audio.clear_output_buffer()
            except Exception:
                pass
        if self.movements is not None:
            try:
                self.movements.reset()
            except Exception:
                pass

    # ------------------------------------------------------------------ capture
    def _input_loop(self) -> None:
        in_rate = self._in_rate or 16000
        needs_resample = in_rate != SAMPLE_RATE
        while self._recording and not self._stop.is_set():
            try:
                sample = self.robot.media.get_audio_sample()
                if sample is None:
                    time.sleep(0.001)
                    continue
                audio = sample if isinstance(sample, np.ndarray) else np.frombuffer(sample, dtype=np.int16)

                # Downmix to mono.
                if audio.ndim == 2:
                    audio = audio.mean(axis=1)

                # Normalise dtype to int16.
                if audio.dtype != np.int16:
                    if np.issubdtype(audio.dtype, np.floating):
                        audio = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
                    else:
                        audio = audio.astype(np.int16)

                # Resample microphone -> realtime rate.
                if needs_resample and audio.size:
                    audio = _resample(audio, in_rate, SAMPLE_RATE).astype(np.int16)

                self.on_input_pcm16(audio.tobytes())
            except Exception as e:
                logger.error("mic loop error: %s", e)
                time.sleep(0.05)
        logger.info("Microphone loop stopped")
