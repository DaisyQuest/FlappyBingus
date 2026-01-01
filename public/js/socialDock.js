export function initSocialDock({
  discordButton,
  donateButton,
  discordPopover,
  donatePopover,
  dock,
  document: docOverride
} = {}) {
  if (!discordButton || !donateButton || !discordPopover || !donatePopover) return;

  const doc = docOverride || discordButton.ownerDocument || window.document;
  const dockEl = dock
    || discordButton.closest(".social-dock")
    || donateButton.closest(".social-dock");

  const setExpanded = (button, popover, expanded) => {
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
    popover.hidden = !expanded;
    popover.setAttribute("aria-hidden", expanded ? "false" : "true");
  };

  const hideAll = () => {
    setExpanded(discordButton, discordPopover, false);
    setExpanded(donateButton, donatePopover, false);
  };

  hideAll();

  discordButton.addEventListener("click", () => {
    const shouldOpen = discordPopover.hidden;
    setExpanded(discordButton, discordPopover, shouldOpen);
    setExpanded(donateButton, donatePopover, false);
  });

  donateButton.addEventListener("click", () => {
    const shouldOpen = donatePopover.hidden;
    setExpanded(donateButton, donatePopover, shouldOpen);
    setExpanded(discordButton, discordPopover, false);
  });

  doc.addEventListener("click", (event) => {
    if (!dockEl) return;
    if (dockEl.contains(event.target)) return;
    hideAll();
  });

  doc.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    hideAll();
  });
}
