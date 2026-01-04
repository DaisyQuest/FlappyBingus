export function createSessionFlows({
  apiGetMe,
  apiGetIconRegistry,
  apiGetHighscores,
  apiGetStats,
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
  getCurrentIconId,
  getCurrentPipeTextureId,
  getCurrentPipeTextureMode,
  setCurrentPipeTextureMode,
  setBinds,
  getSkillSettings,
  usernameInput,
  userHint
}) {
  function selectIconCatalog({ userIcons, registryIcons, cachedIcons }) {
    const firstNonEmpty = [userIcons, registryIcons, cachedIcons].find(
      (icons) => Array.isArray(icons) && icons.length
    );
    if (firstNonEmpty) return firstNonEmpty;
    if (Array.isArray(registryIcons)) return registryIcons;
    if (Array.isArray(userIcons)) return userIcons;
    if (Array.isArray(cachedIcons)) return cachedIcons;
    return [];
  }

  async function loadIconRegistry() {
    if (typeof apiGetIconRegistry !== "function") return null;
    const registry = await apiGetIconRegistry();
    if (registry?.ok && Array.isArray(registry.icons)) {
      return registry.icons;
    }
    return null;
  }

  async function refreshProfileAndHighscores({ keepUserOnFailure = false } = {}) {
    const registryIcons = await loadIconRegistry();
    const me = await apiGetMe();
    if (!me?.ok) {
      net.online = false;
      if (!keepUserOnFailure) {
        setNetUser(null);
      }
      net.trails = [];
      syncUnlockablesCatalog({ trails: net.trails });
      syncIconCatalog(
        selectIconCatalog({
          registryIcons,
          cachedIcons: net.icons
        })
      );
      net.achievements = { definitions: ACHIEVEMENTS, state: normalizeAchievementState() };
    } else {
      net.online = true;
      setNetUser(me.user || null);
      net.trails = mergeTrailCatalog(me.trails, { current: net.trails });
      syncUnlockablesCatalog({ trails: net.trails });
      syncIconCatalog(
        selectIconCatalog({
          userIcons: me.icons,
          registryIcons,
          cachedIcons: net.icons
        })
      );
      syncPipeTextureCatalog(me.pipeTextures || net.pipeTextures);
      applyAchievementsPayload(me.achievements || { definitions: ACHIEVEMENTS, state: me.user?.achievements });
      if (net.user?.keybinds) setBinds(mergeBinds(DEFAULT_KEYBINDS, net.user.keybinds));
      if (net.user?.settings) await updateSkillSettings(net.user.settings, { persist: false });
    }

    const hs = await apiGetHighscores(20);
    if (!hs?.ok) {
      net.online = false;
      net.highscores = [];
    } else {
      net.online = true;
      net.highscores = hs.highscores || [];
    }

    const stats = await apiGetStats();
    if (stats?.ok && setMenuSubtitle) {
      setMenuSubtitle(formatWorldwideRuns(stats.totalRuns));
    }

    setUserHint();
    const { selected, best } = refreshTrailMenu();
    const iconId = applyIconSelection(net.user?.selectedIcon || getCurrentIconId(), playerIcons);
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
