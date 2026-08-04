"""Decide when a real voice should cut Buddy off mid-sentence (local barge-in).

Kept apart from the audio plumbing because this is the one path that lets a child
stop being talked over: it has to be readable, and testable without a robot.
"""

from __future__ import annotations

import logging

from . import audio_dsp

logger = logging.getLogger(__name__)

# The configured threshold is an upper bound, not the target: a still robot measures
# ~0.004 RMS, and a child who does not project (cerebral palsy, shyness, tiredness)
# never reaches a fixed 0.045 — so "zitto" would go unheard exactly when it matters.
# We track the room's noise floor while Buddy is silent and trigger at a multiple of
# it, never below _BARGE_MIN_RMS (so a silent room cannot arm on nothing).
_NOISE_EMA_ALPHA = 0.05
_BARGE_NOISE_RATIO = 4.0
_BARGE_MIN_RMS = 0.012
# Reference gain the configured ceiling is calibrated against; louder playback leaks
# more into the mic, so the ceiling has to rise with it (see scale_for_gain).
_GAIN_REFERENCE = 1.6


class BargeDetector:
    """Stateful mic-frame decision: does this frame mean 'stop talking'?"""

    def __init__(
        self,
        rms_threshold: float | None = None,
        sustain_frames: int | None = None,
        output_gain: float = 1.0,
    ) -> None:
        # Prefer values passed by the caller (from Config, read after the instance
        # .env loads); fall back to env/defaults for standalone use. The defaults are
        # read through the module, not by name: the parameters shadow the helpers, so
        # calling them bare here would try to call the argument itself.
        self.ceiling = (
            rms_threshold
            if rms_threshold is not None
            else audio_dsp.barge_rms_threshold()
        )
        self.sustain_frames = (
            sustain_frames
            if sustain_frames is not None
            else audio_dsp.barge_sustain_frames()
        )
        self.ceiling *= self.scale_for_gain(output_gain)
        self.noise_floor = 0.004  # room RMS while Buddy is silent, adapted continuously
        self._loud_frames = 0

    @staticmethod
    def scale_for_gain(output_gain: float) -> float:
        """How much the ceiling rises when Buddy's voice is amplified."""
        return max(1.0, float(output_gain) / _GAIN_REFERENCE)

    def reset(self) -> None:
        """Forget the debounce streak (playback was cut; start watching afresh)."""
        self._loud_frames = 0

    def threshold(self) -> float:
        """RMS a voice must reach to cut Buddy off, adapted to the room."""
        adaptive = max(_BARGE_MIN_RMS, self.noise_floor * _BARGE_NOISE_RATIO)
        return min(self.ceiling, adaptive)

    def note_frame(self, rms: float, speaking: bool) -> bool:
        """Feed one mic frame in; True means cut Buddy off right now.

        While Buddy is silent the frame teaches the room's noise floor (never his
        own echo). While he speaks, the frame is measured against the adapted
        threshold and has to stay over it for a few frames in a row, so a cough or
        a chair does not take the turn away from him mid-sentence.
        """
        if not speaking:
            self.noise_floor = (
                1 - _NOISE_EMA_ALPHA
            ) * self.noise_floor + _NOISE_EMA_ALPHA * rms
            self._loud_frames = 0
            return False
        threshold = self.threshold()
        if rms < threshold:
            self._loud_frames = 0
            return False
        self._loud_frames += 1
        if self._loud_frames < self.sustain_frames:
            return False
        self._loud_frames = 0
        logger.info(
            "Local barge-in (rms=%.3f, threshold=%.3f, floor=%.4f) — cutting playback now",
            rms,
            threshold,
            self.noise_floor,
        )
        return True
