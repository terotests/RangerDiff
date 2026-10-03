// Compile and run every test program in tests/. Exit 1 when one fails.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { root, buildDir, rangerDir, install, compile } from "./lib.mjs";

const ranger = rangerDir();
install(ranger);
const only = process.argv[2];
const tests = fs.readdirSync(path.join(root, "tests"))
  .filter((f) => f.endsWith("Tests.rgr") && (!only || f.startsWith(only)));
let failed = 0;
for (const t of tests) {
  const out = compile(ranger, `tests/${t}`, path.join(buildDir, "tests", t.replace(".rgr", ".cjs")));
  const started = Date.now();
  const r = spawnSync("node", [out], { cwd: root, encoding: "utf8" });
  const text = (r.stdout || "") + (r.stderr || "");
  const summary = text.trim().split("\n").filter((l) => l.startsWith("passed")).pop() || "no summary";
  const ok = r.status === 0 && text.includes("ALL TESTS PASSED");
  console.log(`${ok ? "ok  " : "FAIL"} ${t.padEnd(16)} ${summary} (${Date.now() - started} ms)`);
  if (!ok) {
    failed += 1;
    console.log(text.split("\n").filter((l) => l.startsWith("FAIL") || l.includes("Error")).join("\n"));
  }
}
process.exit(failed ? 1 : 0);
