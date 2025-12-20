/**
 * Lightweight event log for assertions and replay.
 */
export class EventLog {
  constructor(clock, { maxSize = null } = {}) {
    this.clock = clock;
    this.events = [];
    this.maxSize = typeof maxSize === "number" && maxSize > 0 ? maxSize : null;
    this.version = 0;
  }

  emit(type, payload = {}, meta = {}) {
    const entry = {
      type,
      payload,
      meta,
      time: this.clock ? this.clock.now() : 0
    };
    this.events.push(entry);
    if (this.maxSize && this.events.length > this.maxSize) {
      const excess = this.events.length - this.maxSize;
      this.events.splice(0, excess);
    }
    this.version += 1;
    return entry;
  }

  snapshot() {
    return this.events.map((e) => ({ ...e, payload: { ...e.payload }, meta: { ...e.meta } }));
  }

  clear() {
    if (this.events.length) {
      this.events.length = 0;
      this.version += 1;
    }
  }
}
