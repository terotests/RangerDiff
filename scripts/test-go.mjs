// The real-time editing tests (tests/OtTests.rgr) compiled to Go and run:
// RdOt's counts are UTF-16 units on every target, and Sliqtly's folder
// server runs this code as Go. Needs `go` on the PATH.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { root, buildDir, rangerDir, install } from "./lib.mjs";

const ranger = rangerDir();
install(ranger);
const outDir = path.join(buildDir, "go-ot");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const c = spawnSync("node", [path.join(ranger, "dist", "rgrc.js"), "-l=go", "tests/OtTests.rgr", `-d=${outDir}`, "-o=ot.go", "-nodecli"],
  { cwd: root, encoding: "utf8" });
const log = (c.stdout || "") + (c.stderr || "");
if (c.status !== 0 || /\[FAIL\]|Compilation FAILED/.test(log) || !fs.existsSync(path.join(outDir, "ot.go"))) {
  console.error(log);
  console.error("compile failed: tests/OtTests.rgr (go)");
  process.exit(1);
}
fs.writeFileSync(path.join(outDir, "go.mod"), "module rdot\n\ngo 1.21\n");
const r = spawnSync("go", ["run", "."], { cwd: outDir, encoding: "utf8" });
const text = (r.stdout || "") + (r.stderr || "");
const summary = text.trim().split("\n").filter((l) => l.startsWith("passed")).pop() || "no summary";
const ok = r.status === 0 && text.includes("ALL TESTS PASSED");
console.log(`${ok ? "ok  " : "FAIL"} OtTests.rgr (go) ${summary}`);
if (!ok) console.log(text.split("\n").filter((l) => l.startsWith("FAIL") || /error|panic/i.test(l)).join("\n"));
process.exit(ok ? 0 : 1);
