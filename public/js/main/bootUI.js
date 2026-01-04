export const buildBootStatus = ({ boot, net }) => {
  const ready = Boolean(boot?.imgReady && boot?.cfgReady);
  if (!ready) {
    return {
      ready: false,
      pillClass: "neutral",
      text: "Loading…"
    };
  }
  const playerState = boot?.imgOk ? "player ok" : "player fallback";
  const configState = boot?.cfgOk ? boot?.cfgSrc : "defaults";
  const userState = net?.online ? (net?.user ? `user: ${net.user.username}` : "guest") : "offline";
  return {
    ready: true,
    pillClass: "ok",
    text: `${playerState} • ${configState} • ${userState}`
  };
};

export const refreshBootUI = ({ boot, net, elements }) => {
  const { startBtn, tutorialBtn, bootPill, bootText } = elements;
  const status = buildBootStatus({ boot, net });
  startBtn.disabled = !status.ready;
  if (tutorialBtn) tutorialBtn.disabled = !status.ready;

  bootPill.classList.remove("ok", "bad", "neutral");
  bootPill.classList.add(status.pillClass);
  bootText.textContent = status.text;
};
