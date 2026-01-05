"use strict";

const ADSENSE_CLIENT_ID = "ca-pub-7318278561029030";
const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
const ADSENSE_SCRIPT_TAG = `<script async src="${ADSENSE_SCRIPT_SRC}" crossorigin="anonymous"></script>`;

module.exports = {
  ADSENSE_CLIENT_ID,
  ADSENSE_SCRIPT_SRC,
  ADSENSE_SCRIPT_TAG
};
