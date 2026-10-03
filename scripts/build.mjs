// The library as one ES module: dist/rangerdiff.mjs
import path from "node:path";
import { root, rangerDir, install, compile } from "./lib.mjs";

const ranger = rangerDir();
install(ranger);
const out = compile(ranger, "src/RangerDiff.rgr", path.join(root, "dist", "rangerdiff.mjs"), ["-esm"]);
console.log(`wrote ${path.relative(root, out)}`);
