//! A byte delta: the new version as COPY and ADD operations against the old
//! one.
//!
//! ```text
//!   COPY off len   take bytes [off, off+len) of the base
//!   ADD  bytes     put these bytes in
//! ```
//!
//! Encoded form ("RD" 1 1):
//!
//! ```text
//!   'R' 'D' version=1 kind=1
//!   varint baseLen · varint newLen · u32 adler32(base) · u32 adler32(new)
//!   ops until newLen bytes are produced:
//!     varint (len * 2 + 1) · zigzag (off - end of the previous COPY)   COPY
//!     varint (len * 2)     · len bytes                                 ADD
//! ```
//!
//! Finding the copies: the base is indexed by a rolling checksum of every
//! aligned BLOCK-byte block; the new bytes are scanned one position at a time
//! and a hit is extended forwards and, into the pending ADD, backwards. A
//! common prefix and suffix are taken first, which makes a single edit exact
//! and fast.
use crate::bytes::{adler32, Reader, Writer};

/// One operation of a delta.
#[derive(Clone)]
pub struct Op {
    /// 0 ADD, 1 COPY
    pub kind: i64,
    /// COPY: the base offset
    pub off: i64,
    pub len: i64,
    /// ADD: the bytes
    pub data: Vec<u8>,
}

impl Op {
    /// Whether this is a COPY.
    pub fn is_copy(&self) -> bool {
        self.kind == 1
    }
}

/// What a delta says, read without applying it.
pub struct DeltaInfo {
    pub ok: bool,
    pub error: String,
    pub base_len: i64,
    pub new_len: i64,
    pub base_sum: i64,
    pub new_sum: i64,
    pub copy_bytes: i64,
    pub add_bytes: i64,
    pub copies: i64,
    pub adds: i64,
    pub ops: Vec<Op>,
}

/// The new version, or why there is none.
pub struct ApplyResult {
    pub ok: bool,
    pub error: String,
    pub data: Vec<u8>,
}

/// Collects operations, merges neighbouring copies, writes the encoded delta.
pub struct DeltaWriter {
    pub kinds: Vec<i64>,
    pub offs: Vec<i64>,
    pub lens: Vec<i64>,
    /// each ADD's bytes; empty for a COPY
    pub adds: Vec<Vec<u8>>,
    pub total: i64,
}

impl DeltaWriter {
    /// No operations yet.
    pub fn new() -> DeltaWriter {
        DeltaWriter { kinds: Vec::new(), offs: Vec::new(), lens: Vec::new(), adds: Vec::new(), total: 0 }
    }

    /// COPY base[off, off+len); continues the previous COPY when it ends at `off`.
    pub fn copy(&mut self, off: i64, len: i64) {
        if len <= 0 {
            return;
        }
        let n = self.kinds.len();
        if n > 0 {
            let k = n - 1;
            if self.kinds[k] == 1 && self.offs[k] + self.lens[k] == off {
                self.lens[k] = self.lens[k] + len;
                self.total = self.total + len;
                return;
            }
        }
        self.kinds.push(1);
        self.offs.push(off);
        self.lens.push(len);
        self.adds.push(Vec::new());
        self.total = self.total + len;
    }

    /// ADD src[off, off+len).
    pub fn add(&mut self, src: &Vec<u8>, off: i64, len: i64) {
        if len <= 0 {
            return;
        }
        let mut part: Vec<u8> = Vec::new();
        let mut i = off;
        while i < off + len {
            part.push(src[i as usize]);
            i += 1;
        }
        self.kinds.push(0);
        self.offs.push(0);
        self.lens.push(len);
        self.adds.push(part);
        self.total = self.total + len;
    }

    /// The encoded delta.
    pub fn encode(&self, base_len: i64, base_sum: i64, new_sum: i64) -> Vec<u8> {
        let mut w = Writer::new();
        w.byte(82);
        w.byte(68);
        w.byte(1);
        w.byte(1);
        w.varint(base_len);
        w.varint(self.total);
        w.u32(base_sum);
        w.u32(new_sum);
        let mut last_end: i64 = 0;
        let mut i = 0;
        while i < self.kinds.len() {
            let len = self.lens[i];
            if self.kinds[i] == 1 {
                let off = self.offs[i];
                w.varint(len * 2 + 1);
                w.zigzag(off - last_end);
                last_end = off + len;
            } else {
                w.varint(len * 2);
                w.all(&self.adds[i]);
            }
            i += 1;
        }
        w.to_bytes()
    }
}

