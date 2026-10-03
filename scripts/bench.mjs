// Run bench/Bench.rgr and write BENCHMARK.md: delta sizes against the whole
// new file and against it gzipped, and the time to make and apply a delta.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { root, buildDir, rangerDir, install, compile } from "./lib.mjs";

const ranger = rangerDir();
install(ranger);
const out = compile(ranger, "bench/Bench.rgr", path.join(buildDir, "bench.cjs"));
const r = spawnSync("node", [out], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 });
if (r.status !== 0) {
  console.error(r.stdout, r.stderr);
  process.exit(1);
}
const rows = r.stdout.trim().split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} kB`);
const pct = (a, b) => `${((100 * a) / b).toFixed(a * 100 < b ? 2 : 1)} %`;
const ms = (v) => (v < 10 ? v.toFixed(2) : v.toFixed(0));

const lines = [];
lines.push("# Benchmark");
lines.push("");
lines.push(`Node ${process.version}, ${os.cpus()[0]?.model || os.arch()}, ${new Date().toISOString().slice(0, 10)}. ` +
  "`npm run bench` writes this file. \"gzip\" is the new file gzipped (what sending it whole would cost); " +
  "\"delta\" is what RdSmart.diff stores; \"byte delta\" is the plain RdDelta for comparison. " +
  "Times are the library compiled to JavaScript.");
let group = "";
for (const row of rows.filter((x) => x.group !== "history")) {
  if (row.group !== group) {
    group = row.group;
    lines.push("");
    lines.push(`## ${group}`);
    lines.push("");
    lines.push("| edit | new file | gzip | delta | of the file | byte delta | kind | diff ms | apply ms |");
    lines.push("| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |");
  }
  let gz = "";
  const dir = { "xlsx (2000 rows, 3 sheets)": "testdata/xlsx" }[group];
  if (dir && fs.existsSync(path.join(root, dir, row.name))) gz = kb(zlib.gzipSync(fs.readFileSync(path.join(root, dir, row.name))).length);
  lines.push(`| ${row.name}${row.ok ? "" : " (FAILED)"} | ${kb(row.new)} | ${gz || "–"} | **${kb(row.delta)}** | ${pct(row.delta, row.new)} | ${kb(row.plain)} | ${row.kind} | ${ms(row.diffMs)} | ${ms(row.applyMs)} |`);
}
const h = rows.find((x) => x.group === "history");
if (h) {
  lines.push("");
  lines.push("## History");
  lines.push("");
  lines.push(`${h.name}: the versions together are ${kb(h.full)}; stored as the newest whole and older ones as reverse deltas: **${kb(h.stored)}** ` +
    `(${pct(h.stored, h.full)}). A commit took ${ms(h.commitMs)} ms on average, restoring the oldest version ${ms(h.restoreOldestMs)} ms. ` +
    "From commit 26 on only the picture's recipe changes, which stores no new picture.");
}
lines.push("");
fs.writeFileSync(path.join(root, "BENCHMARK.md"), lines.join("\n"));
console.log(lines.join("\n"));
