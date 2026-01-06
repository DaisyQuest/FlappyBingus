// =================================
// FILE: public/js/pipes/pipeRendering.js
// =================================
import { rgb } from "../util.js";
import {
  DEFAULT_PIPE_TEXTURE_ID,
  DEFAULT_PIPE_TEXTURE_MODE,
  drawPipeTexture,
  normalizePipeTextureMode
} from "../pipeTextures.js";

export function resolvePipeTextureSelection({ skillSettings, selection } = {}) {
  if (skillSettings?.simpleTextures) {
    return { textureId: DEFAULT_PIPE_TEXTURE_ID, mode: "MONOCHROME" };
  }

  if (typeof selection === "string") {
    return { textureId: selection || DEFAULT_PIPE_TEXTURE_ID, mode: DEFAULT_PIPE_TEXTURE_MODE };
  }

  const textureId = typeof selection?.id === "string" && selection.id.trim()
    ? selection.id
    : DEFAULT_PIPE_TEXTURE_ID;
  const mode = normalizePipeTextureMode(selection?.mode || DEFAULT_PIPE_TEXTURE_MODE);
  return { textureId, mode };
}

export function drawPipe(ctx, pipe, base, { skillSettings, selection, time = 0 } = {}) {
  if (skillSettings?.extremeLowDetail) {
    ctx.save();
    ctx.fillStyle = typeof base === "string" ? base : rgb(base);
    ctx.fillRect(pipe.x, pipe.y, pipe.w, pipe.h);
    ctx.restore();
    return;
  }

  const { textureId, mode } = resolvePipeTextureSelection({ skillSettings, selection });
  drawPipeTexture(ctx, pipe, base, { textureId, mode, time });
}
