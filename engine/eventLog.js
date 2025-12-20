/**
 * Lightweight event log for assertions and replay.
 */
export class EventLog {
  constructor(clock) {
    this.clock = clock;
    this.events = [];
  }

  emit(type, payload = {}, meta = {}) {
    const entry = {
      type,
      payload,
      meta,
      time: this.clock ? this.clock.now() : 0
    };
    this.events.push(entry);
    return entry;
  }

  snapshot() {
    return this.events.map((e) => ({ ...e, payload: { ...e.payload }, meta: { ...e.meta } }));
  }

  clear() {
    this.events.length = 0;
  }
}
