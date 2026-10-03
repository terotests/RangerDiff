// Shared by the scripts: where the Ranger compiler is, and how to compile.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const buildDir = path.join(root, "build");

// RANGER_DIR, else a Ranger checkout next to this repository
export function rangerDir() {
  const dir = process.env.RANGER_DIR || path.resolve(root, "..", "Ranger");
  if (!fs.existsSync(path.join(dir, "dist", "rgrc.js"))) {
    console.error(`Ranger compiler not found in ${dir}. Clone terotests/Ranger next to this repository or set RANGER_DIR.`);
    process.exit(2);
  }
  return dir;
}

// fetch the packages ranger.json names (lib/zip and lib/core of Ranger)
export function install(ranger) {
  execFileSync("node", [path.join(ranger, "dist", "rgrc.js"), "install"], { cwd: root, stdio: "inherit" });
}

// compile a .rgr file; returns the output path, exits on a failed build
export function compile(ranger, src, out, flags = []) {
  const outDir = path.dirname(out);
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync("node", [path.join(ranger, "dist", "rgrc.js"), "-es6", ...flags, src, `-d=${outDir}`, `-o=${path.basename(out)}`],
    { cwd: root, encoding: "utf8" });
  const log = (r.stdout || "") + (r.stderr || "");
  // compilers up to 3.5.1 exit 0 on a failed build: read the log too
  if (r.status !== 0 || /\[FAIL\]|Compilation FAILED/.test(log)) {
    console.error(log);
    console.error(`compile failed: ${src}`);
    process.exit(1);
  }
  return out;
}
