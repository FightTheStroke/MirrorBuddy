export interface SnapshotFrame {
  event: string;
  data: string;
}

/** Incremental SSE framing; server retry hints never override the recovery budget. */
export function createSseParser(consume: (frame: SnapshotFrame) => void) {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let line = '';
  let event = '';
  let data: string[] = [];
  let size = 0;
  let carriageReturn = false;
  const finishLine = () => {
    if (!line) {
      if (data.length) consume({ event: event || 'message', data: data.join('\n') });
      event = '';
      data = [];
      size = 0;
    } else if (!line.startsWith(':')) {
      const colon = line.indexOf(':');
      const key = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (key === 'event') event = value;
      if (key === 'data') data.push(value);
    }
    line = '';
  };
  const text = (value: string) => {
    for (const character of value) {
      if (carriageReturn && character === '\n') {
        carriageReturn = false;
        continue;
      }
      carriageReturn = character === '\r';
      const codePoint = character.codePointAt(0)!;
      size += codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4;
      if (size > 2 * 1024 * 1024) throw new Error('Mindmap SSE frame exceeds 2 MiB');
      if (character === '\r' || character === '\n') finishLine();
      else line += character;
    }
  };
  return {
    push(chunk: Uint8Array) {
      text(decoder.decode(chunk, { stream: true }));
    },
    finish() {
      text(decoder.decode());
      if (line || data.length) throw new Error('Incomplete mindmap SSE frame');
    },
  };
}
