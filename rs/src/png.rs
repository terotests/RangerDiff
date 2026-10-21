//! The delta of a PNG taken on its pixels, not its compressed bytes, as
//! ../src/RdPng.rgr. A small change to the picture changes most compressed
//! IDAT bytes after it, so the delta is taken on two segments:
//!
//!   skeleton  the file without the IDAT data (the first IDAT kept as an
//!             empty chunk to mark where the pixels go)
//!   pixels    the inflated IDAT stream: a filter byte and the bytes of
//!             each row
//!
//!   'R' 'D' version=1 kind=3 · varint len · skeleton delta · varint len ·
//!   pixel delta
//!
//! The rebuilt PNG has the same pixels and chunks; its IDAT is written in
//! stored deflate blocks, so it is larger until the host compresses it.
use crate::bytes;
use crate::bytes::{Reader, Writer};
use crate::delta;
use crate::delta::ApplyResult;
use crate::inflate::Inflate;
use crate::u32p;
use crate::zip;

/// A PNG in its two segments, or why it could not be split.
pub struct Parts {
    pub ok: bool,
    pub error: String,
    pub skeleton: Vec<u8>,
    pub pixels: Vec<u8>,
}

fn failed(error: &str) -> Parts {
    Parts { ok: false, error: error.to_string(), skeleton: Vec::new(), pixels: Vec::new() }
}

pub fn is_png(b: &Vec<u8>) -> bool {
    if b.len() < 8 {
        return false;
    }
    b[0] == 137 && b[1] == 80 && b[2] == 78 && b[3] == 71
}

pub fn u32be(b: &Vec<u8>, p: i64) -> i64 {
    let b0 = b[p as usize] as i64;
    let b1 = b[(p + 1) as usize] as i64;
    let b2 = b[(p + 2) as usize] as i64;
    let b3 = b[(p + 3) as usize] as i64;
    u32p::from_bytes_be(b0, b1, b2, b3)
}

fn is_idat(b: &Vec<u8>, p: i64) -> bool {
    is_type(b, p, "IDAT")
}

/// Whether the 4 bytes at `p` are the chunk type `name`.
fn is_type(b: &Vec<u8>, p: i64, name: &str) -> bool {
    let t: Vec<u8> = bytes::from_text(name);
    let mut i: i64 = 0;
    while i < 4 {
        if b[(p + i) as usize] != t[i as usize] {
            return false;
        }
        i += 1;
    }
    true
}

/// The most bytes the filtered pixels can take, from IHDR (the first
/// chunk); 0 when it is not there or not sane.
pub fn raw_size(b: &Vec<u8>) -> i64 {
    if b.len() < 33 || !is_type(b, 12, "IHDR") {
        return 0;
    }
    let w = u32be(b, 16);
    let h = u32be(b, 20);
    let depth = b[24] as i64;
    let color = b[25] as i64;
    let mut channels: i64 = 1;
    if color == 2 {
        channels = 3;
    }
    if color == 4 {
        channels = 2;
    }
    if color == 6 {
        channels = 4;
    }
    if w <= 0 || h <= 0 || w > 100000 || h > 100000 || depth <= 0 || depth > 16 {
        return 0;
    }
    // at most two bytes a sample (16-bit depth)
    let row = w * channels * 2;
    // interlaced: seven passes, each row with its own filter byte
    (row + 1) * h * 2 + 1024
}

pub fn split(b: &Vec<u8>) -> Parts {
    if !is_png(b) {
        return failed("not a PNG");
    }
    let n = b.len() as i64;
    let mut skel = Writer::new();
    let mut zdata = Writer::new();
    skel.bytes(b, 0, 8);
    let mut p: i64 = 8;
    let mut marked = false;
    while p + 12 <= n {
        let len = u32be(b, p);
        if len < 0 || p + 12 + len > n {
            return failed("broken chunk");
        }
        if is_idat(b, p + 4) {
            zdata.bytes(b, p + 8, len);
            if !marked {
                // an empty IDAT marks the place
                skel.u32(0);
                skel.bytes(b, p + 4, 4);
                skel.u32(0);
                marked = true;
            }
        } else {
            skel.bytes(b, p, len + 12);
        }
        p = p + 12 + len;
    }
    if !marked {
        return failed("no IDAT");
    }
    let z = zdata.to_bytes();
    if z.len() < 6 {
        return failed("IDAT too short");
    }
    let mut inf = Inflate::from(&z, 2);
    // never more than the image header says the pixels take
    inf.max_output = raw_size(b);
    if inf.max_output <= 0 {
        return failed("broken IHDR");
    }
    inf.run();
    if !inf.error.is_empty() || inf.truncated {
        return failed(&format!("broken pixels: {}", inf.error));
    }
    Parts { ok: true, error: String::new(), skeleton: skel.to_bytes(), pixels: inf.out }
}

