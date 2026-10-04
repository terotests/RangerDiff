# Real-time editing: RdOt next to Yjs

Node v22.22.0, Intel(R) Xeon(R) Processor @ 2.10GHz, 2026-10-04, Yjs 13.6.33. `npm run bench:collab` writes this file; `-- --check` (CI) only checks that both converge.

RdOt is operational transformation with one server putting the edits in order (`RdOtHub`, the folder server's rules); an edit is the Quill Delta JSON (`[{"retain":5},{"insert":"x"}]`). Yjs is a CRDT: its updates are binary; here they reach each document in the order sent, as through y-websocket. "wire" is every message sent (client to server and server to the others for RdOt; to every other document for Yjs). "state" is what a newcomer loads: the text for RdOt, `Y.encodeStateAsUpdate` for Yjs (which keeps ids and deleted text).

## One person typing (1627 edits on a 6.3 kB deck)

Words typed in the middle with typos taken back, the caret moved now and then, 500 characters deleted and 3 kB pasted; each edit goes to a second editor.

| | time | per edit | wire | per edit | state |
| --- | ---: | ---: | ---: | ---: | ---: |
| RdOt | 105 ms | 64.4 µs | 53.8 kB | 33.9 B | 10.3 kB |
| Yjs | 121 ms | 74.4 µs | 45.2 kB | 28.5 B | 12.3 kB |
| RdDelta of the whole text | 127 ms | 78.0 µs | 38.3 kB | 24.1 B | – |

RdOt's time includes making the delta from the editor's text (the diff), JSON both ways, the hub and the second editor applying it; Yjs's is its own insert/delete and applying the update.

## Many people at once

Each person types words or deletes a few characters at random places; messages wait and arrive late in a random schedule. All copies must end the same.

| people | edits | | time | wire | messages | stale sends | state |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 2 | 600 | RdOt | 37 ms | 38.6 kB | 560 | 108 | 7.6 kB |
| | | Yjs | 37 ms | 9.1 kB | 600 | – | 15.2 kB |
| 8 | 1200 | RdOt | 80 ms | 304.5 kB | 1736 | 190 | 9.0 kB |
| | | Yjs | 195 ms | 125.1 kB | 8393 | – | 23.2 kB |
| 32 | 1920 | RdOt | 210 ms | 1960.2 kB | 4576 | 141 | 10.9 kB |
| | | Yjs | 1494 ms | 868.4 kB | 59520 | – | 32.4 kB |

"Stale sends": edits sent while the person's copy was behind; the hub transforms them over the edits taken since (ot.js's server), so none is refused or sent twice. The schedule here delays messages far more than a local network does, so this is the worst case.
