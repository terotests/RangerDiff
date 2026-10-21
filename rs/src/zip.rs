//! A ZIP (XLSX, DOCX and PPTX are ZIPs) read into its parts and written
//! back, as ../src/RdZip.rgr. Reading takes the central directory, so the
//! parts come in the archive's own order. A part keeps its stored
//! (compressed) bytes: a part that did not change is written back with
//! them, still compressed; a changed part is written with method 0
//! (stored), and the host can recompress it.
use crate::bytes;
use crate::bytes::Writer;
use crate::inflate::Inflate;
use crate::u32p;

/// One part of an archive.
pub struct Entry {
    pub name: String,
    /// 0 stored, 8 deflate
    pub method: i64,
    pub crc: i64,
    pub csize: i64,
    pub usize: i64,
    /// the bytes as stored in the archive (compressed when method is 8)
    pub raw: Vec<u8>,
    pub has_content: bool,
    pub content_buf: Vec<u8>,
    /// content() could not get the part's bytes: the deflate stream is
    /// broken, cut short or longer than the size the archive gives
    pub bad: bool,
}

impl Entry {
    pub fn new() -> Entry {
        Entry {
            name: String::new(),
            method: 0,
            crc: 0,
            csize: 0,
            usize: 0,
            raw: Vec::new(),
            has_content: false,
            content_buf: Vec::new(),
            bad: false,
        }
    }

    /// The uncompressed bytes, inflated once.
    pub fn content(&mut self) -> Vec<u8> {
        if !self.has_content {
            if self.method == 8 {
                let mut inf = Inflate::from(&self.raw, 0);
                // never more than the archive says the part holds (a zip bomb)
                inf.max_output = self.usize;
                inf.run();
                if !inf.error.is_empty() || inf.truncated || inf.out.len() as i64 != self.usize {
                    self.bad = true;
                    self.content_buf = Vec::new();
                } else {
                    self.content_buf = inf.out;
                }
            } else {
                self.content_buf = self.raw.clone();
            }
            self.has_content = true;
        }
        self.content_buf.clone()
    }

    /// A stored part with the given bytes.
    pub fn stored(name: &str, data: &Vec<u8>) -> Entry {
        let mut e = Entry::new();
        e.name = name.to_string();
        e.raw = data.clone();
        e.content_buf = data.clone();
        e.has_content = true;
        e.csize = data.len() as i64;
        e.usize = data.len() as i64;
        e.crc = crc32(data);
        e
    }
}

/// The parts of an archive, or why it could not be read.
pub struct Archive {
    pub ok: bool,
    pub error: String,
    pub entries: Vec<Entry>,
}

impl Archive {
    /// The index of the part called `name`, -1 when there is none.
    pub fn find(&self, name: &str) -> i64 {
        let mut i: i64 = 0;
        for e in self.entries.iter() {
            if e.name == name {
                return i;
            }
            i += 1;
        }
        -1
    }

    pub fn names(&self) -> Vec<String> {
        let mut out: Vec<String> = Vec::new();
        for e in self.entries.iter() {
            out.push(e.name.clone());
        }
        out
    }
}

pub fn u16(b: &Vec<u8>, p: i64) -> i64 {
    b[p as usize] as i64 + (b[(p + 1) as usize] as i64) * 256
}

/// A 32-bit little-endian value: sizes and offsets of a ZIP under 2 GB fit
/// an int, a CRC is a pattern.
pub fn u32(b: &Vec<u8>, p: i64) -> i64 {
    let b0 = b[p as usize] as i64;
    let b1 = b[(p + 1) as usize] as i64;
    let b2 = b[(p + 2) as usize] as i64;
    let b3 = b[(p + 3) as usize] as i64;
    u32p::from_bytes_be(b3, b2, b1, b0)
}

pub fn is_zip(b: &Vec<u8>) -> bool {
    if b.len() < 22 {
        return false;
    }
    b[0] == 80 && b[1] == 75 && b[2] == 3 && b[3] == 4
}

fn at(b: &Vec<u8>, p: i64) -> i64 {
    b[p as usize] as i64
}

fn failed(error: String) -> Archive {
    Archive { ok: false, error: error, entries: Vec::new() }
}

