export function updatePersonalBestUI({
  finalScore,
  userBestScore,
  elements,
  readLocalBest,
  writeLocalBest,
  computePersonalBestStatus,
  updatePersonalBestElements
}) {
  if (!elements?.personalBestEl) return null;

  const localBest = readLocalBest?.();
  const personalBestStatus = computePersonalBestStatus?.(finalScore, userBestScore, localBest);

  if (personalBestStatus?.shouldPersistLocalBest) {
    writeLocalBest?.(personalBestStatus.score);
  }

  const refreshedLocalBest = readLocalBest?.();
  const refreshedStatus = computePersonalBestStatus?.(finalScore, userBestScore, refreshedLocalBest);

  updatePersonalBestElements?.(
    {
      personalBestEl: elements.personalBestEl,
      badgeEl: elements.badgeEl,
      statusEl: elements.statusEl
    },
    refreshedStatus
  );

  return refreshedStatus ?? null;
}
