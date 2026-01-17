// ============================================================================
// RING BUFFER - O(1) queue operations for audio chunks
// ============================================================================

/**
 * Fixed-size ring buffer for O(1) enqueue/dequeue operations
 * Used for audio chunk queue to avoid O(n) array shift operations
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private tail: number = 0;
  private _size: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /** Number of items in buffer */
  get size(): number {
    return this._size;
  }

  /** Alias for size (backwards compatibility with array.length) */
  get length(): number {
    return this._size;
  }

  /** Check if buffer is empty */
  isEmpty(): boolean {
    return this._size === 0;
  }

  /** Check if buffer is full */
  isFull(): boolean {
    return this._size === this.capacity;
  }

  /** Add item to end of queue - O(1) */
  push(item: T): boolean {
    if (this.isFull()) {
      return false; // Buffer full, item not added
    }
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this._size++;
    return true;
  }

  /** Remove and return item from front of queue - O(1) */
  shift(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined; // Help GC
    this.head = (this.head + 1) % this.capacity;
    this._size--;
    return item;
  }

  /** Add item to front of queue - O(1) */
  unshift(item: T): boolean {
    if (this.isFull()) {
      return false;
    }
    this.head = (this.head - 1 + this.capacity) % this.capacity;
    this.buffer[this.head] = item;
    this._size++;
    return true;
  }

  /** Peek at front item without removing - O(1) */
  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.buffer[this.head];
  }

  /** Clear all items */
  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this._size = 0;
  }
}
