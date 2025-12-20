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
    const arr = await res.arrayBuffer();
    return await c.decodeAudioData(arr);
  } catch (err) {
    console.warn("audio decode failed for", url, err);
    return null;
  }
}

export async function audioInit({ musicUrl, boopUrl, niceUrl, bounceUrl, shatterUrl, slowFieldUrl, slowExplosionUrl } = {}) {
  // Must be called from a user gesture (Start / Restart click)
  await getCtx();

  // Load lazily once
  if (musicUrl && !musicBuffer) musicBuffer = await loadBuffer(musicUrl);
  if (boopUrl && !boopBuffer) boopBuffer = await loadBuffer(boopUrl);
  if (niceUrl && !niceBuffer) niceBuffer = await loadBuffer(niceUrl); // NEW
  if (bounceUrl && !bounceBuffer) bounceBuffer = await loadBuffer(bounceUrl);
  if (shatterUrl && !shatterBuffer) shatterBuffer = await loadBuffer(shatterUrl);
  if (slowFieldUrl && !slowFieldBuffer) slowFieldBuffer = await loadBuffer(slowFieldUrl);
  if (slowExplosionUrl && !slowExplosionBuffer) slowExplosionBuffer = await loadBuffer(slowExplosionUrl);
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

export function sfxDashShatter() {
  if (!ctx || !shatterBuffer || !sfxGain) return;
  const src = ctx.createBufferSource();
  src.buffer = shatterBuffer;
  const g = ctx.createGain();
  g.gain.value = 0.9;
  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

export function sfxSlowField() {
  if (!ctx || !slowFieldBuffer || !sfxGain) return;
  const src = ctx.createBufferSource();
  src.buffer = slowFieldBuffer;
  const g = ctx.createGain();
  g.gain.value = 0.75;
  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}

export function sfxSlowExplosion() {
  if (!ctx || !slowExplosionBuffer || !sfxGain) return;
  const src = ctx.createBufferSource();
  src.buffer = slowExplosionBuffer;
  const g = ctx.createGain();
  g.gain.value = 0.95;
  src.connect(g);
  g.connect(sfxGain);
  src.start(0);
}
