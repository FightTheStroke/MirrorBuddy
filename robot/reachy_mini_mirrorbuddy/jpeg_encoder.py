"""Encode a raw BGR camera frame to JPEG.

The SDK's ``camera.read_jpeg()`` builds its encoder pipeline and pushes the
buffer before the pipeline has actually reached PLAYING, so on the wireless
unit it always returns ``None`` even though ``read()`` delivers frames. We
therefore encode the frame ourselves, pushing a properly timestamped buffer
and signalling EOS so ``jpegenc`` flushes the picture.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_JPEG_QUALITY = 80
_PULL_TIMEOUT_NS = 5_000_000_000  # 5s


def encode_jpeg(frame, max_width: int | None = None, quality: int = _JPEG_QUALITY) -> bytes | None:
    """Encode a ``(h, w, 3)`` BGR array to JPEG bytes, or None on failure."""
    try:
        import gi

        gi.require_version("Gst", "1.0")
        from gi.repository import Gst
    except Exception as e:  # pragma: no cover - only on non-robot hosts
        logger.warning("GStreamer unavailable, cannot encode frame: %s", e)
        return None

    if not Gst.is_initialized():
        Gst.init(None)

    try:
        height, width = frame.shape[:2]
    except Exception:
        logger.warning("frame has no usable shape")
        return None

    pipeline = None
    try:
        scale = ""
        if max_width and width > max_width:
            out_w = max_width - (max_width % 2)
            out_h = int(height * out_w / width)
            out_h -= out_h % 2
            scale = f"! videoscale ! video/x-raw,width={out_w},height={out_h} "
        pipeline = Gst.parse_launch(
            "appsrc name=src is-live=false format=time "
            f"caps=video/x-raw,format=BGR,width={width},height={height},framerate=1/1 "
            f"! videoconvert {scale}"
            f"! jpegenc quality={quality} ! appsink name=sink sync=false"
        )
        src = pipeline.get_by_name("src")
        sink = pipeline.get_by_name("sink")
        pipeline.set_state(Gst.State.PLAYING)

        buffer = Gst.Buffer.new_wrapped(frame.tobytes())
        buffer.pts = 0
        buffer.duration = Gst.SECOND
        src.emit("push-buffer", buffer)
        src.emit("end-of-stream")

        sample = sink.emit("try-pull-sample", _PULL_TIMEOUT_NS)
        if sample is None:
            logger.warning("jpeg encoder produced no sample")
            return None
        buf = sample.get_buffer()
        ok, info = buf.map(Gst.MapFlags.READ)
        if not ok:
            logger.warning("could not map encoded jpeg buffer")
            return None
        try:
            return bytes(info.data)
        finally:
            buf.unmap(info)
    except Exception as e:
        logger.warning("jpeg encoding failed: %s", e)
        return None
    finally:
        if pipeline is not None:
            try:
                pipeline.set_state(Gst.State.NULL)
            except Exception:  # pragma: no cover - best effort cleanup
                pass
