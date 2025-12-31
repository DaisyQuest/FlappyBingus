export function createActionQueue() {
  let queue = [];

  const enqueue = (action, payload = {}) => {
    if (typeof action !== "string" || !action) throw new Error("Action name is required.");
    queue.push({ action, payload });
  };

  const drain = () => {
    const drained = queue;
    queue = [];
    return drained;
  };

  const size = () => queue.length;

  const clear = () => {
    queue = [];
  };

  return {
    enqueue,
    drain,
    size,
    clear
  };
}
