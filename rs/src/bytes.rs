//! A growable byte writer, a reader, and the Adler-32 checksum.
//!
//! Every number in the delta formats is an unsigned LEB128 varint (7 bits a
//! byte, low bits first) or a zigzag varint for signed values. Lengths and
//! offsets stay below 2^30, so `len * 2 + kind` fits a 32-bit int on every
//! target.
use crate::u32p;

/// Collects bytes.
pub struct Writer {
    pub buf: Vec<u8>,
}

impl Writer {
    /// An empty writer.
    pub fn new() -> Writer {
        Writer { buf: Vec::new() }
    }

    /// Bytes written so far.
    pub fn len(&self) -> i64 {
        self.buf.len() as i64
    }

    /// One byte, 0..255.
    pub fn byte(&mut self, b: i64) {
        self.buf.push((b & 255) as u8);
    }

    /// `n` bytes of `src` from `off`.
    pub fn bytes(&mut self, src: &Vec<u8>, off: i64, n: i64) {
        let mut i = off;
        let end = off + n;
        while i < end {
            self.buf.push(src[i as usize]);
            i += 1;
        }
    }

    /// All of `src`.
    pub fn all(&mut self, src: &Vec<u8>) {
        self.bytes(src, 0, src.len() as i64);
    }

    /// An unsigned LEB128 varint.
    pub fn varint(&mut self, value: i64) {
        let mut v = value;
        while v >= 128 {
            self.byte((v % 128) + 128);
            v = v / 128;
        }
        self.byte(v);
    }

    /// A signed value as a zigzag varint.
    pub fn zigzag(&mut self, v: i64) {
        if v < 0 {
            self.varint((0 - v) * 2 - 1);
        } else {
            self.varint(v * 2);
        }
    }

    /// A 32-bit pattern, big-endian.
    pub fn u32(&mut self, v: i64) {
        self.byte(u32p::byte_at(v, 0));
        self.byte(u32p::byte_at(v, 1));
        self.byte(u32p::byte_at(v, 2));
        self.byte(u32p::byte_at(v, 3));
    }

    /// A 32-bit pattern, little-endian (ZIP).
    pub fn u32le(&mut self, v: i64) {
        self.byte(u32p::byte_at(v, 3));
        self.byte(u32p::byte_at(v, 2));
        self.byte(u32p::byte_at(v, 1));
        self.byte(u32p::byte_at(v, 0));
    }

    /// 16 bits, little-endian.
    pub fn u16le(&mut self, v: i64) {
        self.byte(v & 255);
        self.byte((v >> 8) & 255);
    }

    /// UTF-8 bytes of a string, its length first.
    pub fn text(&mut self, s: &str) {
        let b = from_text(s);
        self.varint(b.len() as i64);
        self.all(&b);
    }

    /// The bytes written.
    pub fn to_bytes(&self) -> Vec<u8> {
        self.buf.clone()
    }
}

/// Reads what a Writer wrote; past the end it answers 0 and sets `failed`.
pub struct Reader {
    pub data: Vec<u8>,
    pub pos: i64,
    pub len: i64,
    pub failed: bool,
}

impl Reader {
    /// A reader over a copy of `b`.
    pub fn new(b: &Vec<u8>) -> Reader {
        Reader { data: b.clone(), pos: 0, len: b.len() as i64, failed: false }
    }

    /// Whether every byte has been read.
    pub fn eof(&self) -> bool {
        self.pos >= self.len
    }

    /// One byte.
    pub fn byte(&mut self) -> i64 {
        if self.pos >= self.len {
            self.failed = true;
            return 0;
        }
        let v = self.data[self.pos as usize] as i64;
        self.pos += 1;
        v
    }

    /// An unsigned varint of at most five bytes.
    pub fn varint(&mut self) -> i64 {
        let mut result: i64 = 0;
        let mut mul: i64 = 1;
        let mut guard = 0;
        loop {
            let b = self.byte();
            result = result + (b % 128) * mul;
            if b < 128 {
                break;
            }
            mul = mul * 128;
            guard += 1;
            if guard > 4 {
                self.failed = true;
                break;
            }
        }
        result
    }

