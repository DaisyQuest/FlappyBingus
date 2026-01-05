"use strict";

const ADSENSE_CLIENT_ID = "ca-pub-7318278561029030";
const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
const ADSENSE_LOADER_SRC = "/js/adsenseLoader.js";
const ADSENSE_LOADER_TAG = `<script type="module" src="${ADSENSE_LOADER_SRC}" data-adsense-client="${ADSENSE_CLIENT_ID}"></script>`;
const ADSENSE_VERIFICATION_SCRIPT_TAG = `<script async src="${ADSENSE_SCRIPT_SRC}" crossorigin="anonymous"></script>`;
const ADSENSE_SCRIPT_TAG = `${ADSENSE_VERIFICATION_SCRIPT_TAG}\n  ${ADSENSE_LOADER_TAG}`;

module.exports = {
  ADSENSE_CLIENT_ID,
  ADSENSE_LOADER_TAG,
  ADSENSE_LOADER_SRC,
  ADSENSE_SCRIPT_SRC,
  ADSENSE_SCRIPT_TAG,
  ADSENSE_VERIFICATION_SCRIPT_TAG
};
