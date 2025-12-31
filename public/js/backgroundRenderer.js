import { createBackgroundLayer, drawBackgroundLayer, initBackgroundLayer, updateBackgroundDots } from "./backgroundLayer.js";
import { createProceduralBackground } from "./backgroundModes.js";

export function createBackgroundRenderer({
  mode,
  width = 0,
  height = 0,
  rand = Math.random,
  createVideoElement
} = {}) {
  const layer = createBackgroundLayer();
  let currentMode = mode;
  let videoElement = null;

  const ensureMode = ({ width: w, height: h, rand: rng } = {}) => {
    if (!currentMode) {
      currentMode = createProceduralBackground({ width: w, height: h, rand: rng });
    }
    return currentMode;
  };

  const ensureVideoElement = () => {
    if (currentMode?.type !== "video") return null;
    if (videoElement) return videoElement;
    if (typeof createVideoElement === "function") {
      videoElement = createVideoElement();
    } else if (typeof document !== "undefined") {
      videoElement = document.createElement("video");
    }
    if (!videoElement) return null;
    videoElement.loop = !!currentMode.loop;
    videoElement.muted = !!currentMode.muted;
    videoElement.playsInline = true;
    if (currentMode.src) {
      videoElement.src = currentMode.src;
    }
    return videoElement;
  };

  const setMode = (nextMode) => {
    if (!nextMode || typeof nextMode.type !== "string") {
      throw new Error("Background mode is required.");
    }
    currentMode = nextMode;
    layer.mode = currentMode;
    layer.dirty = true;
    if (currentMode.type !== "video") {
      videoElement = null;
    }
  };

  const init = ({ width: w = width, height: h = height, rand: rng = rand } = {}) => {
    const nextMode = ensureMode({ width: w, height: h, rand: rng });
    layer.mode = nextMode;
    initBackgroundLayer(layer, { width: w, height: h, rand: rng, mode: nextMode });
  };

  const update = ({ width: w = width, height: h = height, dt = 0, rand: rng = rand } = {}) => {
    if (!layer.mode) {
      init({ width: w, height: h, rand: rng });
    }
    updateBackgroundDots(layer, { width: w, height: h, dt, rand: rng });
  };

  const render = (ctx, { width: w = width, height: h = height } = {}) => {
    if (!layer.mode) {
      init({ width: w, height: h, rand });
    }
    if (currentMode?.type === "video") {
      const video = ensureVideoElement();
      if (ctx && video && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, w, h);
        return true;
      }
      return false;
    }
    return drawBackgroundLayer(layer, ctx, { width: w, height: h });
  };

  return {
    init,
    update,
    render,
    setMode,
    getMode: () => currentMode
  };
}
