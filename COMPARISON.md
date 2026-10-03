# RangerDiff next to other delta tools

Node v22.22.0, Intel(R) Xeon(R) Processor @ 2.80GHz, 2026-10-03. `npm run compare` writes this file.

Each cell is the size of the delta that turns the base file into the new one, and the time to make it. **Bold** is the smallest. "new, gzipped" is what sending the whole new file would cost. RangerDiff's own delta is not entropy-coded; the number in brackets is the same delta deflated, which is what it costs when the storage or the transfer compresses (as Firestore/HTTP do). The other tools compress their output themselves. Tool times include starting the process (a few ms).

Tools: xdelta3 (VCDIFF, `-9`); bsdiff (bzip2); zstd 1.5 `-19 --patch-from` (with `--long`); xdelta3 on the XLSX re-zipped uncompressed (a reference: a byte delta on the parts' own bytes); git (`pack-objects`, the bytes the new version adds to a pack that has the base).

## markdown

| edit | new, gzipped | RangerDiff | xdelta3 | bsdiff | zstd --patch-from | xdelta3, unzipped | git pack |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| typo fixed | 648 B | **33 B (36 B)** · 1.0 ms | 50 B · 72 ms | 179 B · 4.1 ms | 35 B · 5.4 ms | – | 48 B · 9.9 ms |
| slide added (3 decks) | 3.0 kB | 89 B (76 B) · 1.3 ms | 145 B · 73 ms | 220 B · 6.6 ms | **73 B** · 5.9 ms | – | **73 B** · 12 ms |
| slide moved to the end | 2.9 kB | **30 B (33 B)** · 0.7 ms | 46 B · 102 ms | 153 B · 5.2 ms | 33 B · 5.7 ms | – | 48 B · 9.0 ms |

## xlsx (2000 rows, 3 sheets)

| edit | new, gzipped | RangerDiff | xdelta3 | bsdiff | zstd --patch-from | xdelta3, unzipped | git pack |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| edit-cell.xlsx | 102.2 kB | 311 B (223 B) · 139 ms | 80.5 kB · 160 ms | 81.0 kB · 50 ms | 78.5 kB · 24 ms | **214 B** · 164 ms | 101.7 kB · 27 ms |
| edit-row.xlsx | 102.2 kB | 339 B (252 B) · 85 ms | 54.6 kB · 91 ms | 54.3 kB · 40 ms | 52.4 kB · 22 ms | **249 B** · 89 ms | 101.7 kB · 27 ms |
| edit-column.xlsx | 102.2 kB | **3.2 kB (1.9 kB)** · 141 ms | 79.7 kB · 92 ms | 78.6 kB · 47 ms | 75.7 kB · 23 ms | 2.4 kB · 113 ms | 101.8 kB · 30 ms |
| insert-rows.xlsx | 103.4 kB | **1.4 kB (595 B)** · 69 ms | 83.0 kB · 151 ms | 83.4 kB · 49 ms | 80.4 kB · 22 ms | 28.5 kB · 207 ms | 102.9 kB · 28 ms |
| delete-rows.xlsx | 98.1 kB | **339 B (251 B)** · 141 ms | 63.8 kB · 92 ms | 63.8 kB · 42 ms | 61.7 kB · 24 ms | 41.6 kB · 230 ms | 97.7 kB · 29 ms |
| add-sheet.xlsx | 103.0 kB | 1.2 kB (1.1 kB) · 5.9 ms | 2.0 kB · 76 ms | 2.3 kB · 18 ms | 1.7 kB · 27 ms | **639 B** · 84 ms | 2.0 kB · 27 ms |
| style-header.xlsx | 102.2 kB | 562 B (444 B) · 87 ms | 83.2 kB · 144 ms | 83.5 kB · 48 ms | 81.1 kB · 19 ms | **379 B** · 104 ms | 101.7 kB · 33 ms |

## photo (JPEG)

| edit | new, gzipped | RangerDiff | xdelta3 | bsdiff | zstd --patch-from | xdelta3, unzipped | git pack |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| brightness +15 %, re-encoded | 180.1 kB | 183.8 kB (179.8 kB) · 16 ms | 180.6 kB · 120 ms | **176.2 kB** · 102 ms | 177.2 kB · 46 ms | – | 180.0 kB · 45 ms |
| saved again unchanged | 166.0 kB | 22 B (22 B) · 0.9 ms | 39 B · 9.0 ms | 144 B · 27 ms | 40 B · 21 ms | – | **0 B** · 27 ms |

## screenshot (PNG)

| edit | new, gzipped | RangerDiff | xdelta3 | bsdiff | zstd --patch-from | xdelta3, unzipped | git pack |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| rectangle drawn | 13.2 kB | **970 B (401 B)** · 98 ms | 11.9 kB · 82 ms | 13.6 kB · 23 ms | 10.1 kB · 14 ms | – | 12.9 kB · 16 ms |
| text changed | 14.2 kB | **1.7 kB (1.3 kB)** · 86 ms | 13.4 kB · 84 ms | 15.3 kB · 17 ms | 11.7 kB · 16 ms | – | 13.9 kB · 16 ms |

## binary (4 MB)

| edit | new, gzipped | RangerDiff | xdelta3 | bsdiff | zstd --patch-from | xdelta3, unzipped | git pack |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 300 B inserted, 100 kB deleted | 3.72 MB | **338 B (343 B)** · 35 ms | 417 B · 239 ms | 619 B · 943 ms | 666 B · 545 ms | – | 515 B · 301 ms |
| 4 kB header added | 3.82 MB | **4.0 kB (4.0 kB)** · 39 ms | 4.1 kB · 148 ms | 4.6 kB · 909 ms | 4.4 kB · 526 ms | – | 4.2 kB · 336 ms |

## Reading it

- XLSX: the general tools diff the zipped bytes, where one changed cell rewrites the compressed rest of the sheet. RangerDiff diffs the unzipped parts, with row-relative sheet XML (an inserted row does not change every later `r="…"`). The rebuilt workbook has the same parts, stored uncompressed: equal content, not equal bytes. The "xdelta3, unzipped" column shows the two steps apart: unzipping alone gets a byte delta to the same range for edits in place (xdelta3 entropy-codes its output, so it is a little smaller there), and the row-relative form is what keeps inserted and deleted rows small.
- PNG: likewise on the inflated pixels. The rebuilt PNG has the same pixels with an uncompressed IDAT.
- JPEG re-encoded after an edit changes nearly every byte; no byte-level delta helps. Sliqtly keeps the original and the edit (a recipe) instead.
- Text and plain binary are where the general tools are on their home ground: there RangerDiff's aim is to be in the same range, in a library that runs in the browser with no WebAssembly or native code.
