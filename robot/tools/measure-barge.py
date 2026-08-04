#!/usr/bin/env python3
"""Measure what the robot's microphone actually hears, and whether it would stop.

The barge-in threshold is the difference between a child saying "zitto" and being
talked over anyway, and it depends on the room and on how loudly that particular
child speaks — neither of which can be guessed from a laptop. The robot's own
speaker cannot stand in for the child either: the hardware echo cancellation
removes it completely (measured on the unit: 0.0058 RMS while the speaker plays
speech, 0.0069 in silence), which is exactly why Buddy never interrupts himself.
So it takes a real voice.

Run it on the robot, speak normally from where the child sits, read the numbers:

    ssh pollen@<robot> '/venvs/apps_venv/bin/python -' < measure-barge.py

If a normal sentence never shows OVER, lower the ceiling in the robot's .env
(MIRRORBUDDY_BARGE_RMS) and restart the app.
"""

from __future__ import annotations

import time

import numpy as np

from reachy_mini import ReachyMini
from reachy_mini_mirrorbuddy.audio_io import AudioIO
from reachy_mini_mirrorbuddy.barge_detector import BargeDetector
from reachy_mini_mirrorbuddy.config import Config

CALIBRATE_S = 3.0
LISTEN_S = 20.0


def _read(robot) -> float | None:
    """One microphone frame as RMS in 0..1, or None if nothing is queued."""
    sample = robot.media.get_audio_sample()
    if sample is None:
        time.sleep(0.005)
        return None
    audio = (
        sample
        if isinstance(sample, np.ndarray)
        else np.frombuffer(sample, dtype=np.int16)
    )
    if audio.ndim == 2:
        audio = audio.mean(axis=1)
    if audio.dtype != np.int16:
        audio = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
    return float(np.sqrt(np.mean((audio.astype(np.float32) / 32768.0) ** 2)))


def main() -> None:
    robot = ReachyMini()
    # Same construction as main.py: the make-up gain scales the ceiling, so measuring
    # at gain 1.0 would report a threshold the running app never uses.
    config = Config()
    io = AudioIO(
        robot=robot,
        on_input_pcm16=lambda _b: None,
        on_local_barge_in=lambda: None,
        barge_rms_threshold=config.BARGE_RMS_THRESHOLD,
        barge_sustain_frames=config.BARGE_SUSTAIN_FRAMES,
        output_gain=config.OUTPUT_GAIN,
    )
    robot.media.start_recording()

    print(f"Calibrating the room — stay quiet for {CALIBRATE_S:.0f}s...")
    ambient_peak = 0.0
    deadline = time.monotonic() + CALIBRATE_S
    while time.monotonic() < deadline:
        rms = _read(robot)
        if rms is not None:
            io.note_mic_frame(rms, speaking=False)
            ambient_peak = max(ambient_peak, rms)

    threshold = io.barge_threshold()
    print(
        f"Noise floor: {io.barge.noise_floor:.4f}   ambient peak: {ambient_peak:.4f}"
        f"   threshold: {threshold:.4f}"
        f"   (ceiling {io.barge.ceiling:.4f} at output gain {config.OUTPUT_GAIN:.1f})"
    )
    print(f"Now speak normally from the child's seat for {LISTEN_S:.0f}s.\n")

    # Ask the production decision itself, pretending Buddy is mid-sentence: a single
    # loud frame is not enough, it takes BARGE_SUSTAIN_FRAMES in a row. Counting bare
    # over-threshold frames would call a transient a success the real robot ignores.
    peak, over, cuts = 0.0, 0, 0
    deadline = time.monotonic() + LISTEN_S
    while time.monotonic() < deadline:
        rms = _read(robot)
        if rms is None:
            continue
        peak = max(peak, rms)
        if rms >= threshold:
            over += 1
        if io.note_mic_frame(rms, speaking=True):
            cuts += 1
            print(f"  CUT  rms={rms:.4f}")
    robot.media.stop_recording()

    print(
        f"\nVoice peak {peak:.4f}, {over} frames over {threshold:.4f}, "
        f"{cuts} sustained cuts ({io.barge.sustain_frames} frames in a row needed)."
    )
    if cuts:
        print("A voice at this level cuts Buddy off. Nothing to change.")
        return
    if over:
        print(
            "Loud frames, but never long enough in a row to count as speech.\n"
            "Speak a full word rather than a syllable, or lower "
            "MIRRORBUDDY_BARGE_FRAMES in the robot's .env."
        )
        return

    # Somewhere between the room and the voice, closer to the room so a tired child
    # still clears it — but never under the ambient peak, or the motors would be
    # interrupting Buddy on the child's behalf all day.
    suggested = max(ambient_peak * 1.3, (ambient_peak + peak) / 2)
    if suggested >= peak:
        print(
            f"This voice ({peak:.4f}) does not stand out from the room ({ambient_peak:.4f}).\n"
            "Move the robot away from noise, or rely on the spoken stop word instead."
        )
        return
    # The setting is scaled by the output gain at startup, so hand back the value
    # that *becomes* the intended threshold rather than the threshold itself.
    setting = suggested / BargeDetector.scale_for_gain(config.OUTPUT_GAIN)
    print(
        "This voice would NOT stop Buddy. In the robot's .env set:\n"
        f"    MIRRORBUDDY_BARGE_RMS={setting:.3f}\n"
        f"(becomes {suggested:.3f} once the {config.OUTPUT_GAIN:.1f}x output gain is applied)\n"
        "then restart the app."
    )


if __name__ == "__main__":
    main()