    /// A zigzag varint.
    pub fn zigzag(&mut self) -> i64 {
        let v = self.varint();
        if v % 2 == 1 {
            return 0 - (v + 1) / 2;
        }
        v / 2
    }

    /// A big-endian 32-bit pattern.
    pub fn u32(&mut self) -> i64 {
        let b0 = self.byte();
        let b1 = self.byte();
        let b2 = self.byte();
        let b3 = self.byte();
        u32p::from_bytes_be(b0, b1, b2, b3)
    }

    /// The next `n` bytes.
    pub fn bytes(&mut self, n: i64) -> Vec<u8> {
        let mut out: Vec<u8> = Vec::new();
        if n < 0 || self.pos + n > self.len {
            self.failed = true;
            return out;
        }
        let mut i = self.pos;
        while i < self.pos + n {
            out.push(self.data[i as usize]);
            i += 1;
        }
        self.pos += n;
        out
    }

    /// A string written by `Writer::text`.
    pub fn text(&mut self) -> String {
        let n = self.varint();
        let b = self.bytes(n);
        to_text(&b)
    }
}

/// Adler-32 (RFC 1950) as a 32-bit pattern.
pub fn adler32(b: &Vec<u8>) -> i64 {
    adler32_range(b, 0, b.len() as i64)
}

/// Adler-32 of `b[start..end]`.
pub fn adler32_range(b: &Vec<u8>, start: i64, end: i64) -> i64 {
    let mut a: i64 = 1;
    let mut s: i64 = 0;
    let mut i = start;
    while i < end {
        // 3800 bytes keep both sums below 2^31 between reductions (zlib's
        // 5552 is the bound for 2^32; `int` is 32-bit signed on C++)
        let mut stop = i + 3800;
        if stop > end {
            stop = end;
        }
        while i < stop {
            a = a + b[i as usize] as i64;
            s = s + a;
            i += 1;
        }
        a = a % 65521;
        s = s % 65521;
    }
    u32p::from_halves(s, a)
}

/// The same bytes.
pub fn equal(a: &Vec<u8>, b: &Vec<u8>) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut i = 0;
    while i < a.len() {
        if a[i] != b[i] {
            return false;
        }
        i += 1;
    }
    true
}

/// `a` then `b`.
pub fn concat(a: &Vec<u8>, b: &Vec<u8>) -> Vec<u8> {
    let mut out = a.clone();
    out.extend_from_slice(b);
    out
}

/// UTF-8 encoding of a string, the same on every target.
pub fn from_text(s: &str) -> Vec<u8> {
    let mut out: Vec<u8> = Vec::new();
    for b in s.bytes() {
        out.push(b);
    }
    out
}

/// UTF-8 bytes to a string; a broken sequence becomes U+FFFD.
pub fn to_text(b: &Vec<u8>) -> String {
    let n = b.len() as i64;
    let mut out = String::new();
    let mut i: i64 = 0;
    while i < n {
        let c = b[i as usize] as i64;
        let mut need = 0;
        let mut cp = c;
        if c >= 240 {
            need = 3;
            cp = c - 240;
        } else if c >= 224 {
            need = 2;
            cp = c - 224;
        } else if c >= 192 {
            need = 1;
            cp = c - 192;
        } else if c >= 128 {
            cp = 65533;
        }
        i += 1;
        let mut k = 0;
        while k < need {
            if i >= n {
                cp = 65533;
                break;
            }
            let d = b[i as usize] as i64;
            if d < 128 || d >= 192 {
                cp = 65533;
                break;
            }
            cp = cp * 64 + (d - 128);
            i += 1;
            k += 1;
        }
        match char::from_u32(cp as u32) {
            Some(ch) => out.push(ch),
            None => out.push('\u{FFFD}'),
        }
    }
    out
}

/// Lowercase hex of the bytes.
pub fn hex(b: &Vec<u8>) -> String {
    let digits = "0123456789abcdef";
    let mut out = String::new();
    for v in b {
        let x = *v as usize;
        out.push_str(&digits[x / 16..x / 16 + 1]);
        out.push_str(&digits[x % 16..x % 16 + 1]);
    }
    out
}
