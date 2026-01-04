export const createVolumeController = ({
  elements,
  defaults,
  readAudioSettings,
  writeAudioSettings,
  applyVolumeFromUI,
  primeVolumeUI,
  setMusicVolume,
  setSfxVolume,
  setMuted,
  game
}) => {
  const { musicSlider, sfxSlider, muteToggle } = elements;

  const handleVolumeChange = () => {
    applyVolumeFromUI({
      musicSlider,
      sfxSlider,
      muteToggle,
      defaults,
      setMusicVolume,
      setSfxVolume,
      setMuted,
      writeAudioSettings,
      game
    });
  };

  const primeVolumeControls = () => {
    primeVolumeUI({
      musicSlider,
      sfxSlider,
      muteToggle,
      readAudioSettings,
      defaults
    });
    handleVolumeChange();
  };

  const bindVolumeControls = () => {
    const handler = () => handleVolumeChange();
    musicSlider?.addEventListener("input", handler);
    sfxSlider?.addEventListener("input", handler);
    muteToggle?.addEventListener("change", handler);
    return handler;
  };

  return {
    bindVolumeControls,
    handleVolumeChange,
    primeVolumeControls
  };
};
