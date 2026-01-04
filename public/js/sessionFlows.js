export function createSessionFlows({
  apiSync,
  apiRegister,
  apiSetKeybinds,
  setMenuSubtitle,
  formatWorldwideRuns,
  net,
  setNetUser,
  mergeTrailCatalog,
  syncUnlockablesCatalog,
  syncIconCatalog,
  syncPipeTextureCatalog,
  applyAchievementsPayload,
  normalizeAchievementState,
  ACHIEVEMENTS,
  mergeBinds,
  DEFAULT_KEYBINDS,
  updateSkillSettings,
  setUserHint,
  refreshTrailMenu,
  applyIconSelection,
  normalizePipeTextureMode,
  writePipeTextureModeCookie,
  refreshPipeTextureMenu,
  applyPipeTextureSelection,
  syncMenuProfileBindingsFromState,
  renderHighscoresUI,
  renderAchievements,
  renderBindUI,
  refreshBootUI,
  playerIcons,
  getPlayerIcons,
  getCurrentIconId,
  getCurrentPipeTextureId,
  getCurrentPipeTextureMode,
  setCurrentPipeTextureMode,
  setBinds,
  getSkillSettings,
  usernameInput,
  userHint
}) {
  const resolvePlayerIcons = () => (typeof getPlayerIcons === "function" ? getPlayerIcons() : playerIcons);

  function selectIconCatalog({ userIcons, cachedIcons }) {
    const firstNonEmpty = [userIcons, cachedIcons].find(
      (icons) => Array.isArray(icons) && icons.length
    );
    if (firstNonEmpty) return firstNonEmpty;
    if (Array.isArray(userIcons)) return userIcons;
    if (Array.isArray(cachedIcons)) return cachedIcons;
    return [];
  }

  async function refreshProfileAndHighscores({ keepUserOnFailure = false } = {}) {
    const sync = await apiSync?.(20);
    if (!sync?.ok) {
      net.online = false;
      if (!keepUserOnFailure) {
        setNetUser(null);
      }
      net.trails = [];
      syncUnlockablesCatalog({ trails: net.trails });
      syncIconCatalog(
        selectIconCatalog({
          cachedIcons: net.icons
        })
      );
      net.achievements = { definitions: ACHIEVEMENTS, state: normalizeAchievementState() };
      net.highscores = [];
    } else {
      net.online = true;
      setNetUser(sync.user || null);
      net.trails = mergeTrailCatalog(sync.trails, { current: net.trails });
      syncUnlockablesCatalog({ trails: net.trails });
      syncIconCatalog(
        selectIconCatalog({
          userIcons: sync.icons,
          cachedIcons: net.icons
        })
      );
      syncPipeTextureCatalog(sync.pipeTextures || net.pipeTextures);
      applyAchievementsPayload(sync.achievements || { definitions: ACHIEVEMENTS, state: sync.user?.achievements });
      if (net.user?.keybinds) setBinds(mergeBinds(DEFAULT_KEYBINDS, net.user.keybinds));
      if (net.user?.settings) await updateSkillSettings(net.user.settings, { persist: false });
      net.highscores = sync.highscores || [];
    }

    const statsTotal = sync?.stats?.totalRuns;
    if (Number.isFinite(statsTotal) && setMenuSubtitle) {
      setMenuSubtitle(formatWorldwideRuns(statsTotal));
    }

    setUserHint();
    const { selected, best } = refreshTrailMenu();
    const iconId = applyIconSelection(
      net.user?.selectedIcon || getCurrentIconId(),
      resolvePlayerIcons()
    );
    const nextPipeTextureMode = normalizePipeTextureMode(net.user?.pipeTextureMode || getCurrentPipeTextureMode());
    setCurrentPipeTextureMode(nextPipeTextureMode);
    writePipeTextureModeCookie(nextPipeTextureMode);
    const pipeTextureId = net.user?.selectedPipeTexture || getCurrentPipeTextureId();
    const { selected: pipeSelected } = refreshPipeTextureMenu(pipeTextureId);
    applyPipeTextureSelection(pipeSelected || pipeTextureId, net.pipeTextures);
    syncMenuProfileBindingsFromState({
      fallbackTrailId: selected,
      fallbackIconId: iconId,
      fallbackPipeTextureId: pipeSelected || pipeTextureId,
      bestScoreFallback: best
    });
    renderHighscoresUI();
    renderAchievements();
    renderBindUI();
    refreshBootUI();
  }

  async function recoverSession() {
    await refreshProfileAndHighscores({ keepUserOnFailure: true });
    return Boolean(net.user);
  }

  async function registerUser() {
    const username = usernameInput.value.trim();
    const res = await apiRegister(username);
    if (!res) {
      net.online = false;
      setUserHint();
      refreshBootUI();
      return;
    }
    if (!res.ok) {
      net.online = Boolean(res?.status && res.status < 500);
      setUserHint();
      if (userHint && res?.error === "invalid_username") {
        userHint.className = "hint bad";
        userHint.textContent = "Please enter a valid username.";
      }
      refreshBootUI();
      return;
    }
    if (res.ok) {
      net.online = true;
      setNetUser(res.user);
      net.trails = mergeTrailCatalog(res.trails, { current: net.trails });
      syncUnlockablesCatalog({ trails: net.trails });
      syncUnlockablesCatalog({ trails: net.trails });
      syncIconCatalog(res.icons || net.icons);
      syncPipeTextureCatalog(res.pipeTextures || net.pipeTextures);
      applyAchievementsPayload(res.achievements || { definitions: ACHIEVEMENTS, state: res.user?.achievements });

      const mergedBinds = mergeBinds(DEFAULT_KEYBINDS, net.user.keybinds);
      setBinds(mergedBinds);
      usernameInput.value = net.user.username;
      await updateSkillSettings(res.user?.settings || getSkillSettings(), { persist: false });

      await apiSetKeybinds(mergedBinds);
      await refreshProfileAndHighscores();
    }
  }

  return { refreshProfileAndHighscores, recoverSession, registerUser };
}
