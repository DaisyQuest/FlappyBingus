// =============================
// FILE: public/js/rebindControls.js
// =============================
export function renderBindUI({
  bindWrap,
  binds,
  actions,
  listeningActionId = null,
  humanizeBind
} = {}) {
  if (!bindWrap) return;
  bindWrap.innerHTML = "";
  actions.forEach((action) => {
    const row = document.createElement("div");
    row.className = "bindRow" + (listeningActionId === action.id ? " listen" : "");
    row.dataset.action = action.id;

    const name = document.createElement("div");
    name.className = "bindName";
    name.textContent = action.label;

    const key = document.createElement("div");
    key.className = "bindKey kbd";
    key.textContent = humanizeBind ? humanizeBind(binds[action.id]) : String(binds[action.id]);

    const btn = document.createElement("button");
    btn.className = "bindBtn";
    btn.textContent = (listeningActionId === action.id) ? "Listening…" : "Rebind";
    btn.disabled = (listeningActionId !== null);
    btn.dataset.action = action.id;

    row.append(name, key, btn);
    bindWrap.append(row);
  });
}

export function createRebindController({
  bindWrap,
  bindHint,
  actions,
  getBinds,
  setBinds,
  getNetUser,
  apiSetKeybinds,
  saveGuestBinds,
  setNetUser,
  applyRebindWithSwap,
  humanizeBind,
  keyEventToBind,
  pointerEventToBind,
  renderBindUI: renderBindUIFn = renderBindUI
} = {}) {
  let rebindActive = null;
  let rebindCleanup = null;

  const updateHint = (className, text) => {
    if (!bindHint) return;
    bindHint.className = className;
    bindHint.textContent = text;
  };

  const reset = () => {
    if (rebindCleanup) rebindCleanup();
    rebindCleanup = null;
    rebindActive = null;
  };

  const finish = async (newBind, cancel = false) => {
    if (!rebindActive) return;

    if (rebindCleanup) rebindCleanup();
    rebindCleanup = null;

    const action = rebindActive;
    rebindActive = null;

    if (cancel) {
      updateHint("hint", "Rebind cancelled.");
      renderBindUIFn({ bindWrap, binds: getBinds(), actions, listeningActionId: null, humanizeBind });
      return;
    }

    const before = getBinds();
    const { binds: updated, swappedWith } = applyRebindWithSwap(before, action, newBind);
    setBinds(updated);

    if (getNetUser?.()) {
      const res = await apiSetKeybinds(updated);
      if (res && res.ok) {
        if (res.user) setNetUser?.(res.user);
      } else {
        setBinds(before);
        updateHint("hint bad", "Server rejected keybinds (conflict/invalid). Reverted.");
        renderBindUIFn({ bindWrap, binds: before, actions, listeningActionId: null, humanizeBind });
        return;
      }
    } else if (saveGuestBinds) {
      saveGuestBinds(updated);
    }

    if (swappedWith) {
      const swappedLabel = actions.find((entry) => entry.id === swappedWith)?.label || swappedWith;
      updateHint("hint warn", `That input was already in use; swapped bindings with ${swappedLabel}.`);
    } else {
      updateHint("hint good", "Keybind updated.");
    }

    renderBindUIFn({ bindWrap, binds: getBinds(), actions, listeningActionId: null, humanizeBind });
  };

  const beginRebind = (actionId) => {
    if (rebindActive) return;
    rebindActive = actionId;
    const actionLabel = actions.find((entry) => entry.id === actionId)?.label || actionId;
    updateHint("hint good", `Rebinding ${actionLabel}… press a key or click a mouse button (Esc cancels).`);
    renderBindUIFn({ bindWrap, binds: getBinds(), actions, listeningActionId: rebindActive, humanizeBind });

    const onKeyDownCapture = (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === "Escape") finish(null, true);
      else finish(keyEventToBind(event), false);
    };

    const onPointerDownCapture = (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      finish(pointerEventToBind(event), false);
    };

    window.addEventListener("keydown", onKeyDownCapture, { capture: true });
    window.addEventListener("pointerdown", onPointerDownCapture, { capture: true });

    rebindCleanup = () => {
      window.removeEventListener("keydown", onKeyDownCapture, { capture: true });
      window.removeEventListener("pointerdown", onPointerDownCapture, { capture: true });
    };
  };

  const handleClick = (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const actionId = button.dataset.action;
    if (!actionId) return;
    beginRebind(actionId);
  };

  return {
    beginRebind,
    handleClick,
    reset,
    isActive: () => Boolean(rebindActive)
  };
}