pub fn read(b: &Vec<u8>) -> Archive {
    let n = b.len() as i64;
    // end of central directory: PK 5 6, searched from the end
    let mut eocd: i64 = -1;
    let mut p = n - 22;
    let mut stop = n - 65557;
    if stop < 0 {
        stop = 0;
    }
    while p >= stop {
        if at(b, p) == 80 && at(b, p + 1) == 75 && at(b, p + 2) == 5 && at(b, p + 3) == 6 {
            eocd = p;
            break;
        }
        p -= 1;
    }
    if eocd < 0 {
        return failed("not a ZIP archive".to_string());
    }
    let count = u16(b, eocd + 10);
    let cd = u32(b, eocd + 16);
    let mut entries: Vec<Entry> = Vec::new();
    let mut i: i64 = 0;
    let mut pos = cd;
    while i < count {
        if pos < 0 || pos + 46 > n || u32(b, pos) != 33639248 {
            return failed("broken central directory".to_string());
        }
        let mut e = Entry::new();
        e.method = u16(b, pos + 10);
        e.crc = u32(b, pos + 16);
        e.csize = u32(b, pos + 20);
        e.usize = u32(b, pos + 24);
        let name_len = u16(b, pos + 28);
        let extra_len = u16(b, pos + 30);
        let comment_len = u16(b, pos + 32);
        let local = u32(b, pos + 42);
        // ZIP64 keeps the real sizes and offset in an extra field: not read.
        // Its 0xFFFFFFFF markers (and any value from 2 GB up) are negative
        // as 32-bit patterns.
        if e.csize < 0 || e.usize < 0 || local < 0 {
            return failed("ZIP64 is not supported".to_string());
        }
        if pos + 46 + name_len > n {
            return failed("broken central directory".to_string());
        }
        let name_bytes: Vec<u8> = b[(pos + 46) as usize..(pos + 46 + name_len) as usize].to_vec();
        e.name = bytes::to_text(&name_bytes);
        if e.method != 0 && e.method != 8 {
            return failed(format!("unsupported compression in {}", e.name));
        }
        // the data is after the local header, whose extra field may differ
        if local + 30 > n || u32(b, local) != 67324752 {
            return failed(format!("broken local header of {}", e.name));
        }
        let data_at = local + 30 + u16(b, local + 26) + u16(b, local + 28);
        if data_at + e.csize > n {
            return failed(format!("truncated part {}", e.name));
        }
        e.raw = b[data_at as usize..(data_at + e.csize) as usize].to_vec();
        entries.push(e);
        pos = pos + 46 + name_len + extra_len + comment_len;
        i += 1;
    }
    Archive { ok: true, error: String::new(), entries: entries }
}

pub fn write(entries: &Vec<Entry>) -> Vec<u8> {
    let mut w = Writer::new();
    let mut offsets: Vec<i64> = Vec::new();
    let mut names: Vec<Vec<u8>> = Vec::new();
    for e in entries.iter() {
        let nb = bytes::from_text(&e.name);
        offsets.push(w.len());
        w.u32le(67324752);
        w.u16le(20);
        // bit 11: the name is UTF-8
        w.u16le(2048);
        w.u16le(e.method);
        // 1980-01-01 00:00
        w.u16le(0);
        w.u16le(33);
        w.u32le(e.crc);
        w.u32le(e.raw.len() as i64);
        w.u32le(e.usize);
        w.u16le(nb.len() as i64);
        w.u16le(0);
        w.all(&nb);
        w.all(&e.raw);
        names.push(nb);
    }
    let cd_start = w.len();
    let mut j: usize = 0;
    for e in entries.iter() {
        w.u32le(33639248);
        w.u16le(20);
        w.u16le(20);
        w.u16le(2048);
        w.u16le(e.method);
        w.u16le(0);
        w.u16le(33);
        w.u32le(e.crc);
        w.u32le(e.raw.len() as i64);
        w.u32le(e.usize);
        w.u16le(names[j].len() as i64);
        w.u16le(0);
        w.u16le(0);
        w.u16le(0);
        w.u16le(0);
        w.u32le(0);
        w.u32le(offsets[j]);
        w.all(&names[j]);
        j += 1;
    }
    let cd_len = w.len() - cd_start;
    w.u32le(101010256);
    w.u16le(0);
    w.u16le(0);
    w.u16le(entries.len() as i64);
    w.u16le(entries.len() as i64);
    w.u32le(cd_len);
    w.u32le(cd_start);
    w.u16le(0);
    w.to_bytes()
}

pub fn crc_table() -> Vec<i64> {
    let mut t: Vec<i64> = Vec::new();
    let poly = u32p::from_halves(60856, 33568);
    let mut n: i64 = 0;
    while n < 256 {
        let mut c = n;
        let mut k = 0;
        while k < 8 {
            if (c & 1) != 0 {
                c = poly ^ u32p::shr(c, 1);
            } else {
                c = u32p::shr(c, 1);
            }
            k += 1;
        }
        t.push(c);
        n += 1;
    }
    t
}

/// The CRC-32 of a ZIP part and a PNG chunk, as a 32-bit pattern.
pub fn crc32(b: &Vec<u8>) -> i64 {
    let t = crc_table();
    let mut c = u32p::bnot(0);
    for x in b.iter() {
        let idx = (c ^ (*x as i64)) & 255;
        c = t[idx as usize] ^ u32p::shr(c, 8);
    }
    u32p::bnot(c)
}
