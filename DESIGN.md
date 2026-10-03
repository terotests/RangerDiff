# Design

## Formats

Every delta starts with `'R' 'D' 1 kind`. Numbers are LEB128 varints,
signed ones zigzag; checksums are 32-bit big-endian.

### kind 1: byte delta (`RdDelta`)

```
varint baseLen · varint newLen · u32 adler32(base) · u32 adler32(new)
ops until newLen bytes are produced:
  varint (len*2+1) · zigzag (off - end of previous COPY)    COPY base[off, off+len)
  varint (len*2)   · len bytes                              ADD
```

Matching: common prefix and suffix first (a single edit is then exact).
The base is indexed by a rolling checksum of each aligned 16-byte block
(32 above 8 MB); the new bytes are scanned one position at a time, a hit is
extended forwards and backwards into the pending ADD. After an edit the
matcher first tries to resynchronise right after the previous COPY (base
`[lastEnd, lastEnd+48)` against target `[t, t+16)`): in repetitive data (XML)
the same block occurs in many places, and a copy from elsewhere would win at
`t` and cut the history into short copies. This took the 286-cell column
edit from 20.8 kB to 3.0 kB.

### kind 2: ZIP container (`RdPack`)

```
varint parts
per part, in the new archive's order:
  text name · u32 crc32(new content) · byte kind
    0 SAME      base part of the same name
    1 DELTA     varint len · byte delta of the uncompressed part
    3 RENAMED   text base name (same content)
    5 SHEET     varint len · byte delta of the row-relative forms (RdXlsx)
    6 RAW       byte method · varint usize · varint len · stored bytes
```

SAME parts keep the base archive's compressed bytes; RAW keeps the new
archive's. DELTA/SHEET parts are written stored (method 0): the parts are
byte for byte, the ZIP wrapper is not. `RdSmart` therefore uses the container
delta only when it is under 80 % of the plain byte delta; `RdRepo` checks
that a non-exact delta still rebuilds the stored bytes before storing it.

Row-relative worksheet (`RdXlsx`): `<row r="1050">` → `<row r="␁R+1">`
(distance from the previous row), `<c r="F1050">` → `<c r="F␁C">`,
`D1050` in a formula → `D␁F0` (distance from the formula's row). 0x01 cannot
occur in XML 1.0. `decode(encode(x)) == x` is checked on every encode, and a
sheet that does not round-trip is diffed as it is.

### kind 3: PNG (`RdPng`)

```
varint len · byte delta of the skeleton · varint len · byte delta of the pixels
```

Skeleton = the file without IDAT data (one empty IDAT marks the place);
pixels = the inflated IDAT stream (filter byte + row bytes). The rebuilt PNG
has the same chunks and pixels with an uncompressed (stored) IDAT; the host
may compress it again.

## Versions (`RdRepo`)

- **blob**: bytes, id = SHA-256 (hex). `crypto.subtle` gives the same ids.
- **tree**: text, one line per file sorted by path:
  `path \t blob \t size [\t recipe]`. A recipe is the host's description of
  a derived file (a picture's adjustments, a crop); changing it does not
  store a new blob.
- **commit**: text `tree X`, `parent Y` (0–2 lines), `author`, `device`,
  `time` (ISO 8601, used for ordering), a blank line, the message.
- **stored object**: `'R' 'O' 1 kind · text id · text base · varint depth ·
  varint len · data`, kind 0 whole, 1 delta against `base`.

When a commit changes a file, the parent's version of that file becomes a
reverse delta against the new one if that is under 80 % of its size and the
chain stays at most 16 deltas long. The newest version is always whole.

The host persists every id `takeDirty()` returns (`stored(id)`), and loads
them back with `load(bytes)`. An id that was stored whole may later be
rewritten as a delta: same id, smaller object.

## Merging

`merge(mine, theirs)` finds the newest common ancestor and compares each
path in the three trees:

- same on both sides → that
- changed on one side only → that side
- changed on both, text file (`.md`, `.css`, `.json`, `.csv`…), same recipe
  → line merge (diff3): edits in different places are combined; edits that
  overlap in the base, or insert at the same line, are a conflict region
  keeping base, mine and theirs
- anything else changed on both → a whole-file choice

`mergedTree(result, picks)` builds the merged tree: per conflicting file
`"mine"`, `"theirs"`, or for a text file a pick per region
(`"mine,theirs,both"`).

## Conflicts in Sliqtly (no live sync)

Each open editor remembers the commit it is editing on (its base). It
checks the deck's head on an interval and when the window gets focus; tabs
of the same browser tell each other at once. If the head moved and there are
no local changes, the newer version is loaded. If both changed, the two are
merged as above: a clean merge is committed with both parents, a conflict is
shown for the user to pick. A write is accepted only if the head is still
the base it was made on (compare-and-set), so nothing is overwritten
unnoticed.
