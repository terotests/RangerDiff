// npm run compare: RangerDiff's deltas next to the tools usually used for
// the same job, on the benchmark's files. Writes COMPARISON.md.
//
//   xdelta3     VCDIFF (RFC 3284), `xdelta3 -e -9 -s base new`
//   bsdiff      `bsdiff base new patch` (bzip2-compressed, made for executables)
//   zstd        `zstd -19 --patch-from=base new` (zstd's dictionary delta)
//   git         what the new version adds to a pack that has the base
//               (`git pack-objects`, zlib + git's delta)
//
// The tools must be on PATH (apt install xdelta3 bsdiff zstd git); a missing
// one is left out. Times are wall-clock, the tools' process start included,
// RangerDiff's the library compiled to JavaScript in this process.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { RdSmart } from "../dist/rangerdiff.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rd-compare-"));
const has = (cmd) => spawnSync("sh", ["-c", `command -v ${cmd}`]).status === 0;

const rb = (u8) => {
  const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  ab._view = new DataView(ab);
  return ab;
};
const read = (dir, name) => new Uint8Array(fs.readFileSync(path.join(root, dir, name)));
const text = (s) => new TextEncoder().encode(s);

// --- the cases (as bench/Bench.rgr makes them)
const cases = [];
const add = (group, name, base, target) => cases.push({ group, name, base, target });
{
  const deck = fs.readFileSync(path.join(root, "testdata/md/raportti.md"), "utf8");
  const long = [deck, fs.readFileSync(path.join(root, "testdata/md/esittely.md"), "utf8"), fs.readFileSync(path.join(root, "testdata/md/talous.en.md"), "utf8")].join("\n\n");
  add("markdown", "typo fixed", text(deck), text(deck.replace("kasvoi", "kasvoi selvästi")));
  const slide = "\n## Uusi dia\n\n- ensimmäinen kohta\n- toinen kohta\n- kolmas kohta\n";
  const mid = Math.floor(long.length / 2);
  const at = mid + long.slice(mid).indexOf("\n## ");
  add("markdown", "slide added (3 decks)", text(long), text(long.slice(0, at) + slide + long.slice(at)));
  const end2 = at + 4 + long.slice(at + 4).indexOf("\n## ");
  add("markdown", "slide moved to the end", text(long), text(long.slice(0, at) + long.slice(end2) + long.slice(at, end2)));
}
{
  const base = read("testdata/xlsx", "base.xlsx");
  for (const n of ["edit-cell.xlsx", "edit-row.xlsx", "edit-column.xlsx", "insert-rows.xlsx", "delete-rows.xlsx", "add-sheet.xlsx", "style-header.xlsx"]) {
    add("xlsx (2000 rows, 3 sheets)", n, base, read("testdata/xlsx", n));
  }
}
{
  const jpg = read("testdata/images", "photo.jpg");
  add("photo (JPEG)", "brightness +15 %, re-encoded", jpg, read("testdata/images", "photo-brighter.jpg"));
  add("photo (JPEG)", "saved again unchanged", jpg, read("testdata/images", "photo-resaved.jpg"));
  const png = read("testdata/images", "shot.png");
  add("screenshot (PNG)", "rectangle drawn", png, read("testdata/images", "shot-annotated.png"));
  add("screenshot (PNG)", "text changed", png, read("testdata/images", "shot-text.png"));
}
{
  // random bytes (Park–Miller), as RdRandom
  let seed = 2026;
  const bytes = (n) => {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      seed = (seed * 16807) % 2147483647;
      out[i] = seed & 255;
    }
    return out;
  };
  const big = bytes(4000000);
  const cat = (...parts) => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };
  add("binary (4 MB)", "300 B inserted, 100 kB deleted", big, cat(big.subarray(0, 1000000), bytes(300), big.subarray(1000000, 2500000), big.subarray(2600000)));
  add("binary (4 MB)", "4 kB header added", big, cat(bytes(4096), big));
}

