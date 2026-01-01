// =====================
// FILE: public/js/input.js
// =====================
import { ACTIONS, bindToken } from "./keybinds.js";

export class Input {
  constructor(canvas, getBinds, onAction) {
    this.canvas = canvas;
    this.getBinds = getBinds;
    this.onAction = onAction || (() => {});
    this.keys = Object.create(null);
    this.cursor = { x: 0, y: 0, has: false };
    this.logicalSize = { width: null, height: null };
    this.view = null;
  }

  setOnAction(fn) { this.onAction = fn || (() => {}); }

  snapshot() {
    return {
      move: this.getMove(),
      cursor: { x: this.cursor.x, y: this.cursor.y, has: this.cursor.has }
    };
  }

  reset() {
    this.keys = Object.create(null);
  }

  setLogicalSize(width, height) {
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      this.logicalSize = { width: null, height: null };
      return;
    }
    this.logicalSize = { width: w, height: h };
  }

  setView(view) {
    if (!view || typeof view !== "object") {
      this.view = null;
      return;
    }
    this.view = { ...view };
  }

  _getLogicalSize() {
    const width = this.logicalSize?.width;
    const height = this.logicalSize?.height;
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
    return {
      width: 1,
      height: 1
    };
  }

  _getViewRect(rect) {
    const candidate = this.view;
    const rectLeft = Number.isFinite(rect?.left) ? rect.left : 0;
    const rectTop = Number.isFinite(rect?.top) ? rect.top : 0;
    const rectWidth = Number.isFinite(rect?.width) && rect.width > 0 ? rect.width : 1;
    const rectHeight = Number.isFinite(rect?.height) && rect.height > 0 ? rect.height : 1;
    const { width, height } = this._getLogicalSize();
    const viewW = (candidate && Number.isFinite(candidate.width) && candidate.width > 0) ? candidate.width : rectWidth;
    const viewH = (candidate && Number.isFinite(candidate.height) && candidate.height > 0) ? candidate.height : rectHeight;
    const viewX = rectLeft + ((candidate && Number.isFinite(candidate.x)) ? candidate.x : 0);
    const viewY = rectTop + ((candidate && Number.isFinite(candidate.y)) ? candidate.y : 0);
    return { viewW, viewH, viewX, viewY };
  }

  mapClientToLogical(clientX, clientY) {
    const rect = this.canvas?.getBoundingClientRect?.();
    const { width, height } = this._getLogicalSize();
    const { viewW, viewH, viewX, viewY } = this._getViewRect(rect);
    const nx = (clientX - viewX) / Math.max(1, viewW);
    const ny = (clientY - viewY) / Math.max(1, viewH);
    return {
      x: nx * width,
      y: ny * height
    };
  }

  // Treat any UI interaction as “hands off” for the game input layer.
  _isUiTarget(t) {
    if (!t) return false;
    if (t.isContentEditable) return true;

    const tag = (t.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (tag === "button" || tag === "a" || tag === "label") return true;

    // Anything inside the menu/over panels should be considered UI.
    if (t.closest && t.closest(".panel")) return true;

    return false;
  }

  install() {
    // --- Cursor mapping: DOM client coords -> canvas internal pixel coords ---
    const updateCursor = (e) => {
      const mapped = this.mapClientToLogical(e.clientX, e.clientY);
      this.cursor.x = mapped.x;
      this.cursor.y = mapped.y;
      this.cursor.has = true;
    };

    // Track cursor for teleport, etc. Do not block UI.
    window.addEventListener("pointermove", (e) => {
      updateCursor(e);
    }, { passive: true });

    // Mouse buttons (Teleport default etc.)
    window.addEventListener("pointerdown", (e) => {
      // If user is interacting with UI, do not hijack the click.
      if (this._isUiTarget(e.target)) return;

      updateCursor(e);

      const binds = this.getBinds();
      const tok = `m:${e.button}`;

      for (const a of ACTIONS) {
        if (bindToken(binds[a.id]) === tok) {
          // This is gameplay input; prevent browser side-effects (back button, focus change, etc.)
          e.preventDefault();
          this.onAction(a.id, { type: "mouse", button: e.button, event: e });
          break;
        }
      }

      // Keep keyboard focus on the window during gameplay clicks
      window.focus();
    }, { passive: false });

    // Prevent context menu only when right-clicking the canvas (game field)
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Keyboard
    const isTypingField = () => this._isUiTarget(document.activeElement);

    window.addEventListener("keydown", (e) => {
      // If user is typing in an input/select/etc, do not hijack keystrokes.
      if (isTypingField() || this._isUiTarget(e.target)) return;

      this.keys[e.code] = true;

      const binds = this.getBinds();

      // prevent scroll for movement + any bound key
      const maybePrevent = () => {
        // WASD always
        if (e.code === "KeyW" || e.code === "KeyA" || e.code === "KeyS" || e.code === "KeyD") return true;

        // keys bound to actions
        for (const a of ACTIONS) {
          const b = binds[a.id];
          if (b && b.type === "key" && b.code === e.code) return true;
        }
        return false;
      };

      if (maybePrevent()) e.preventDefault();

      if (!e.repeat) {
        for (const a of ACTIONS) {
          const b = binds[a.id];
          if (b && b.type === "key" && b.code === e.code) {
            this.onAction(a.id, { type: "key", code: e.code, event: e });
            break;
          }
        }
      }
    }, { passive: false });

    window.addEventListener("keyup", (e) => {
      // If focus is in UI, ignore keyup too (prevents odd stuck-state if user alt-tabs into input)
      if (isTypingField() || this._isUiTarget(e.target)) return;
      this.keys[e.code] = false;
    }, { passive: true });
  }

  getMove() {
    let dx = 0, dy = 0;
    if (this.keys.KeyW) dy -= 1;
    if (this.keys.KeyS) dy += 1;
    if (this.keys.KeyA) dx -= 1;
    if (this.keys.KeyD) dx += 1;
    return { dx, dy };
  }
}
