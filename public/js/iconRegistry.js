import { migrateLegacyStyleToV2 } from "./iconStyleV2.js";

const HIGH_VIS_ORANGE_ID = "hi_vis_orange";

export class PlayerIconDefinition {
  constructor({ id, name, unlock, style, imageSrc, schemaVersion = 2 }) {
    this.id = id;
    this.name = name;
    this.unlock = unlock;
    this.style = style;
    this.imageSrc = imageSrc;
    this.schemaVersion = schemaVersion;
  }

  toDefinition() {
    const payload = {
      id: this.id,
      name: this.name,
      unlock: this.unlock,
      style: this.style,
      schemaVersion: this.schemaVersion
    };
    if (this.imageSrc) payload.imageSrc = this.imageSrc;
    return payload;
  }
}

export class HighVisOrangeIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: HIGH_VIS_ORANGE_ID,
      name: "High-Vis Orange",
      unlock: { type: "free", label: "Free" },
      style: migrateLegacyStyleToV2({
        fill: "#ff8c1a",
        core: "#ffc285",
        rim: "#0f172a",
        glow: "#ffe8c2"
      })
    });
  }
}

export class HighVisRedIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "hi_vis_red",
      name: "High-Vis Red",
      unlock: { type: "free", label: "Free" },
      style: migrateLegacyStyleToV2({
        fill: "#ff3b30",
        core: "#ff7b72",
        rim: "#0f172a",
        glow: "#ffd7d3"
      })
    });
  }
}

export class FileIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "file_icon",
      name: "File Icon",
      unlock: { type: "purchase", cost: 100 },
      imageSrc: "/file.png",
      style: migrateLegacyStyleToV2({
        fill: "#1f2937",
        core: "#f8fafc",
        rim: "#0f172a",
        glow: "rgba(147,197,253,0.65)"
      })
    });
  }
}

export class PerfectTenLinerIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "perfect_ten_liner",
      name: "Perfect Line Beacon",
      unlock: { type: "achievement", id: "perfects_run_10", label: "Perfect Ten" },
      style: migrateLegacyStyleToV2({
        fill: "#000000",
        core: "#000000",
        rim: "#ff1a1a",
        glow: "#ff4d4d",
        pattern: { type: "centerline", stroke: "#ff1a1a", accent: "#ff1a1a", glow: "#ff4d4d" }
      })
    });
  }
}

export class OrbFreeZigzagIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "orb_free_zigzag",
      name: "Azure Zigzag",
      unlock: { type: "achievement", id: "no_orbs_100", label: "Orb-Free Century" },
      style: migrateLegacyStyleToV2({
        fill: "#f8fbff",
        core: "#e0f2fe",
        rim: "#7dd3fc",
        glow: "#bae6fd",
        pattern: {
          type: "zigzag",
          stroke: "#7dd3fc",
          background: "#bae6fd",
          amplitude: 0.2,
          waves: 7,
          spacing: 10
        },
        animation: { type: "zigzag_scroll", speed: 0.35 }
      })
    });
  }
}

export class BeeStripesIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "bee_stripes",
      name: "Bee Stripes",
      unlock: { type: "achievement", id: "orb_combo_20", label: "Orb Crescendo" },
      style: migrateLegacyStyleToV2({
        fill: "#facc15",
        core: "#111827",
        rim: "#0b0b0b",
        glow: "#fde68a",
        pattern: { type: "stripes", colors: ["#0b0b0b", "#facc15"], angle: Math.PI / 4 }
      })
    });
  }
}

export class RainbowStripesIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "rainbow_stripes",
      name: "Rainbow Stripes",
      unlock: { type: "achievement", id: "orbs_run_100", label: "Orb Vacuum" },
      style: migrateLegacyStyleToV2({
        fill: "#f8fafc",
        core: "#e2e8f0",
        rim: "#1f2937",
        glow: "#f8fafc",
        pattern: {
          type: "stripes",
          colors: ["#ef4444", "#fb923c", "#facc15", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"],
          angle: Math.PI / 4
        }
      })
    });
  }
}

