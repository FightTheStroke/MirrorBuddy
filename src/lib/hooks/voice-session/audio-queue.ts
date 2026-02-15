export interface AudioChunkQueue {
  clear(): void;
}

export class NoopAudioChunkQueue implements AudioChunkQueue {
  clear(): void {}
}
