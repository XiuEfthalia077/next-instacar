/**
 * Concurrency & Mutex Utilities
 *
 * Implements in-process row-level serialization for high-contention actions
 * such as vehicle booking reservation to prevent race conditions (TOCTOU).
 */

class KeyedMutex {
  private queue = new Map<string, Promise<void>>();

  /**
   * Acquires an exclusive lock for the given key (e.g. `car:14`).
   * Concurrent callers for the same key await their turn sequentially.
   * Returns a release function that MUST be invoked in a `finally` block.
   */
  async lock(key: string): Promise<() => void> {
    while (this.queue.has(key)) {
      try {
        await this.queue.get(key);
      } catch {
        // Ignore previous errors in the lock chain
      }
    }

    let releaseLock: () => void;
    const promise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.queue.set(key, promise);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (this.queue.get(key) === promise) {
        this.queue.delete(key);
      }
      releaseLock();
    };
  }
}

export const bookingMutex = new KeyedMutex();