/// Block size of the base index.
pub fn block_for(base_len: i64) -> i64 {
    if base_len > 8388608 {
        return 32;
    }
    16
}

/// The delta that turns `base` into `target`.
pub fn diff(base: &Vec<u8>, target: &Vec<u8>) -> Vec<u8> {
    let w = ops(base, target);
    w.encode(base.len() as i64, adler32(base), adler32(target))
}

/// The operations that turn `base` into `target`.
pub fn ops(base: &Vec<u8>, target: &Vec<u8>) -> DeltaWriter {
    let mut w = DeltaWriter::new();
    let bl = base.len() as i64;
    let tl = target.len() as i64;
    // common prefix and suffix
    let mut p: i64 = 0;
    let mut lim = bl;
    if tl < lim {
        lim = tl;
    }
    while p < lim && base[p as usize] == target[p as usize] {
        p += 1;
    }
    let mut s: i64 = 0;
    while s + p < lim && base[(bl - 1 - s) as usize] == target[(tl - 1 - s) as usize] {
        s += 1;
    }
    w.copy(0, p);
    match_middle(&mut w, base, target, p, tl - s);
    w.copy(bl - s, s);
    w
}

/// The new bytes [start, end) as COPYs and ADDs.
pub fn match_middle(w: &mut DeltaWriter, base: &Vec<u8>, target: &Vec<u8>, start: i64, end: i64) {
    let bl = base.len() as i64;
    let bsz = block_for(bl);
    let nblocks = bl / bsz;
    if nblocks == 0 || end - start < bsz {
        w.add(target, start, end - start);
        return;
    }
    // hash table: head[h] = block index + 1, next[block] = older block + 1
    let mut tsize: i64 = 1024;
    while tsize < nblocks * 2 {
        tsize = tsize * 2;
    }
    let mask = tsize - 1;
    let mut head: Vec<i64> = vec![0; tsize as usize];
    let mut next: Vec<i64> = vec![0; nblocks as usize];
    let mut bi: i64 = 0;
    while bi < nblocks {
        let h = block_hash(base, bi * bsz, bsz, mask);
        next[bi as usize] = head[h as usize];
        head[h as usize] = bi + 1;
        bi += 1;
    }
    // scan the new bytes with a rolling checksum
    let mut lit = start;
    let mut t = start;
    let mut a: i64 = 0;
    let mut b: i64 = 0;
    let mut fresh = true;
    let mut last_end: i64 = -1;
    while t + bsz <= end {
        if fresh {
            a = 0;
            b = 0;
            let mut k: i64 = 0;
            while k < bsz {
                let x = target[(t + k) as usize] as i64;
                a = a + x;
                b = b + a;
                k += 1;
            }
            fresh = false;
        }
        let mut best_off: i64 = -1;
        let mut best_fwd: i64 = 0;
        let mut best_back: i64 = 0;
        // the base right after the previous COPY first: an in-place rewrite
        // continues there
        if last_end >= 0 {
            let fwd0 = forward(base, last_end, target, t, end);
            if fwd0 >= bsz {
                best_off = last_end;
                best_fwd = fwd0;
            }
        }
        let h = (b * 4099 + a) & mask;
        let mut cand = head[h as usize];
        let mut tries = 0;
        while cand > 0 && tries < 32 {
            let c = (cand - 1) * bsz;
            let fwd = forward(base, c, target, t, end);
            if fwd >= bsz {
                let back = backward(base, c, target, t, lit);
                if fwd + back > best_fwd + best_back {
                    best_off = c;
                    best_fwd = fwd;
                    best_back = back;
                }
            }
            cand = next[(cand - 1) as usize];
            tries += 1;
        }
        // resync after an edit: repetitive data (XML) has the same block in
        // many places, and a copy from somewhere else can win at t although
        // the edited file continues right after the previous COPY. Try base
        // [lastEnd, lastEnd+48) against target [t, t+16)
        let mut best_t = t;
        if last_end >= 0 && t - lit < 64 && best_fwd < 4096 {
            let mut gain = best_fwd + best_back;
            let mut k2: i64 = 0;
            while k2 < 16 && t + k2 < end {
                let mut j2: i64 = 0;
                while j2 < 48 && last_end + j2 < bl {
                    if base[(last_end + j2) as usize] == target[(t + k2) as usize] {
                        let f2 = forward(base, last_end + j2, target, t + k2, end);
                        if f2 >= bsz && f2 - k2 > gain {
                            gain = f2 - k2;
                            best_off = last_end + j2;
                            best_fwd = f2;
                            best_back = 0;
                            best_t = t + k2;
                        }
                    }
                    j2 += 1;
                }
                k2 += 1;
            }
        }
        if best_off >= 0 {
            if best_back == 0 {
                best_back = backward(base, best_off, target, best_t, lit);
            }
            let from = best_t - best_back;
            w.add(target, lit, from - lit);
            w.copy(best_off - best_back, best_fwd + best_back);
            t = best_t + best_fwd;
            lit = t;
            last_end = best_off + best_fwd;
            fresh = true;
        } else {
            // roll one byte
            if t + bsz < end {
                let out = target[t as usize] as i64;
                let inb = target[(t + bsz) as usize] as i64;
                a = a - out + inb;
                b = b - bsz * out + a;
            }
            t += 1;
        }
    }
    w.add(target, lit, end - lit);
}

