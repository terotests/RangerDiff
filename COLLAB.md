# Real-time editing: RdOt next to Yjs

Node v22.22.0, Intel(R) Xeon(R) Processor @ 2.10GHz, 2026-10-04, Yjs 13.6.33. `npm run bench:collab` writes this file; `-- --check` (CI) only checks that both converge.

RdOt is operational transformation with one server putting the edits in order (`RdOtHub`, the folder server's rules); an edit is the Quill Delta JSON (`[{"retain":5},{"insert":"x"}]`). Yjs is a CRDT: its updates are binary; here they reach each document in the order sent, as through y-websocket. "wire" is every message sent (client to server and server to the others for RdOt; to every other document for Yjs). "state" is what a newcomer loads: the text for RdOt, `Y.encodeStateAsUpdate` for Yjs (which keeps ids and deleted text).

## One person typing (1627 edits on a 6.3 kB deck)

Words typed in the middle with typos taken back, the caret moved now and then, 500 characters deleted and 3 kB pasted; each edit goes to a second editor.

| | time | per edit | wire | per edit | state |
| --- | ---: | ---: | ---: | ---: | ---: |
| RdOt | 98 ms | 60.2 µs | 53.8 kB | 33.9 B | 10.3 kB |
| Yjs | 100 ms | 61.2 µs | 45.2 kB | 28.5 B | 12.3 kB |
| RdDelta of the whole text | 126 ms | 77.4 µs | 38.3 kB | 24.1 B | – |

RdOt's time includes making the delta from the editor's text (the diff), JSON both ways, the hub and the second editor applying it; Yjs's is its own insert/delete and applying the update.

## Many people at once

Each person types words or deletes a few characters at random places; messages wait and arrive late in a random schedule. All copies must end the same.

| people | edits | | time | wire | messages | stale sends | state |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 2 | 600 | RdOt | 33 ms | 48.8 kB | 654 | 170 | 7.6 kB |
| | | Yjs | 35 ms | 9.1 kB | 600 | – | 15.2 kB |
| 8 | 1200 | RdOt | 87 ms | 456.1 kB | 2325 | 845 | 9.0 kB |
| | | Yjs | 255 ms | 125.1 kB | 8393 | – | 23.2 kB |
| 32 | 1920 | RdOt | 172 ms | 2191.8 kB | 6780 | 2300 | 10.9 kB |
| | | Yjs | 1640 ms | 868.4 kB | 59520 | – | 32.4 kB |

"Stale sends": an edit sent while the person's copy was behind is refused and sent again after the missed edits (Firepad's way, which keeps the transform in the client only). The schedule here delays messages far more than a local network does, so this is the worst case; on the folder server the missed edits come back in the refusal itself.
