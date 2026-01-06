import {
  DEFAULT_PIPE_TEXTURE_ID,
  DEFAULT_PIPE_TEXTURE_MODE,
  drawPipeTexture,
  normalizePipeTextureMode
} from "../pipeTextures.js";
import { rgb } from "../util.js";

export function drawPipe(ctx, pipe, base, {
  skillSettings,
  cfg,
  timeAlive = 0,
  getPipeTexture
} = {}) {
  if (!ctx || !pipe) return;

  if (skillSettings?.extremeLowDetail) {
    const strokeColor = cfg?.pipes?.colors?.stroke ?? "#000000";
    const strokeWidth = Number(cfg?.pipes?.strokeWidth ?? 2);
    ctx.save();
    ctx.fillStyle = typeof base === "string" ? base : rgb(base);
    ctx.fillRect(pipe.x, pipe.y, pipe.w, pipe.h);
    if (Number.isFinite(strokeWidth) && strokeWidth > 0 && strokeColor) {
      const inset = strokeWidth / 2;
      const rectW = Math.max(0, pipe.w - strokeWidth);
      const rectH = Math.max(0, pipe.h - strokeWidth);
      if (rectW > 0 && rectH > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.strokeRect(pipe.x + inset, pipe.y + inset, rectW, rectH);
      }
    }
    ctx.restore();
    return;
  }

  const selection = getPipeTexture ? getPipeTexture() : null;
  const textureId = skillSettings?.simpleTextures
    ? DEFAULT_PIPE_TEXTURE_ID
    : (typeof selection === "string"
      ? selection
      : (selection?.id || DEFAULT_PIPE_TEXTURE_ID));
  const mode = skillSettings?.simpleTextures
    ? "MONOCHROME"
    : normalizePipeTextureMode(selection?.mode || DEFAULT_PIPE_TEXTURE_MODE);
  const strokeColor = cfg?.pipes?.colors?.stroke ?? "#000000";
  const strokeWidth = Number(cfg?.pipes?.strokeWidth ?? 2);
  drawPipeTexture(ctx, pipe, base, {
    textureId,
    mode,
    time: timeAlive,
    strokeColor,
    strokeWidth
  });
}
