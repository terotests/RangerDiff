# Benchmark

Node v22.22.0, Intel(R) Xeon(R) Processor @ 2.80GHz, 2026-10-03. `npm run bench` writes this file. "gzip" is the new file gzipped (what sending it whole would cost); "delta" is what RdSmart.diff stores; "byte delta" is the plain RdDelta for comparison. Times are the library compiled to JavaScript.

## markdown

| edit | new file | gzip | delta | of the file | byte delta | kind | diff ms | apply ms |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| typo fixed (raportti.md) | 1.1 kB | – | **33 B** | 2.9 % | 33 B | bytes | 0.26 | 0.75 |
| front matter title changed | 1.1 kB | – | **62 B** | 5.6 % | 62 B | bytes | 0.29 | 0.09 |
| slide added in the middle (3 decks) | 6.3 kB | – | **89 B** | 1.4 % | 89 B | bytes | 0.07 | 0.30 |
| slide deleted (3 decks) | 5.3 kB | – | **23 B** | 0.42 % | 23 B | bytes | 0.31 | 0.16 |
| slide moved to the end (3 decks) | 6.3 kB | – | **30 B** | 0.47 % | 30 B | bytes | 0.24 | 0.13 |
| all text replaced | 6.3 kB | – | **5.8 kB** | 92.8 % | 5.8 kB | bytes | 5.52 | 0.44 |

## xlsx (2000 rows, 3 sheets)

| edit | new file | gzip | delta | of the file | byte delta | kind | diff ms | apply ms |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| edit-cell.xlsx | 104.3 kB | 102.2 kB | **311 B** | 0.29 % | 82.3 kB | container | 114 | 51 |
| edit-row.xlsx | 104.3 kB | 102.2 kB | **339 B** | 0.32 % | 55.9 kB | container | 102 | 45 |
| edit-column.xlsx | 104.3 kB | 102.2 kB | **3.2 kB** | 3.1 % | 82.4 kB | container | 84 | 43 |
| insert-rows.xlsx | 105.7 kB | 103.4 kB | **1.4 kB** | 1.4 % | 85.6 kB | container | 65 | 43 |
| delete-rows.xlsx | 100.1 kB | 98.1 kB | **339 B** | 0.33 % | 65.0 kB | container | 65 | 45 |
| add-sheet.xlsx | 105.2 kB | 103.0 kB | **1.2 kB** | 1.2 % | 2.0 kB | container | 5.50 | 1.85 |
| style-header.xlsx | 104.4 kB | 102.2 kB | **562 B** | 0.53 % | 85.1 kB | container | 71 | 71 |

## photo (JPEG 1600x1067)

| edit | new file | gzip | delta | of the file | byte delta | kind | diff ms | apply ms |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| brightness +15 %, re-encoded | 185.0 kB | – | **183.8 kB** | 99.3 % | 183.8 kB | bytes | 16 | 1.23 |
| cropped, re-encoded | 132.7 kB | – | **131.6 kB** | 99.2 % | 131.6 kB | bytes | 14 | 0.85 |
| saved again unchanged | 171.1 kB | – | **22 B** | 0.01 % | 22 B | bytes | 0.69 | 0.76 |

## screenshot (PNG 1280x800)

| edit | new file | gzip | delta | of the file | byte delta | kind | diff ms | apply ms |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| rectangle drawn | 27.6 kB | – | **970 B** | 3.4 % | 23.3 kB | png | 89 | 80 |
| text changed | 28.0 kB | – | **1.7 kB** | 6.0 % | 23.6 kB | png | 83 | 84 |

## binary (4 MB)

| edit | new file | gzip | delta | of the file | byte delta | kind | diff ms | apply ms |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| 300 bytes inserted, 100 kB deleted | 3808.9 kB | – | **338 B** | 0.01 % | 338 B | bytes | 27 | 16 |
| 4 kB header added | 3910.3 kB | – | **4.0 kB** | 0.10 % | 4.0 kB | bytes | 27 | 17 |

## History

deck + picture, 50 commits: the versions together are 1686.3 kB; stored as the newest whole and older ones as reverse deltas: **53.1 kB** (3.1 %). A commit took 11 ms on average, restoring the oldest version 1.84 ms. From commit 26 on only the picture's recipe changes, which stores no new picture.
