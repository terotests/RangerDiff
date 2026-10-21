//! DEFLATE decompression (RFC 1951), as Ranger's lib/zip/Inflate.rgr: the
//! parts of a ZIP and the image data of a PNG.

/// A canonical Huffman code: how many codes each bit length has, and the
/// symbols in code order.
pub struct Huffman {
    pub counts: Vec<i64>,
    pub symbols: Vec<i64>,
    pub max_bits: i64,
}

impl Huffman {
    /// The code of `lengths[0..n]`, the bit length of each symbol.
    pub fn build(lengths: &Vec<i64>, n: i64) -> Huffman {
        let mut counts: Vec<i64> = Vec::new();
        let mut i: i64 = 0;
        while i < 16 {
            counts.push(0);
            i += 1;
        }
        let mut max_bits: i64 = 0;
        i = 0;
        while i < n {
            let len = lengths[i as usize];
            if len > 0 {
                counts[len as usize] += 1;
                if len > max_bits {
                    max_bits = len;
                }
            }
            i += 1;
        }
        let mut offsets: Vec<i64> = Vec::new();
        let mut offset: i64 = 0;
        i = 0;
        while i < 16 {
            offsets.push(offset);
            offset += counts[i as usize];
            i += 1;
        }
        let mut symbols: Vec<i64> = Vec::new();
        i = 0;
        while i < n {
            symbols.push(0);
            i += 1;
        }
        i = 0;
        while i < n {
            let len = lengths[i as usize];
            if len > 0 {
                let off = offsets[len as usize];
                symbols[off as usize] = i;
                offsets[len as usize] = off + 1;
            }
            i += 1;
        }
        Huffman { counts: counts, symbols: symbols, max_bits: max_bits }
    }

    /// The next symbol, -1 for a code the table does not have.
    pub fn decode(&self, r: &mut BitReader) -> i64 {
        let mut code: i64 = 0;
        let mut first: i64 = 0;
        let mut index: i64 = 0;
        let mut len: i64 = 1;
        while len <= self.max_bits {
            code = code * 2 + r.bit();
            let count = self.counts[len as usize];
            if code - first < count {
                return self.symbols[(index + code - first) as usize];
            }
            index += count;
            first = (first + count) * 2;
            len += 1;
        }
        -1
    }
}

/// Bits of a byte string, low bit first; 0 past the end.
pub struct BitReader {
    pub data: Vec<u8>,
    pub pos: i64,
    pub end: i64,
    pub left: i64,
    pub cur: i64,
    /// a read went past the end: the stream was cut short, and every read
    /// since answered 0
    pub overrun: bool,
}

impl BitReader {
    /// `length` bytes of `data` from `offset`.
    pub fn new(data: &Vec<u8>, offset: i64, length: i64) -> BitReader {
        BitReader { data: data.clone(), pos: offset, end: offset + length, left: 0, cur: 0, overrun: false }
    }

    pub fn bit(&mut self) -> i64 {
        if self.left == 0 {
            if self.pos >= self.end {
                self.overrun = true;
                return 0;
            }
            self.cur = self.data[self.pos as usize] as i64;
            self.pos += 1;
            self.left = 8;
        }
        let b = self.cur & 1;
        self.cur = self.cur >> 1;
        self.left -= 1;
        b
    }

    /// `count` bits as a number, the first bit lowest.
    pub fn bits(&mut self, count: i64) -> i64 {
        let mut result: i64 = 0;
        let mut m: i64 = 1;
        let mut i: i64 = 0;
        while i < count {
            result += self.bit() * m;
            m = m * 2;
            i += 1;
        }
        result
    }

    /// The rest of the current byte is skipped.
    pub fn align(&mut self) {
        self.left = 0;
    }

    pub fn byte(&mut self) -> i64 {
        self.align();
        if self.pos >= self.end {
            self.overrun = true;
            return 0;
        }
        let b = self.data[self.pos as usize] as i64;
        self.pos += 1;
        b
    }

    pub fn u16le(&mut self) -> i64 {
        let b0 = self.byte();
        let b1 = self.byte();
        b0 + b1 * 256
    }
}

