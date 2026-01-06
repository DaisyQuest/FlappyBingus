import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const COVERAGE_JSON = path.join("coverage", "coverage-final.json");
const LCOV_FILE = path.join("coverage", "lcov.info");

function loadCoverage() {
  if (fs.existsSync(COVERAGE_JSON)) {
    const raw = fs.readFileSync(COVERAGE_JSON, "utf-8");
    return { source: COVERAGE_JSON, data: JSON.parse(raw) };
  }
  if (fs.existsSync(LCOV_FILE)) {
    const raw = fs.readFileSync(LCOV_FILE, "utf-8");
    const records = raw.split("end_of_record").map((r) => r.trim()).filter(Boolean);
    const results = {};
    for (const rec of records) {
      const lines = rec.split("\n");
      let file;
      let s = { h: 0, f: 0 };
      let l = { h: 0, f: 0 };
      let b = { h: 0, f: 0 };
      for (const line of lines) {
        if (line.startsWith("SF:")) file = line.slice(3).trim();
        else if (line.startsWith("DA:")) {
          const [, hitsStr] = line.slice(3).split(",");
          const hits = Number(hitsStr);
          l.f += 1;
          l.h += hits > 0 ? 1 : 0;
          s.f += 1;
          s.h += hits > 0 ? 1 : 0;
        } else if (line.startsWith("BRDA:")) {
          const parts = line.slice(5).split(",");
          const taken = parts[3];
          b.f += 1;
          const hit = taken !== "-" && Number(taken) > 0;
          b.h += hit ? 1 : 0;
        }
      }
      if (file) results[file] = { s, b, l, f: { h: 0, f: 0 } };
    }
    return { source: LCOV_FILE, data: results };
  }
  throw new Error("Coverage files not found. Run test:coverage first.");
}

function pct(hit, found) {
  if (found === 0) return 100;
  return (hit / found) * 100;
}

function getBaseRef() {
  const envRef = process.env.COVERAGE_BASE_REF;
  if (envRef) return envRef;
  try {
    execSync("git rev-parse --verify origin/main", { stdio: "ignore" });
    return "origin/main";
  } catch {}
  try {
    execSync("git rev-parse --verify main", { stdio: "ignore" });
    return "main";
  } catch {}
  try {
    execSync("git rev-parse --verify HEAD~1", { stdio: "ignore" });
    return "HEAD~1";
  } catch {}
  return null;
}

function getChangedFiles() {
  const base = getBaseRef();
  if (!base) return [];
  const diff = execSync(`git diff --name-only ${base}...HEAD`, { encoding: "utf-8" });
  return diff.split("\n").map((line) => line.trim()).filter(Boolean);
}

function normalizeCoveragePaths(data) {
  const map = new Map();
  Object.entries(data).forEach(([file, metrics]) => {
    const normalized = file.replace(/\\/g, "/");
    map.set(normalized, metrics);
  });
  return map;
}

function main() {
  const { data } = loadCoverage();
  const coverageMap = normalizeCoveragePaths(data);
  let total = { s: { h: 0, f: 0 }, b: { h: 0, f: 0 }, l: { h: 0, f: 0 }, f: { h: 0, f: 0 } };
  coverageMap.forEach((metrics) => {
    total.s.h += metrics.s.h;
    total.s.f += metrics.s.f;
    total.b.h += metrics.b.h;
    total.b.f += metrics.b.f;
    total.l.h += metrics.l.h;
    total.l.f += metrics.l.f;
    if (metrics.f) {
      total.f.h += metrics.f.h;
      total.f.f += metrics.f.f;
    }
  });
  const globalLines = pct(total.l.h, total.l.f);
  const globalBranches = pct(total.b.h, total.b.f);
  const globalStatements = pct(total.s.h, total.s.f);
  const globalFunctions = pct(total.f?.h ?? 0, total.f?.f ?? 0);
  const globalThresholds = { lines: 80, branches: 70, statements: 80, functions: 80 };
  if (
    globalLines < globalThresholds.lines ||
    globalBranches < globalThresholds.branches ||
    globalStatements < globalThresholds.statements ||
    globalFunctions < globalThresholds.functions
  ) {
    throw new Error(
      `Global coverage below threshold: ` +
        `lines ${globalLines.toFixed(2)}% (min ${globalThresholds.lines}%), ` +
        `branches ${globalBranches.toFixed(2)}% (min ${globalThresholds.branches}%), ` +
        `statements ${globalStatements.toFixed(2)}% (min ${globalThresholds.statements}%), ` +
        `functions ${globalFunctions.toFixed(2)}% (min ${globalThresholds.functions}%)`
    );
  }

  const changed = getChangedFiles()
    .filter((file) => file.match(/\.(js|cjs|mjs)$/))
    .filter((file) => !file.includes("__tests__"))
    .filter((file) => !file.match(/\.spec\./))
    .map((file) => path.resolve(file).replace(/\\/g, "/"));
  const failures = [];
  const touchedThresholds = { lines: 30, branches: 25 };
  changed.forEach((file) => {
    const relative = file.replace(process.cwd().replace(/\\/g, "/"), "").replace(/^\//, "");
    const metrics = coverageMap.get(file) || coverageMap.get(relative);
    if (!metrics) {
      failures.push(`${file}: missing coverage data`);
      return;
    }
    const linePct = pct(metrics.l.h, metrics.l.f);
    const branchPct = pct(metrics.b.h, metrics.b.f);
    if (linePct < touchedThresholds.lines || branchPct < touchedThresholds.branches) {
      failures.push(
        `${file}: lines ${linePct.toFixed(2)}% (min ${touchedThresholds.lines}%), ` +
          `branches ${branchPct.toFixed(2)}% (min ${touchedThresholds.branches}%)`
      );
    }
  });

  if (failures.length) {
    throw new Error(`Touched file coverage below threshold:\n${failures.join("\n")}`);
  }
}

try {
  main();
  console.log("Coverage gate passed.");
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
