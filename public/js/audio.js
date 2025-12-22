// =====================
// FILE: public/js/audio.js
// =====================
import { clamp } from "./util.js";
let ctx = null;

let musicBuffer = null;
let boopBuffer = null;
let niceBuffer = null;
let bounceBuffer = null;
let shatterBuffer = null;
let slowFieldBuffer = null;
let slowExplosionBuffer = null;
let dashStartBuffer = null;
let dashBreakBuffer = null;
let teleportBuffer = null;
let phaseBuffer = null;
let explosionBuffer = null;
let gameOverBuffer = null;
let musicLoaded = false;
let boopLoaded = false;
let niceLoaded = false;
let bounceLoaded = false;
let shatterLoaded = false;
let slowFieldLoaded = false;
let slowExplosionLoaded = false;
let dashStartLoaded = false;
let dashBreakLoaded = false;
let teleportLoaded = false;
let phaseLoaded = false;
let explosionLoaded = false;
let gameOverLoaded = false;

let musicGain = null;
let sfxGain = null;

let musicSource = null;
let musicPlaying = false;

// Persist desired volumes even before the audio context is created so UI updates
// made from the menu apply once audioInit() runs.
let desiredMusic = 0.7;
let desiredSfx = 0.8;
let muted = false;

function clamp01(v) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}

function applyVolumeGains() {
  if (!musicGain || !sfxGain) return;
  const musicLevel = muted ? 0 : desiredMusic;
  const sfxLevel = muted ? 0 : desiredSfx;

  musicGain.gain.value = musicLevel;
  sfxGain.gain.value = sfxLevel;
}

async function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();

    musicGain.connect(ctx.destination);
    sfxGain.connect(ctx.destination);

    applyVolumeGains();
  }
  // Ensure resumed after user gesture
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

async function loadBuffer(url) {
  const c = await getCtx();
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return await c.decodeAudioData(arr);
  } catch {
    return null;
  }
}

export async function audioInit({
  musicUrl,
  boopUrl,
  niceUrl,
  bounceUrl,
  shatterUrl,
  slowFieldUrl,
  slowExplosionUrl,
  dashStartUrl,
  dashBreakUrl,
  teleportUrl,
  phaseUrl,
  explosionUrl,
  gameOverUrl
} = {}) {
  // Must be called from a user gesture (Start / Restart click)
  await getCtx();

  // Load lazily once
  if (musicUrl && !musicLoaded) {
    musicBuffer = await loadBuffer(musicUrl);
    musicLoaded = true;
  }
  if (boopUrl && !boopLoaded) {
    boopBuffer = await loadBuffer(boopUrl);
    boopLoaded = true;
  }
  if (niceUrl && !niceLoaded) {
    niceBuffer = await loadBuffer(niceUrl); // NEW
    niceLoaded = true;
  }
  if (bounceUrl && !bounceLoaded) {
    bounceBuffer = await loadBuffer(bounceUrl);
    bounceLoaded = true;
  }
  if (shatterUrl && !shatterLoaded) {
    shatterBuffer = await loadBuffer(shatterUrl);
    shatterLoaded = true;
  }
  if (slowFieldUrl && !slowFieldLoaded) {
    slowFieldBuffer = await loadBuffer(slowFieldUrl);
    slowFieldLoaded = true;
  }
  if (slowExplosionUrl && !slowExplosionLoaded) {
    slowExplosionBuffer = await loadBuffer(slowExplosionUrl);
    slowExplosionLoaded = true;
  }
  if (dashStartUrl && !dashStartLoaded) {
    dashStartBuffer = await loadBuffer(dashStartUrl);
    dashStartLoaded = true;
  }
  if (dashBreakUrl && !dashBreakLoaded) {
    dashBreakBuffer = await loadBuffer(dashBreakUrl);
    dashBreakLoaded = true;
  }
  if (teleportUrl && !teleportLoaded) {
    teleportBuffer = await loadBuffer(teleportUrl);
    teleportLoaded = true;
  }
  if (phaseUrl && !phaseLoaded) {
    phaseBuffer = await loadBuffer(phaseUrl);
    phaseLoaded = true;
  }
  if (explosionUrl && !explosionLoaded) {
    explosionBuffer = await loadBuffer(explosionUrl);
    explosionLoaded = true;
  }
  if (gameOverUrl && !gameOverLoaded) {
    gameOverBuffer = await loadBuffer(gameOverUrl);
    gameOverLoaded = true;
  }
}

export function setMusicVolume(v01) {
  desiredMusic = clamp01(v01);
  applyVolumeGains();
}
export function setSfxVolume(v01) {
  desiredSfx = clamp01(v01);
  applyVolumeGains();
}

export function setMuted(on) {
  muted = !!on;
  applyVolumeGains();
}