const LENGTH_BASE: [i64; 29] = [
    3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163,
    195, 227, 258,
];
const LENGTH_EXTRA: [i64; 29] = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE: [i64; 30] = [
    1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073,
    4097, 6145, 8193, 12289, 16385, 24577,
];
const DIST_EXTRA: [i64; 30] = [
    0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];
const CL_ORDER: [i64; 19] = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

/// One DEFLATE stream being decoded.
pub struct Inflate {
    pub reader: BitReader,
    pub out: Vec<u8>,
    /// The most bytes the stream may write; 0: no limit. A stream that
    /// would write more is refused, so a small archive member cannot claim
    /// gigabytes (a zip bomb).
    pub max_output: i64,
    /// Why `run` gave no bytes: the output limit, a code or distance the
    /// stream cannot have, a reserved block type; "" when it succeeded. A
    /// stream cut short is not an error: what it held is kept, and
    /// `truncated` says so.
    pub error: String,
    pub truncated: bool,
}

/// The stream that starts at byte 0 of `data`.
pub fn decompress(data: &Vec<u8>) -> Vec<u8> {
    let mut inf = Inflate::from(data, 0);
    inf.run();
    inf.out
}

impl Inflate {
    /// The stream that starts at `offset` and runs to its final block; ZIP
    /// gives offset 0, a zlib wrapper the byte after its 2-byte header.
    pub fn from(data: &Vec<u8>, offset: i64) -> Inflate {
        let n = data.len() as i64;
        let mut at = offset;
        if at < 0 {
            at = 0;
        }
        if at > n {
            at = n;
        }
        Inflate { reader: BitReader::new(data, at, n - at), out: Vec::new(), max_output: 0, error: String::new(), truncated: false }
    }

    /// The input byte after the last DEFLATE bit: a zlib Adler-32 follows.
    pub fn input_pos(&self) -> i64 {
        self.reader.pos
    }

    fn fail(&mut self, why: &str) {
        if self.error.is_empty() {
            self.error = why.to_string();
        }
    }

    /// Still decoding: no error, and input left to read.
    fn going(&self) -> bool {
        self.error.is_empty() && !self.reader.overrun
    }

    /// Room for `extra` more bytes under `max_output`.
    fn room(&mut self, extra: i64) -> bool {
        let need = self.out.len() as i64 + extra;
        if self.max_output > 0 && need > self.max_output {
            self.fail(&format!("output larger than {} bytes", self.max_output));
            return false;
        }
        true
    }

    fn push(&mut self, b: i64) {
        if self.room(1) {
            self.out.push(b as u8);
        }
    }

    /// Decodes every block.
    pub fn run(&mut self) {
        self.error = String::new();
        self.truncated = false;
        let mut lengths: Vec<i64> = Vec::new();
        let mut i: i64 = 0;
        while i < 288 {
            if i < 144 {
                lengths.push(8);
            } else if i < 256 {
                lengths.push(9);
            } else if i < 280 {
                lengths.push(7);
            } else {
                lengths.push(8);
            }
            i += 1;
        }
        let fixed_lit = Huffman::build(&lengths, 288);
        let mut dist_lengths: Vec<i64> = Vec::new();
        i = 0;
        while i < 32 {
            dist_lengths.push(5);
            i += 1;
        }
        let fixed_dist = Huffman::build(&dist_lengths, 32);
        let mut last = false;
        while !last && self.going() {
            let bfinal = self.reader.bit();
            let btype = self.reader.bits(2);
            last = bfinal == 1;
            if btype == 0 {
                self.stored();
            }
            if btype == 1 {
                self.huffman(&fixed_lit, &fixed_dist);
            }
            if btype == 2 {
                self.dynamic();
            }
            if btype == 3 {
                self.fail("reserved block type");
            }
        }
        if !self.error.is_empty() {
            self.out = Vec::new();
            return;
        }
        self.truncated = self.reader.overrun;
    }

