export interface VoiceTimingMarks {
  connectStartMs: number | null;
  dataChannelOpenMs: number | null;
  sessionUpdatedMs: number | null;
}

export interface VoiceTimingDurations {
  connectToDataChannelOpenMs: number | null;
  connectToSessionUpdatedMs: number | null;
  dataChannelOpenToSessionUpdatedMs: number | null;
}

function durationMs(from: number | null, to: number | null): number | null {
  if (from === null || to === null) return null;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.max(0, Math.round(to - from));
}

export function computeVoiceTimingDurations(marks: VoiceTimingMarks): VoiceTimingDurations {
  return {
    connectToDataChannelOpenMs: durationMs(marks.connectStartMs, marks.dataChannelOpenMs),
    connectToSessionUpdatedMs: durationMs(marks.connectStartMs, marks.sessionUpdatedMs),
    dataChannelOpenToSessionUpdatedMs: durationMs(marks.dataChannelOpenMs, marks.sessionUpdatedMs),
  };
}
