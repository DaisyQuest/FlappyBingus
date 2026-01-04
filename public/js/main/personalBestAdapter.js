export const createPersonalBestUpdater = ({
  elements,
  readLocalBest,
  writeLocalBest,
  computePersonalBestStatus,
  updatePersonalBestElements,
  updatePersonalBestUI
}) => (finalScore, userBestScore) => {
  updatePersonalBestUI({
    finalScore,
    userBestScore,
    elements,
    readLocalBest,
    writeLocalBest,
    computePersonalBestStatus,
    updatePersonalBestElements
  });
};
