"""Signal-level helpers for the robot's audio path.

Kept apart from :mod:`audio_io` because these are pure functions over samples —
no devices, no threads, no state — which makes them the part worth testing on a
laptop, and keeps the device bridge readable.

Barge-in tuning lives here too: the Reachy Mini mic array is echo-cancelled in
hardware, so energy on the mic *while Buddy is speaking* means a real nearby
voice, not the robot hearing itself. That is what lets playback stop the instant
the child speaks rather than waiting ~200-400ms for the server to notice.
"""

from __future__ import annotations

import os
from math import gcd

import numpy as np
from scipy.signal import resample_poly

_DEFAULT_BARGE_RMS_THRESHOLD = 0.045  # normalised 0..1
_DEFAULT_BARGE_SUSTAIN_FRAMES = 3  # consecutive loud frames

# Measured on the device: a sentence spoken near the robot reaches the realtime
# service at ~0.02 RMS, a clean recording of the same sentence at ~0.16. Server VAD
# needs the second number to decide a turn began, so the mic path needs a pre-amp.
DEFAULT_INPUT_GAIN = 6.0


def barge_rms_threshold() -> float:
    """Read the barge-in RMS threshold from the env at call time.

    Read lazily (not at import) so values saved in the robot's ``.env`` — which
    ``main.run()`` loads *after* this module is imported — take effect.
    """
    try:
        return float(os.getenv("MIRRORBUDDY_BARGE_RMS", _DEFAULT_BARGE_RMS_THRESHOLD))
    except (TypeError, ValueError):
        return _DEFAULT_BARGE_RMS_THRESHOLD


def barge_sustain_frames() -> int:
    """Read the barge-in sustain-frame count from the env at call time."""
    try:
        return max(1, int(os.getenv("MIRRORBUDDY_BARGE_FRAMES", _DEFAULT_BARGE_SUSTAIN_FRAMES)))
    except (TypeError, ValueError):
        return _DEFAULT_BARGE_SUSTAIN_FRAMES


def boost(audio: np.ndarray, gain: float) -> np.ndarray:
    """Raise the voice level by compressing the peaks instead of clipping them.

    The robot speaker is already near its hardware maximum, so the only headroom
    left is here. Plain multiplication would slam the peaks against ±1.0 and the
    voice would rasp — unpleasant, and for a child with an auditory processing
    difficulty, unusable.

    ``tanh`` is the valve curve: below the knee it is almost linear, above it it
    bends gently. On speech — few peaks, plenty of body — it sounds markedly louder
    without turning harsh.
    """
    # 0.85 keeps the linear part below the knee of the curve.
    return np.tanh(audio * gain * 0.85).astype(np.float32)


def input_gain() -> float:
    """Read the microphone pre-amp gain from the env at call time.

    Lazy for the same reason as the barge thresholds: ``main.run()`` loads the
    robot's ``.env`` after this module is imported. Values below 1.0 are raised to
    1.0 — nobody sets this field meaning "make the robot deafer".
    """
    try:
        return max(1.0, float(os.getenv("MIRRORBUDDY_INPUT_GAIN", DEFAULT_INPUT_GAIN)))
    except (TypeError, ValueError):
        return DEFAULT_INPUT_GAIN


def amplify_mic(audio: np.ndarray, gain: float) -> np.ndarray:
    """Bring quiet speech up to a level the realtime server's VAD reacts to.

    The Reachy Mini mic array is far quieter than a headset, and Azure server VAD
    judges an absolute level: too soft and no turn ever starts, so Buddy talks and
    then waits forever. Peaks are folded with the same ``tanh`` curve used on the
    speaker so a child shouting into the mic is compressed, not clipped into a rasp.
    """
    if audio.size == 0 or gain <= 1.0:
        return audio
    scaled = boost(audio.astype(np.float32) / 32768.0, gain)
    return (scaled * 32767.0).astype(np.int16)


def resample(audio: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    """Low-latency polyphase resampling (faster + cleaner than FFT resample)."""
    if src_rate == dst_rate or audio.size == 0:
        return audio
    g = gcd(src_rate, dst_rate)
    up = dst_rate // g
    down = src_rate // g
    return resample_poly(audio, up, down)