// --- the tools
function timed(fn) {
  const t0 = performance.now();
  const v = fn();
  return { v, ms: performance.now() - t0 };
}
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: tmp, encoding: "buffer", maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}: ${r.stderr}`);
  return r;
}
const size = (f) => fs.statSync(path.join(tmp, f)).size;

const tools = [];
tools.push({
  name: "RangerDiff",
  diff(c) {
    const { v, ms } = timed(() => RdSmart.diff(rb(c.base), rb(c.target)));
    const gz = zlib.deflateRawSync(Buffer.from(v), { level: 9 }).length;
    return { size: v.byteLength, gz, ms };
  },
});
if (has("xdelta3")) {
  tools.push({
    name: "xdelta3",
    diff() {
      const { ms } = timed(() => run("xdelta3", ["-e", "-9", "-f", "-s", "base", "new", "x.vcdiff"]));
      return { size: size("x.vcdiff"), ms };
    },
  });
}
if (has("bsdiff")) {
  tools.push({
    name: "bsdiff",
    diff() {
      const { ms } = timed(() => run("bsdiff", ["base", "new", "b.patch"]));
      return { size: size("b.patch"), ms };
    },
  });
}
if (has("zstd")) {
  tools.push({
    name: "zstd --patch-from",
    diff(c) {
      const long = Math.max(27, Math.ceil(Math.log2(Math.max(c.base.length, c.target.length) * 2)));
      const { ms } = timed(() => run("zstd", ["-q", "-f", "-19", `--long=${long}`, "--patch-from=base", "new", "-o", "z.zst"]));
      return { size: size("z.zst"), ms };
    },
  });
}
// The XLSX cases once more with both workbooks re-zipped uncompressed: how
// far a byte delta gets on the parts' bytes alone (RangerDiff also makes the
// sheet XML row-relative).
if (has("xdelta3") && has("python3")) {
  tools.push({
    name: "xdelta3, unzipped",
    only: (c) => c.group.startsWith("xlsx"),
    diff() {
      const store = "import zipfile,sys\nfor a,b in ((sys.argv[1],sys.argv[2]),(sys.argv[3],sys.argv[4])):\n  i=zipfile.ZipFile(a); o=zipfile.ZipFile(b,'w',zipfile.ZIP_STORED)\n  [o.writestr(n,i.read(n)) for n in i.namelist()]; o.close()";
      run("python3", ["-c", store, "base", "base.stored", "new", "new.stored"]);
      const { ms } = timed(() => run("xdelta3", ["-e", "-9", "-f", "-s", "base.stored", "new.stored", "u.vcdiff"]));
      return { size: size("u.vcdiff"), ms };
    },
  });
}
if (has("git")) {
  tools.push({
    name: "git pack",
    diff() {
      const repo = path.join(tmp, "repo.git");
      fs.rmSync(repo, { recursive: true, force: true });
      run("git", ["init", "-q", "--bare", repo]);
      const id = (f) => run("git", ["--git-dir", repo, "hash-object", "-w", f]).stdout.toString().trim();
      const a = id("base");
      const b = id("new");
      const pack = (ids) => run("git", ["--git-dir", repo, "pack-objects", "--stdout", "--window=50", "--depth=50"], { input: Buffer.from(ids.join("\n") + "\n") }).stdout.length;
      const { v, ms } = timed(() => pack([a, b]) - pack([a]));
      return { size: Math.max(0, v), ms };
    },
  });
}

// --- run
const rows = [];
for (const c of cases) {
  fs.writeFileSync(path.join(tmp, "base"), c.base);
  fs.writeFileSync(path.join(tmp, "new"), c.target);
  const row = { ...c, gzip: zlib.gzipSync(Buffer.from(c.target), { level: 9 }).length, results: {} };
  for (const t of tools) {
    if (t.only && !t.only(c)) {
      row.results[t.name] = { skip: true };
      continue;
    }
    try {
      row.results[t.name] = t.diff(c);
    } catch (e) {
      row.results[t.name] = { error: String(e.message || e).slice(0, 80) };
    }
  }
  rows.push(row);
  process.stderr.write(".");
}
process.stderr.write("\n");
fs.rmSync(tmp, { recursive: true, force: true });

// --- COMPARISON.md
const kb = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} kB` : `${(n / 1048576).toFixed(2)} MB`);
const ms = (v) => (v < 10 ? v.toFixed(1) : v.toFixed(0));
const names = tools.map((t) => t.name);
const L = [];
L.push("# RangerDiff next to other delta tools");
L.push("");
L.push(`Node ${process.version}, ${os.cpus()[0]?.model || os.arch()}, ${new Date().toISOString().slice(0, 10)}. \`npm run compare\` writes this file.`);
L.push("");
L.push("Each cell is the size of the delta that turns the base file into the new one, and the time to make it. " +
  "**Bold** is the smallest. \"new, gzipped\" is what sending the whole new file would cost. " +
  "RangerDiff's own delta is not entropy-coded; the number in brackets is the same delta deflated, " +
  "which is what it costs when the storage or the transfer compresses (as Firestore/HTTP do). " +
  "The other tools compress their output themselves. Tool times include starting the process (a few ms).");
