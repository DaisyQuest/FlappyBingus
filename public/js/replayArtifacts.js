export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export function createBestRunUploader({
  getActiveRun,
  getUser,
  cloneReplayRun,
  maybeUploadBestRun,
  uploadBestRun,
  setStatus
} = {}) {
  let lastUploadedBestSeed = null;
  let lastUploadedBestScore = -Infinity;

  const setStatusSafe = (payload) => {
    if (typeof setStatus !== "function") return;
    setStatus(payload);
  };

  const logger = (msg) => {
    if (!msg) return;
    setStatusSafe({ className: "hint", text: msg });
  };

  return async function uploadBestRunArtifacts(finalScore, runStats) {
    const activeRun = typeof getActiveRun === "function" ? getActiveRun() : null;
    const user = typeof getUser === "function" ? getUser() : null;
    if (!user || !activeRun?.ended) return;

    const bestScore = user?.bestScore ?? 0;
    if (finalScore < bestScore) return;
    if (lastUploadedBestSeed === activeRun.seed && lastUploadedBestScore >= bestScore) return;

    const runForUpload = typeof cloneReplayRun === "function" ? cloneReplayRun(activeRun) : activeRun;
    if (!runForUpload?.ticks?.length) return;
    if (typeof maybeUploadBestRun !== "function") return;

    const uploaded = await maybeUploadBestRun({
      activeRun: runForUpload,
      finalScore,
      runStats,
      bestScore,
      upload: uploadBestRun,
      logger
    });

    if (uploaded) {
      lastUploadedBestSeed = activeRun.seed;
      lastUploadedBestScore = bestScore;
      setStatusSafe({ className: "hint good", text: "Best run saved to server." });
    }
  };
}