    fn stored(&mut self) {
        self.reader.align();
        let len = self.reader.u16le();
        let nlen = self.reader.u16le();
        if len + nlen != 65535 {
            if !self.reader.overrun {
                self.fail("stored block length does not match its complement");
            }
            return;
        }
        if !self.room(len) {
            return;
        }
        let mut i: i64 = 0;
        while i < len && self.going() {
            let b = self.reader.byte();
            self.push(b);
            i += 1;
        }
    }

    fn huffman(&mut self, lit: &Huffman, dist: &Huffman) {
        while self.going() {
            let sym = lit.decode(&mut self.reader);
            if self.reader.overrun {
                // cut short: what the missing bits would have said is unknown
                return;
            }
            if sym < 0 || sym > 285 {
                self.fail("invalid literal/length code");
                return;
            }
            if sym == 256 {
                return;
            }
            if sym < 256 {
                self.push(sym);
                continue;
            }
            let lc = (sym - 257) as usize;
            let mut length = LENGTH_BASE[lc];
            let extra = LENGTH_EXTRA[lc];
            if extra > 0 {
                length += self.reader.bits(extra);
            }
            let dc = dist.decode(&mut self.reader);
            if dc < 0 || dc > 29 {
                self.fail("invalid distance code");
                return;
            }
            let mut d = DIST_BASE[dc as usize];
            let dextra = DIST_EXTRA[dc as usize];
            if dextra > 0 {
                d += self.reader.bits(dextra);
            }
            if self.reader.overrun {
                return;
            }
            if d > self.out.len() as i64 {
                self.fail("distance before the start of the output");
                return;
            }
            self.copy_back(d, length);
        }
    }

    fn dynamic(&mut self) {
        let hlit = self.reader.bits(5) + 257;
        let hdist = self.reader.bits(5) + 1;
        let hclen = self.reader.bits(4) + 4;
        let mut cl_lengths: Vec<i64> = Vec::new();
        let mut i: i64 = 0;
        while i < 19 {
            cl_lengths.push(0);
            i += 1;
        }
        i = 0;
        while i < hclen {
            let idx = CL_ORDER[i as usize];
            cl_lengths[idx as usize] = self.reader.bits(3);
            i += 1;
        }
        let cl = Huffman::build(&cl_lengths, 19);
        let mut all: Vec<i64> = Vec::new();
        let total = hlit + hdist;
        i = 0;
        while i < total && self.going() {
            let sym = cl.decode(&mut self.reader);
            if sym < 0 || sym > 18 {
                self.fail("invalid code length code");
                return;
            }
            if sym < 16 {
                all.push(sym);
                i += 1;
                continue;
            }
            let mut value: i64 = 0;
            let mut repeat: i64 = 0;
            if sym == 16 {
                repeat = self.reader.bits(2) + 3;
                let n = all.len();
                if n > 0 {
                    value = all[n - 1];
                }
            }
            if sym == 17 {
                repeat = self.reader.bits(3) + 3;
            }
            if sym == 18 {
                repeat = self.reader.bits(7) + 11;
            }
            let mut j: i64 = 0;
            while j < repeat {
                all.push(value);
                j += 1;
            }
            i += repeat;
        }
        if !self.going() {
            return;
        }
        if i > total {
            self.fail("code lengths run past the table");
            return;
        }
        let mut lit_lengths: Vec<i64> = Vec::new();
        let mut dist_lengths: Vec<i64> = Vec::new();
        i = 0;
        while i < hlit {
            lit_lengths.push(all[i as usize]);
            i += 1;
        }
        while i < total {
            dist_lengths.push(all[i as usize]);
            i += 1;
        }
        let lit = Huffman::build(&lit_lengths, hlit);
        let dist = Huffman::build(&dist_lengths, hdist);
        self.huffman(&lit, &dist);
    }

    /// `length` bytes from `distance` back; a copy may overlap what it writes.
    fn copy_back(&mut self, distance: i64, length: i64) {
        let src = self.out.len() as i64 - distance;
        if !self.room(length) {
            return;
        }
        let mut i: i64 = 0;
        while i < length {
            let at = src + i;
            let mut b: u8 = 0;
            if at >= 0 {
                b = self.out[at as usize];
            }
            self.out.push(b);
            i += 1;
        }
    }
}