/// skeleton + pixels → a PNG, the pixels in stored deflate blocks.
pub fn join(skeleton: &Vec<u8>, pixels: &Vec<u8>) -> Vec<u8> {
    let mut w = Writer::new();
    let n = skeleton.len() as i64;
    w.bytes(skeleton, 0, 8);
    let mut p: i64 = 8;
    while p + 12 <= n {
        let len = u32be(skeleton, p);
        if len == 0 && is_idat(skeleton, p + 4) {
            let z = zlib_stored(pixels);
            w.u32(z.len() as i64);
            let mut td = Writer::new();
            td.bytes(skeleton, p + 4, 4);
            td.all(&z);
            let tb = td.to_bytes();
            w.all(&tb);
            w.u32(zip::crc32(&tb));
        } else {
            w.bytes(skeleton, p, len + 12);
        }
        p = p + 12 + len;
    }
    w.to_bytes()
}

/// A zlib stream of stored blocks.
pub fn zlib_stored(data: &Vec<u8>) -> Vec<u8> {
    let mut w = Writer::new();
    w.byte(120);
    w.byte(1);
    let n = data.len() as i64;
    if n == 0 {
        w.byte(1);
        w.u16le(0);
        w.u16le(65535);
    }
    let mut p: i64 = 0;
    while p < n {
        let mut len = n - p;
        if len > 65535 {
            len = 65535;
        }
        let mut last: i64 = 0;
        if p + len >= n {
            last = 1;
        }
        w.byte(last);
        w.u16le(len);
        w.u16le(65535 - len);
        w.bytes(data, p, len);
        p += len;
    }
    w.u32(bytes::adler32(data));
    w.to_bytes()
}

pub fn diff(base: &Vec<u8>, target: &Vec<u8>) -> Vec<u8> {
    let a = split(base);
    let b = split(target);
    if !a.ok || !b.ok {
        return delta::diff(base, target);
    }
    let ds = delta::diff(&a.skeleton, &b.skeleton);
    let dp = delta::diff(&a.pixels, &b.pixels);
    let mut w = Writer::new();
    w.byte(82);
    w.byte(68);
    w.byte(1);
    w.byte(3);
    w.varint(ds.len() as i64);
    w.all(&ds);
    w.varint(dp.len() as i64);
    w.all(&dp);
    w.to_bytes()
}

pub fn is_png_delta(d: &Vec<u8>) -> bool {
    if d.len() < 4 {
        return false;
    }
    d[0] == 82 && d[1] == 68 && d[2] == 1 && d[3] == 3
}

fn apply_failed(error: String) -> ApplyResult {
    ApplyResult { ok: false, error: error, data: Vec::new() }
}

pub fn apply(base: &Vec<u8>, d: &Vec<u8>) -> ApplyResult {
    if !is_png_delta(d) {
        return delta::apply(base, d);
    }
    let a = split(base);
    if !a.ok {
        return apply_failed(format!("base: {}", a.error));
    }
    let mut rd = Reader::new(d);
    rd.pos = 4;
    let ns = rd.varint();
    let ds = rd.bytes(ns);
    let np = rd.varint();
    let dp = rd.bytes(np);
    if rd.failed {
        return apply_failed("delta is truncated".to_string());
    }
    let rs = delta::apply(&a.skeleton, &ds);
    if !rs.ok {
        return apply_failed(format!("skeleton: {}", rs.error));
    }
    let rp = delta::apply(&a.pixels, &dp);
    if !rp.ok {
        return apply_failed(format!("pixels: {}", rp.error));
    }
    ApplyResult { ok: true, error: String::new(), data: join(&rs.data, &rp.data) }
}