L.push("");
L.push("Tools: " + [
  "xdelta3 (VCDIFF, `-9`)",
  "bsdiff (bzip2)",
  "zstd 1.5 `-19 --patch-from` (with `--long`)",
  "xdelta3 on the XLSX re-zipped uncompressed (a reference: a byte delta on the parts' own bytes)",
  "git (`pack-objects`, the bytes the new version adds to a pack that has the base)",
].join("; ") + ".");
let group = "";
for (const r of rows) {
  if (r.group !== group) {
    group = r.group;
    L.push("");
    L.push(`## ${group}`);
    L.push("");
    L.push(`| edit | new, gzipped | ${names.join(" | ")} |`);
    L.push(`| --- | ---: | ${names.map(() => "---:").join(" | ")} |`);
  }
  const sizes = names.map((n) => (r.results[n].error || r.results[n].skip ? Infinity : n === "RangerDiff" ? Math.min(r.results[n].size, r.results[n].gz) : r.results[n].size));
  const best = Math.min(...sizes);
  const cells = names.map((n, i) => {
    const x = r.results[n];
    if (x.skip) return "–";
    if (x.error) return "failed";
    const s = n === "RangerDiff" ? `${kb(x.size)} (${kb(x.gz)})` : kb(x.size);
    return `${sizes[i] === best ? `**${s}**` : s} · ${ms(x.ms)} ms`;
  });
  L.push(`| ${r.name} | ${kb(r.gzip)} | ${cells.join(" | ")} |`);
}
L.push("");
L.push("## Reading it");
L.push("");
L.push("- XLSX: the general tools diff the zipped bytes, where one changed cell rewrites the compressed rest of the sheet. " +
  "RangerDiff diffs the unzipped parts, with row-relative sheet XML (an inserted row does not change every later `r=\"…\"`). " +
  "The rebuilt workbook has the same parts, stored uncompressed: equal content, not equal bytes. " +
  "The \"xdelta3, unzipped\" column shows the two steps apart: unzipping alone gets a byte delta to the same range for edits in place " +
  "(xdelta3 entropy-codes its output, so it is a little smaller there), and the row-relative form is what keeps inserted and deleted rows small.");
L.push("- PNG: likewise on the inflated pixels. The rebuilt PNG has the same pixels with an uncompressed IDAT.");
L.push("- JPEG re-encoded after an edit changes nearly every byte; no byte-level delta helps. Sliqtly keeps the original and the edit (a recipe) instead.");
L.push("- Text and plain binary are where the general tools are on their home ground: there RangerDiff's aim is to be in the same range, in a library that runs in the browser with no WebAssembly or native code.");
L.push("");
fs.writeFileSync(path.join(root, "COMPARISON.md"), L.join("\n"));
console.log(L.join("\n"));
