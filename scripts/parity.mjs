// The strict-Rust port (rs/) against itself on every target and against the
// .rgr library:
//   1. cargo run in rs/parity: the ported tests, then digest lines
//   2. rgrc rs/parity/src/main.rs for es6, go and cpp (a missing toolchain
//      is skipped): each must print exactly what cargo printed
//   3. parity/Parity.rgr with the .rgr library: its digest lines must equal
//      the Rust ones
// Exit 1 on any difference.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { root, buildDir, rangerDir, install, compile } from "./lib.mjs";

const ranger = rangerDir();
const rgrc = path.join(ranger, "dist", "rgrc.js");
const out = path.join(buildDir, "parity");
fs.mkdirSync(out, { recursive: true });
let failed = 0;

function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "", error: r.error };
}

function has(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  return !r.error && r.status === 0;
}

function report(name, ok, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? " " + detail : ""}`);
  if (!ok) failed += 1;
}

const crate = path.join(root, "rs", "parity");
const native = run("cargo", ["run", "--quiet", "--manifest-path", path.join(crate, "Cargo.toml"), "--target-dir", path.join(out, "cargo")]);
if (native.status !== 0 || !native.stdout.includes("ALL TESTS PASSED")) {
  console.log(native.stdout + native.stderr);
  report("rust native (cargo run)", false);
  process.exit(1);
}
report("rust native (cargo run)", true, native.stdout.split("\n").find((l) => l.startsWith("passed")));
const expected = native.stdout;

const targets = [
  { l: "es6", file: "parity.cjs", tool: ["node", ["--version"]], exec: (d) => run("node", [path.join(d, "parity.cjs")]) },
  { l: "go", file: "parity.go", tool: ["go", ["version"]], exec: (d) => {
      // built in its own directory, run from the repository root as the others (the tests read testdata/)
      const b = run("go", ["build", "-o", "parity", "parity.go"], d);
      if (b.status !== 0) return b;
      return run(path.join(d, "parity"), []);
    },
  },
  {
    l: "cpp",
    file: "parity.cpp",
    tool: ["g++", ["--version"]],
    exec: (d) => {
      const b = run("g++", ["-std=c++17", "-O2", "-o", path.join(d, "parity"), path.join(d, "parity.cpp")]);
      if (b.status !== 0) return b;
      return run(path.join(d, "parity"), []);
    },
  },
];
for (const t of targets) {
  if (!has(...t.tool)) {
    console.log(`skip ${t.l}: no ${t.tool[0]}`);
    continue;
  }
  const d = path.join(out, t.l);
  fs.mkdirSync(d, { recursive: true });
  const c = run("node", [rgrc, `-l=${t.l}`, path.relative(root, path.join(crate, "src", "main.rs")), `-d=${d}`, `-o=${t.file}`]);
  const log = c.stdout + c.stderr;
  if (c.status !== 0 || /\[FAIL\]/.test(log)) {
    console.log(log.split("\n").filter((l) => l.includes("FAIL")).join("\n"));
    report(`rgrc -l=${t.l}`, false);
    continue;
  }
  const started = Date.now();
  const r = t.exec(d);
  report(`rgrc -l=${t.l} prints what cargo printed`, r.stdout === expected, `(${Date.now() - started} ms)`);
  if (r.stdout !== expected) {
    const a = expected.split("\n");
    const b = r.stdout.split("\n");
    const i = a.findIndex((l, k) => l !== b[k]);
    console.log(`  first difference at line ${i + 1}:\n  cargo: ${a[i]}\n  ${t.l}:   ${b[i]}\n${r.stderr.slice(0, 2000)}`);
  }
}

install(ranger);
const rgrOut = compile(ranger, "parity/Parity.rgr", path.join(out, "rgr", "parity.cjs"));
const rgr = run("node", [rgrOut]);
const digests = expected.split("\n").filter((l) => l.startsWith("digest")).join("\n");
const rgrDigests = rgr.stdout.split("\n").filter((l) => l.startsWith("digest")).join("\n");
report(".rgr library prints the same digests", digests === rgrDigests && digests.length > 0);
if (digests !== rgrDigests) {
  const a = digests.split("\n");
  const b = rgrDigests.split("\n");
  const i = a.findIndex((l, k) => l !== b[k]);
  console.log(`  first difference:\n  rust: ${a[i]}\n  rgr:  ${b[i]}`);
}
process.exit(failed ? 1 : 0);