export function getVolumeState() {
  return {
    music: desiredMusic,
    sfx: desiredSfx,
    muted,
    applied: {
      music: musicGain?.gain.value ?? null,
      sfx: sfxGain?.gain.value ?? null
    }
  };
}

export function musicStartLoop() {
  if (!ctx || !musicBuffer || musicPlaying) return;

  // Stop any previous source defensively
  try { musicSource?.stop(); } catch {}

  const src = ctx.createBufferSource();
  src.buffer = musicBuffer;
  src.loop = true;

  src.connect(musicGain);
  src.start(0);

  musicSource = src;
  musicPlaying = true;

  src.onended = () => {
    // onended can fire if stopped; keep state coherent
    if (musicSource === src) {
      musicSource = null;
      musicPlaying = false;
    }
  };
}

export function musicStop() {
  if (!musicSource) return;
  try { musicSource.stop(0); } catch {}
  musicSource = null;
  musicPlaying = false;
}

export function sfxOrbBoop(combo = 0) {
  if (!ctx || !boopBuffer || !sfxGain) return;

  const src = ctx.createBufferSource();
  src.buffer = boopBuffer;

  const c = Math.max(0, combo | 0);
  src.playbackRate.value = Math.min(2.0, 1.0 + c * 0.04);

  const g = ctx.createGain();
  g.gain.value = 1.0;

  src.connect(g);
  g.connect(sfxGain);

  src.start(0);
}

export function sfxPerfectNice() {
  if (!ctx || !niceBuffer || !sfxGain) return;

  const src = ctx.createBufferSource();
  src.buffer = niceBuffer;

  const g = ctx.createGain();
  g.gain.value = 1.0;

  src.connect(g);
  g.connect(sfxGain);

  src.start(0);
}

export function sfxDashStart() {
  if (!ctx || !sfxGain) return;

  const buffer = dashStartBuffer || boopBuffer;
  if (!buffer) return;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = 1.0;

  const g = ctx.createGain();
  g.gain.value = 0.9;

  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

export function sfxDashBounce(speed = 1) {
  if (!ctx || !bounceBuffer || !sfxGain) return;

  const src = ctx.createBufferSource();
  src.buffer = bounceBuffer;
  src.playbackRate.value = clamp(0.85, 1.0 + speed * 0.25, 1.35);

  const g = ctx.createGain();
  g.gain.value = 0.85;

  src.connect(g);
  g.connect(sfxGain);

  src.start(0);
}

export function sfxDashDestroy() {
  if (!ctx || !shatterBuffer || !sfxGain) return;

  const src = ctx.createBufferSource();
  src.buffer = shatterBuffer;

  const g = ctx.createGain();
  g.gain.value = 0.95;

  src.connect(g);
  g.connect(sfxGain);

  src.start(0);
}

export function sfxDashBreak() {
  if (!ctx || !sfxGain) return;
  const buffer = dashBreakBuffer || shatterBuffer || bounceBuffer;
  if (!buffer) return;

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const g = ctx.createGain();
  g.gain.value = 0.95;

  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

export function sfxSlowField() {
  if (!ctx || !slowFieldBuffer || !sfxGain) return;
  const src = ctx.createBufferSource();
  src.buffer = slowFieldBuffer;
  const g = ctx.createGain();
  g.gain.value = 0.85;
  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

export function sfxSlowExplosion() {
  if (!ctx || !slowExplosionBuffer || !sfxGain) return;
  const src = ctx.createBufferSource();
  src.buffer = slowExplosionBuffer;
  const g = ctx.createGain();
  g.gain.value = 0.9;
  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

export function sfxExplosion({ allowFallback = true } = {}) {
  if (!ctx || !sfxGain) return;
  const buffer = explosionBuffer || (allowFallback ? slowExplosionBuffer : null);
  if (!buffer) return;

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const g = ctx.createGain();
  g.gain.value = 0.95;

  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

export function sfxTeleport() {
  if (!ctx || !sfxGain) return;
  const buffer = teleportBuffer || dashStartBuffer || boopBuffer;
  if (!buffer) return;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = 1.05;

  const g = ctx.createGain();
  g.gain.value = 0.9;
  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

export function sfxPhase() {
  if (!ctx || !phaseBuffer || !sfxGain) return;
  const src = ctx.createBufferSource();
  src.buffer = phaseBuffer;

  const g = ctx.createGain();
  g.gain.value = 0.85;
  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

export function sfxAchievementUnlock() {
  if (!ctx || !sfxGain) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime || 0;

  osc.type = "triangle";
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.linearRampToValueAtTime(880, now + 0.25);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

  osc.connect(gain);
  gain.connect(sfxGain);

  osc.start(now);
  osc.stop(now + 0.72);
}

export function sfxGameOver() {
  if (!ctx || !sfxGain) return;
  const buffer = gameOverBuffer || phaseBuffer;
  if (!buffer) return;

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const g = ctx.createGain();
  g.gain.value = 0.9;

  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}
