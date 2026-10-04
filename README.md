# RangerDiff

Deltas and git-like versions for documents, written in
[Ranger](https://github.com/terotests/Ranger) and compiled to JavaScript
(and the other Ranger targets). Made for [Sliqtly](https://github.com/terotests/Sliqtly):
version history with commits, viewing what changed, restoring, and merging
when the same presentation was edited in two places.

| | |
| --- | --- |
| `RdDelta` | byte delta: the new version as `COPY offset length` and `ADD bytes` against the old one. Insert, delete, offset + rewrite and a grown header are each a few operations; the moved tail is one COPY. Editors can also give the edit directly: `insertAt`, `deleteAt`, `rewriteAt`, `replaceAt`. Checksummed (Adler-32 of base and result). |
| `RdPack` | segmented delta of a ZIP container (XLSX, DOCX, PPTX): part by part on the uncompressed XML, unchanged parts by reference and kept compressed. Worksheets are diffed in a row-relative form (`RdXlsx`), so inserting rows does not change every row below. |
| `RdPng` | PNG delta on the inflated pixel rows instead of the compressed bytes. |
| `RdSmart` | picks the right one of the above per file. |
| `RdText` | line diff (Myers), unified view, three-way merge (diff3) with conflict regions. |
| `RdOt` | real-time editing: text deltas in the Quill Delta form (`retain` / `insert` / `delete`, UTF-16 lengths), apply, compose, invert, transform, caret transform, a diff that never splits a surrogate pair. `RdOtClient` is one editor's side (ot.js's client), `RdOtHub` the server's (one order, an edit on an older revision transformed over the ones since). Next to Yjs in [COLLAB.md](COLLAB.md). |
| `RdRepo` | blobs (SHA-256), trees (path → blob + optional recipe), commits with parents. The newest version is stored whole, older ones as reverse deltas. Log, diff between commits, merge base, three-way merge of two commits. Storage is the host's: `takeDirty()` / `stored(id)` / `load(bytes)`. |

Photos (JPEG): a re-encoded photo has no useful byte delta (see the
benchmark). Keep the original once and the edit as a recipe in the tree
entry (`{"bright":20}`, a crop…); a recipe-only change stores no picture.

The design and the reasons are in [DESIGN.md](DESIGN.md); sizes and speed
in [BENCHMARK.md](BENCHMARK.md), and next to xdelta3, bsdiff, zstd
`--patch-from` and git in [COMPARISON.md](COMPARISON.md).

## Use from JavaScript

`dist/rangerdiff.mjs` is the library as an ES module. A Ranger `buffer` is
an `ArrayBuffer` with a `DataView` in `_view`:

```js
import { RdSmart, RdRepo } from "./rangerdiff.mjs";

const buf = (u8) => { const ab = u8.slice().buffer; ab._view = new DataView(ab); return ab; };
const delta = RdSmart.diff(buf(oldBytes), buf(newBytes));
const r = RdSmart.apply(buf(oldBytes), delta);   // r.ok, r.error, r.data
```

## Develop

Needs Node 18+ and a [Ranger](https://github.com/terotests/Ranger) checkout
next to this one (or `RANGER_DIR=/path/to/Ranger`).

```
npm test          # compile and run tests/*Tests.rgr
npm run bench     # writes BENCHMARK.md
npm run bench:collab  # writes COLLAB.md (RdOt next to Yjs; npm install first)
npm run compare   # writes COMPARISON.md (xdelta3, bsdiff, zstd, git on PATH)
npm run build     # writes dist/rangerdiff.mjs (commit it)
npm run testdata  # regenerates testdata/xlsx and testdata/images (openpyxl, Pillow)
```

`testdata/md` holds sample decks from Sliqtly.

## License

MIT
