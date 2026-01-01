// ===========================
// FILE: public/js/seedControls.js
// ===========================
export function initSeedControls({
  seedInput,
  seedRandomBtn,
  seedHint,
  readSeed,
  writeSeed,
  genRandomSeed
} = {}) {
  if (!seedInput) return { seed: "" };

  const initialSeed = readSeed ? (readSeed() || "") : "";
  seedInput.value = initialSeed;

  if (seedRandomBtn) {
    seedRandomBtn.addEventListener("click", () => {
      if (!genRandomSeed || !writeSeed) return;
      const seed = genRandomSeed();
      seedInput.value = seed;
      writeSeed(seed);
      if (seedHint) {
        seedHint.className = "hint good";
        seedHint.textContent = `Generated seed: ${seed}`;
      }
    });
  }

  seedInput.addEventListener("change", () => {
    if (writeSeed) writeSeed(seedInput.value.trim());
    if (seedHint) {
      seedHint.className = "hint";
      seedHint.textContent = "If two players use the same seed, pipe/orb spawns will match.";
    }
  });

  return { seed: initialSeed };
}