export class HoneycombIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "honeycomb",
      name: "Honeycomb",
      unlock: { type: "achievement", id: "total_run_time_600", label: "Honeycomb Drift" },
      style: migrateLegacyStyleToV2({
        fill: "#fbbf24",
        core: "#fde68a",
        rim: "#3b240a",
        glow: "#fff1b8",
        pattern: { type: "honeycomb", stroke: "#f59e0b", glow: "#ffe9a3" }
      })
    });
  }
}

export class MidnightHoneycombIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "midnight_honeycomb",
      name: "Midnight Honeycomb",
      unlock: { type: "achievement", id: "pipes_broken_total_1000", label: "Pipe Purger" },
      style: migrateLegacyStyleToV2({
        fill: "#facc15",
        core: "#fde047",
        rim: "#111827",
        glow: "#fef08a",
        pattern: { type: "honeycomb", stroke: "#0b0b0b", glow: "#fef3c7" }
      })
    });
  }
}

export class LemonSliceIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "lemon_slice",
      name: "Lemon Slice",
      unlock: { type: "achievement", id: "pipes_broken_run_100", label: "Shatterstorm Run" },
      style: migrateLegacyStyleToV2({
        fill: "#facc15",
        core: "#fef3c7",
        rim: "#b45309",
        glow: "#fef9c3",
        pattern: {
          type: "citrus_slice",
          stroke: "#f59e0b",
          rindStroke: "#f59e0b",
          segmentStroke: "#ea8c00",
          segments: 10,
          glow: "#fde68a"
        }
      })
    });
  }
}

export class FireCapeIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "fire_cape",
      name: "Fire Cape",
      unlock: { type: "achievement", id: "score_fire_cape_1000", label: "Fire Cape Trial" },
      style: migrateLegacyStyleToV2({
        fill: "#1d0707",
        core: "#ffb264",
        rim: "#110404",
        glow: "#ffd08a",
        pattern: {
          type: "cobblestone",
          base: "#2a0c0b",
          highlight: "#ff8a2a",
          stroke: "#130404",
          glow: "#ffb870",
          stoneSize: 0.18,
          gap: 0.03
        },
        animation: {
          type: "cape_flow",
          palette: {
            base: "#200909",
            ash: "#3a0e0d",
            ember: "#b32716",
            molten: "#f06d22",
            flare: "#ffd07d"
          },
          speed: 0.32,
          bands: 7,
          embers: 0.85
        }
      })
    });
  }
}

export class InfernoCapeIcon extends PlayerIconDefinition {
  constructor() {
    super({
      id: "inferno_cape",
      name: "Inferno Cape",
      unlock: { type: "achievement", id: "score_inferno_cape_2000", label: "Inferno Challenge" },
      style: migrateLegacyStyleToV2({
        fill: "#140303",
        core: "#ff7b2f",
        rim: "#070303",
        glow: "#ffb36a",
        pattern: {
          type: "cobblestone",
          base: "#1f0706",
          highlight: "#ff5f1f",
          stroke: "#0b0202",
          glow: "#ff9c5a",
          stoneSize: 0.17,
          gap: 0.028
        },
        animation: {
          type: "cape_flow",
          palette: {
            base: "#160505",
            ash: "#2f0807",
            ember: "#84130f",
            molten: "#e0521a",
            flare: "#ffb25d"
          },
          speed: 0.36,
          bands: 8,
          embers: 0.9
        }
      })
    });
  }
}

export const ICON_CLASSES = Object.freeze([
  HighVisOrangeIcon,
  HighVisRedIcon,
  FileIcon,
  PerfectTenLinerIcon,
  OrbFreeZigzagIcon,
  BeeStripesIcon,
  RainbowStripesIcon,
  HoneycombIcon,
  MidnightHoneycombIcon,
  LemonSliceIcon,
  FireCapeIcon,
  InfernoCapeIcon
]);

export function buildBaseIcons() {
  return ICON_CLASSES.map((IconClass) => new IconClass().toDefinition());
}