/// The same checksum as the scan's, over base[off, off+bsz).
pub fn block_hash(base: &Vec<u8>, off: i64, bsz: i64, mask: i64) -> i64 {
    let mut a: i64 = 0;
    let mut b: i64 = 0;
    let mut k: i64 = 0;
    while k < bsz {
        a = a + base[(off + k) as usize] as i64;
        b = b + a;
        k += 1;
    }
    (b * 4099 + a) & mask
}

/// How far base[c..] and target[t..end) agree.
pub fn forward(base: &Vec<u8>, c: i64, target: &Vec<u8>, t: i64, end: i64) -> i64 {
    let bl = base.len() as i64;
    let mut n: i64 = 0;
    while c + n < bl && t + n < end && base[(c + n) as usize] == target[(t + n) as usize] {
        n += 1;
    }
    n
}

/// How far base[..c) and target[lit..t) agree backwards from c and t.
pub fn backward(base: &Vec<u8>, c: i64, target: &Vec<u8>, t: i64, lit: i64) -> i64 {
    let mut n: i64 = 0;
    while c - n > 0 && t - n > lit && base[(c - n - 1) as usize] == target[(t - n - 1) as usize] {
        n += 1;
    }
    n
}

fn empty_info() -> DeltaInfo {
    DeltaInfo {
        ok: false,
        error: String::new(),
        base_len: 0,
        new_len: 0,
        base_sum: 0,
        new_sum: 0,
        copy_bytes: 0,
        add_bytes: 0,
        copies: 0,
        adds: 0,
        ops: Vec::new(),
    }
}

/// What a delta says; `ok` is false with `error` for a damaged one.
pub fn info(delta: &Vec<u8>) -> DeltaInfo {
    let mut r = empty_info();
    let mut rd = Reader::new(delta);
    let m0 = rd.byte();
    let m1 = rd.byte();
    let m2 = rd.byte();
    let m3 = rd.byte();
    if m0 != 82 || m1 != 68 || m2 != 1 || m3 != 1 {
        r.error = String::from("not a RangerDiff byte delta");
        return r;
    }
    r.base_len = rd.varint();
    r.new_len = rd.varint();
    r.base_sum = rd.u32();
    r.new_sum = rd.u32();
    let mut produced: i64 = 0;
    let mut last_end: i64 = 0;
    while produced < r.new_len && !rd.failed {
        let hdr = rd.varint();
        let mut op = Op { kind: hdr % 2, off: 0, len: hdr / 2, data: Vec::new() };
        if op.len <= 0 {
            r.error = String::from("empty operation");
            return r;
        }
        if op.kind == 1 {
            op.off = last_end + rd.zigzag();
            if op.off < 0 || op.off + op.len > r.base_len {
                r.error = String::from("COPY outside the base");
                return r;
            }
            last_end = op.off + op.len;
            r.copy_bytes = r.copy_bytes + op.len;
            r.copies = r.copies + 1;
        } else {
            op.data = rd.bytes(op.len);
            r.add_bytes = r.add_bytes + op.len;
            r.adds = r.adds + 1;
        }
        produced = produced + op.len;
        r.ops.push(op);
    }
    if rd.failed {
        r.error = String::from("delta is truncated");
        return r;
    }
    if produced != r.new_len {
        r.error = String::from("operations do not add up to the new length");
        return r;
    }
    if !rd.eof() {
        r.error = String::from("bytes after the last operation");
        return r;
    }
    r.ok = true;
    r
}

