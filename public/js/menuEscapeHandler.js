// =====================
// FILE: public/js/menuEscapeHandler.js
// Shared escape-key handling for cosmetic overlays.
// =====================

function isOverlayOpen(overlay) {
  if (!overlay || !overlay.classList) return false;
  return !overlay.classList.contains("hidden");
}

export function handleMenuEscape(event, {
  trailOverlay,
  iconOverlay,
  pipeTextureOverlay,
  closeTrailMenu,
  closeIconMenu,
  closePipeTextureMenu
} = {}) {
  if (!event || event.code !== "Escape") return false;

  if (isOverlayOpen(trailOverlay)) {
    event.preventDefault?.();
    closeTrailMenu?.();
    return true;
  }

  if (isOverlayOpen(iconOverlay)) {
    event.preventDefault?.();
    closeIconMenu?.();
    return true;
  }

  if (isOverlayOpen(pipeTextureOverlay)) {
    event.preventDefault?.();
    closePipeTextureMenu?.();
    return true;
  }

  return false;
}

export const __testables = { isOverlayOpen };
