import fs from "fs";
import path from "path";

const COVERAGE_JSON = path.join("coverage", "coverage-final.json");
const LCOV_FILE = path.join("coverage", "lcov.info");
const OUTPUT_MD = path.join("coverage", "summary.md");

function formatPct(hit, found) {
  if (found === 0) return "100.00%";
  return `${((hit / found) * 100).toFixed(2)}%`;
}

function buildRow(name, metrics) {
  return `| ${name} | ${formatPct(metrics.s.h, metrics.s.f)} | ${formatPct(metrics.b.h, metrics.b.f)} | ${formatPct(metrics.f.h, metrics.f.f)} | ${formatPct(metrics.l.h, metrics.l.f)} |`;
}

function readJsonCoverage() {
  const raw = fs.readFileSync(COVERAGE_JSON, "utf-8");
  return JSON.parse(raw);
}

function readLcov() {
  const raw = fs.readFileSync(LCOV_FILE, "utf-8");
  const records = raw.split("end_of_record").map((r) => r.trim()).filter(Boolean);
  const results = {};

  for (const rec of records) {
    const lines = rec.split("\n");
    let file;
    let s = { h: 0, f: 0 };
    let l = { h: 0, f: 0 };
    let fns = { h: 0, f: 0 };
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
      } else if (line.startsWith("FNDA:")) {
        const hits = Number(line.slice(5).split(",")[0]);
        fns.f += 1;
        fns.h += hits > 0 ? 1 : 0;
      } else if (line.startsWith("BRDA:")) {
        const parts = line.slice(5).split(",");
        const taken = parts[3];
        b.f += 1;
        const hit = taken !== "-" && Number(taken) > 0;
        b.h += hit ? 1 : 0;
      }
    }
    if (file) results[file] = { s, b, f: fns, l };
  }
  return results;
}

function main() {
  let coverageData;
  let sourceLabel;
  if (fs.existsSync(COVERAGE_JSON)) {
    coverageData = readJsonCoverage();
    sourceLabel = COVERAGE_JSON;
  } else if (fs.existsSync(LCOV_FILE)) {
    coverageData = readLcov();
    sourceLabel = LCOV_FILE;
  } else {
    console.error(`Coverage files not found. Run "npm run test:coverage" first.`);
    process.exit(1);
  }

  let total = { s: { h: 0, f: 0 }, b: { h: 0, f: 0 }, f: { h: 0, f: 0 }, l: { h: 0, f: 0 } };
  const rows = [];

  for (const [file, metrics] of Object.entries(coverageData)) {
    if (!metrics || !metrics.s) continue;
    total.s.h += metrics.s.h;
    total.s.f += metrics.s.f;
    total.b.h += metrics.b.h;
    total.b.f += metrics.b.f;
    total.f.h += metrics.f.h;
    total.f.f += metrics.f.f;
    total.l.h += metrics.l.h;
    total.l.f += metrics.l.f;
    rows.push(buildRow(path.basename(file), metrics));
  }

  const header = `# Coverage Summary\n\nGenerated from \`${sourceLabel}\`.\n\n| File | Statements | Branches | Functions | Lines |\n| --- | --- | --- | --- | --- |\n`;
  const totalRow = `| **All files** | ${formatPct(total.s.h, total.s.f)} | ${formatPct(total.b.h, total.b.f)} | ${formatPct(total.f.h, total.f.f)} | ${formatPct(total.l.h, total.l.f)} |`;
  const body = [header, totalRow, ...rows.sort()].join("\n");

  fs.mkdirSync(path.dirname(OUTPUT_MD), { recursive: true });
  fs.writeFileSync(OUTPUT_MD, body, "utf-8");
  console.log(body);
  console.log(`\nCoverage summary written to ${OUTPUT_MD}`);
}

main();