fn failed(error: &str) -> ApplyResult {
    ApplyResult { ok: false, error: String::from(error), data: Vec::new() }
}

fn build(base: &Vec<u8>, d: &DeltaInfo) -> Vec<u8> {
    let mut out: Vec<u8> = Vec::new();
    for op in &d.ops {
        if op.kind == 1 {
            let mut i = op.off;
            while i < op.off + op.len {
                out.push(base[i as usize]);
                i += 1;
            }
        } else {
            out.extend_from_slice(&op.data);
        }
    }
    out
}

/// The new version: `base` with `delta` applied, both checksums checked.
pub fn apply(base: &Vec<u8>, delta: &Vec<u8>) -> ApplyResult {
    let d = info(delta);
    if !d.ok {
        return failed(&d.error);
    }
    if base.len() as i64 != d.base_len {
        return failed("the base has the wrong length");
    }
    if adler32(base) != d.base_sum {
        return failed("the base is not the one this delta was made from");
    }
    let out = build(base, &d);
    if adler32(&out) != d.new_sum {
        return failed("the result does not match the checksum");
    }
    ApplyResult { ok: true, error: String::new(), data: out }
}

/// `apply` without the checksums.
pub fn apply_unchecked(base: &Vec<u8>, delta: &Vec<u8>) -> ApplyResult {
    let d = info(delta);
    if !d.ok {
        return failed(&d.error);
    }
    let out = build(base, &d);
    ApplyResult { ok: true, error: String::new(), data: out }
}

// ------------------------------------------------------- edits as deltas
// An editor that knows what it did can say so without a diff.

/// The delta of operations an editor already knows.
pub fn from_ops(base: &Vec<u8>, w: &DeltaWriter) -> Vec<u8> {
    let tmp = w.encode(base.len() as i64, 0, 0);
    let r = apply_unchecked(base, &tmp);
    w.encode(base.len() as i64, adler32(base), adler32(&r.data))
}

/// Insert `bytes` at `off`.
pub fn insert_at(base: &Vec<u8>, off: i64, bytes: &Vec<u8>) -> Vec<u8> {
    let mut w = DeltaWriter::new();
    w.copy(0, off);
    w.add(bytes, 0, bytes.len() as i64);
    w.copy(off, base.len() as i64 - off);
    from_ops(base, &w)
}

/// Delete `len` bytes at `off`.
pub fn delete_at(base: &Vec<u8>, off: i64, len: i64) -> Vec<u8> {
    let mut w = DeltaWriter::new();
    w.copy(0, off);
    w.copy(off + len, base.len() as i64 - off - len);
    from_ops(base, &w)
}

/// Write `bytes` over the base from `off` (may run past the end).
pub fn rewrite_at(base: &Vec<u8>, off: i64, bytes: &Vec<u8>) -> Vec<u8> {
    let bl = base.len() as i64;
    let n = bytes.len() as i64;
    let mut w = DeltaWriter::new();
    w.copy(0, off);
    w.add(bytes, 0, n);
    if off + n < bl {
        w.copy(off + n, bl - off - n);
    }
    from_ops(base, &w)
}

/// Replace `len` bytes at `off` with `bytes`.
pub fn replace_at(base: &Vec<u8>, off: i64, len: i64, bytes: &Vec<u8>) -> Vec<u8> {
    let mut w = DeltaWriter::new();
    w.copy(0, off);
    w.add(bytes, 0, bytes.len() as i64);
    w.copy(off + len, base.len() as i64 - off - len);
    from_ops(base, &w)
}

/// The delta that undoes `delta` (new → base), for reverse-delta storage.
pub fn reverse(base: &Vec<u8>, delta: &Vec<u8>) -> Vec<u8> {
    let r = apply(base, delta);
    diff(&r.data, base)
}
