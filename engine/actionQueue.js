export function createActionQueue({ initial } = {}) {
  const queue = Array.isArray(initial) ? initial : [];

  const enqueue = (action, payload = {}) => {
    if (typeof action !== "string" || !action) throw new Error("Action name is required.");
    queue.push({ action, payload });
  };

  const enqueueRaw = (value) => {
    queue.push(value);
  };

  const drain = () => {
    const drained = queue.slice();
    queue.length = 0;
    return drained;
  };

  const size = () => queue.length;

  const clear = () => {
    queue.length = 0;
  };

  return {
    enqueue,
    enqueueRaw,
    drain,
    size,
    clear
  };
}
