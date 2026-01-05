"use strict";

const ADSENSE_BASE_URL = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
const STORAGE_ACCESS_ERROR_PATTERN = /(?:storage access|access to storage|blocked access to storage)/i;

const getClientId = (doc) => doc?.currentScript?.dataset?.adsenseClient?.trim();

const buildScriptUrl = (clientId) => {
  const url = new URL(ADSENSE_BASE_URL);
  url.searchParams.set("client", clientId);
  return url.toString();
};

const hasAdsenseScript = (doc, clientId) =>
  Array.from(doc.querySelectorAll("script[src]")).some((script) => script.src.includes(ADSENSE_BASE_URL) && script.src.includes(clientId));

const logStorageAccessWarning = (message) => {
  if (!message || !STORAGE_ACCESS_ERROR_PATTERN.test(message)) return;
  console.warn("[bingus] Adsense storage access was blocked by browser tracking prevention.");
};

const attachStorageAccessListener = (win) => {
  if (!win?.addEventListener) return () => {};
  const handler = (event) => logStorageAccessWarning(event?.message);
  win.addEventListener("error", handler);
  return () => win.removeEventListener("error", handler);
};

const loadAdsense = ({ doc, win, clientId }) => {
  if (!doc || !clientId) return { loaded: false, reason: "missing-client" };
  if (hasAdsenseScript(doc, clientId)) return { loaded: false, reason: "already-loaded" };
  const cleanup = attachStorageAccessListener(win);
  const script = doc.createElement("script");
  script.async = true;
  script.src = buildScriptUrl(clientId);
  script.crossOrigin = "anonymous";
  script.addEventListener("load", () => cleanup(), { once: true });
  script.addEventListener("error", () => cleanup(), { once: true });
  doc.head.appendChild(script);
  return { loaded: true };
};

const resolveWindow = () => (typeof window === "undefined" ? undefined : window);

const bootstrap = () => {
  const win = resolveWindow();
  const doc = win?.document;
  const clientId = getClientId(doc);
  if (!clientId) return;
  loadAdsense({ doc, win, clientId });
};

bootstrap();

export {
  ADSENSE_BASE_URL,
  STORAGE_ACCESS_ERROR_PATTERN,
  attachStorageAccessListener,
  buildScriptUrl,
  getClientId,
  hasAdsenseScript,
  loadAdsense,
  logStorageAccessWarning,
  resolveWindow
};
