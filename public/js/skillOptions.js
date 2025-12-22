// =====================
// FILE: public/js/skillOptions.js
// =====================

/**
 * Apply a pressed/selected state to behavior buttons within a container.
 * @param {HTMLElement | null | undefined} container
 * @param {string} value
 */
export function markSkillOptionSelection(container, value) {
  if (!container) return;
  const buttons = container.querySelectorAll(".skill-option");
  buttons.forEach((btn) => {
    const selected = btn.dataset.value === value;
    btn.classList.toggle("selected", selected);
    btn.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

/**
 * Return the behavior value from a click target if it belongs to the container.
 * @param {HTMLElement | null | undefined} container
 * @param {EventTarget | null} target
 * @returns {string | null}
 */
export function readSkillOptionValue(container, target) {
  if (!container || !target) return null;
  const btn = (target instanceof Element) ? target.closest(".skill-option") : null;
  if (!btn || !container.contains(btn)) return null;
  return btn.dataset.value || null;
}

/**
 * Bind click handling for a skill option container.
 * Returns a disposer to remove the listener.
 * @param {HTMLElement | null | undefined} container
 * @param {(value: string) => void} onSelect
 * @returns {() => void}
 */
export function bindSkillOptionGroup(container, onSelect) {
  if (!container || typeof onSelect !== "function") return () => {};
  const handler = (e) => {
    const selected = readSkillOptionValue(container, e.target);
    if (!selected) return;
    onSelect(selected);
  };
  container.addEventListener("click", handler);
  return () => container.removeEventListener("click", handler);
}
