/**
 * Lightweight event log for assertions and replay.
 */
export class EventLog {
  constructor(clock, { maxSize = null, adapters = [], context } = {}) {
    this.clock = clock;
    this.events = [];
    this.maxSize = typeof maxSize === "number" && maxSize > 0 ? maxSize : null;
    this.adapters = Array.isArray(adapters) ? adapters : [];
    this.context = typeof context === "function" ? context : null;
    this.version = 0;
  }

  _pushEntry(entry) {
    this.events.push(entry);
    if (this.maxSize && this.events.length > this.maxSize) {
      const excess = this.events.length - this.maxSize;
      this.events.splice(0, excess);
    }
    this.version += 1;
  }

  emit(type, payload = {}, meta = {}) {
    const entry = {
      type,
      payload,
      meta,
      time: this.clock ? this.clock.now() : 0
    };
    this._pushEntry(entry);

    if (this.adapters.length) {
      const context = this.context ? this.context() : undefined;
      for (const adapter of this.adapters) {
        const derivedEntries = adapter(entry, context);
        if (!derivedEntries || !derivedEntries.length) continue;
        for (const derived of derivedEntries) {
          if (!derived?.type) continue;
          this._pushEntry({
            type: derived.type,
            payload: derived.payload ?? {},
            meta: derived.meta ?? {},
            time: typeof derived.time === "number" ? derived.time : entry.time
          });
        }
      }
    }

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
