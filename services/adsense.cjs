"use strict";

const ADSENSE_CLIENT_ID = "ca-pub-7318278561029030";
const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
const ADSENSE_LOADER_SRC = "/js/adsenseLoader.js";
const ADSENSE_SCRIPT_TAG = `<script type="module" src="${ADSENSE_LOADER_SRC}" data-adsense-client="${ADSENSE_CLIENT_ID}"></script>`;

module.exports = {
  ADSENSE_CLIENT_ID,
  ADSENSE_LOADER_SRC,
  ADSENSE_SCRIPT_SRC,
  ADSENSE_SCRIPT_TAG
};
