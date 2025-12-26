// ======================
// FILE: public/js/authHints.js
// ======================
import { buildTrailHint } from "./trailHint.js";
import { getUserHintState } from "./userStatus.js";

export function buildAuthHints({
  online = true,
  user = null,
  bestScore = 0,
  trails = [],
  achievements = null
} = {}) {
  const userHint = getUserHintState({ online, user });
  const trailHint = buildTrailHint({
    online,
    user,
    bestScore,
    trails,
    achievements
  });
  return { userHint, trailHint };
}
