export function createThemeRegistry(initialThemes = []) {
  const themes = new Map();

  const addTheme = (theme) => {
    if (!theme || typeof theme.id !== "string" || !theme.id) {
      throw new Error("Theme id is required.");
    }
    themes.set(theme.id, { ...theme });
  };

  const getTheme = (id) => themes.get(id) || null;

  const hasTheme = (id) => themes.has(id);

  const listThemes = () => Array.from(themes.values());

  const removeTheme = (id) => themes.delete(id);

  for (const theme of initialThemes) {
    addTheme(theme);
  }

  return {
    addTheme,
    getTheme,
    hasTheme,
    listThemes,
    removeTheme
  };
}
