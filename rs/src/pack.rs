//! The segmented delta of a ZIP container (XLSX, DOCX, PPTX, ODS), as
//! ../src/RdPack.rgr. A ZIP's bytes are compressed, so one changed cell
//! changes every byte after it; the delta is taken part by part, on the
//! uncompressed XML:
//!
//!   'R' 'D' version=1 kind=2
//!   varint parts
//!   per part, in the new archive's order:
//!     text name · u32 crc32 of the new content · byte kind
//!       0 SAME     the base part of the same name, unchanged
//!       1 DELTA    a byte delta against the base part of the same name
//!       2 FULL     varint len · the bytes
//!       3 RENAMED  text base name, unchanged content
//!       5 SHEET    varint len · a byte delta between the row-relative
//!                  forms (xlsx) of the base worksheet and the new one
//!       6 RAW      byte method · varint usize · varint len · the part as
//!                  the new archive stores it (compressed)
//!
//! A SAME part is written back with the base archive's compressed bytes; a
//! DELTA or FULL part is written stored. The rebuilt archive has every part
//! byte for byte; the ZIP wrapper itself may differ from the original.
use crate::bytes::{Reader, Writer};
use crate::delta;
use crate::delta::ApplyResult;
use crate::xlsx;
use crate::zip;
use crate::zip::{Archive, Entry};
use std::collections::HashMap;

/// What happened to one part.
pub struct PartChange {
    pub name: String,
    /// 0 same, 1 delta, 2 full (new or replaced), 3 renamed, 4 removed,
    /// 5 delta of a worksheet's row-relative form
    pub kind: i64,
    pub base_name: String,
    pub old_size: i64,
    pub new_size: i64,
    /// bytes this part takes in the delta
    pub cost: i64,
}

impl PartChange {
    pub fn new() -> PartChange {
        PartChange { name: String::new(), kind: 0, base_name: String::new(), old_size: 0, new_size: 0, cost: 0 }
    }

    pub fn kind_name(&self) -> String {
        if self.kind == 0 {
            return "same".to_string();
        }
        if self.kind == 1 || self.kind == 5 {
            return "changed".to_string();
        }
        if self.kind == 2 {
            if self.old_size < 0 {
                return "added".to_string();
            }
            return "replaced".to_string();
        }
        if self.kind == 3 {
            return "renamed".to_string();
        }
        "removed".to_string()
    }
}

/// The parts of a container delta.
pub struct PackInfo {
    pub ok: bool,
    pub error: String,
    pub parts: Vec<PartChange>,
}

impl PackInfo {
    /// How many parts are not the same.
    pub fn changed_count(&self) -> i64 {
        let mut n: i64 = 0;
        for p in self.parts.iter() {
            if p.kind != 0 {
                n += 1;
            }
        }
        n
    }
}

/// The segmented delta of two ZIP archives; a byte delta when either is
/// not a ZIP.
pub fn diff(base: &Vec<u8>, target: &Vec<u8>) -> Vec<u8> {
    if !zip::is_zip(base) || !zip::is_zip(target) {
        return delta::diff(base, target);
    }
    let mut za = zip::read(base);
    let mut zb = zip::read(target);
    if !za.ok || !zb.ok {
        return delta::diff(base, target);
    }
    let d = diff_archives(&mut za, &mut zb);
    if d.is_empty() {
        return delta::diff(base, target);
    }
    d
}

fn crc_key(e: &Entry) -> String {
    format!("{}:{}", e.crc, e.usize)
}

/// Empty when a changed part cannot be read (see zip::Entry::bad).
pub fn diff_archives(za: &mut Archive, zb: &mut Archive) -> Vec<u8> {
    let mut w = Writer::new();
    w.byte(82);
    w.byte(68);
    w.byte(1);
    w.byte(2);
    w.varint(zb.entries.len() as i64);
    // crc → base name, to find renamed parts
    let mut by_crc: HashMap<String, String> = HashMap::new();
    for ea in za.entries.iter() {
        by_crc.insert(crc_key(ea), ea.name.clone());
    }
    let count = zb.entries.len();
    let mut j: usize = 0;
    while j < count {
        let name = zb.entries[j].name.clone();
        w.text(&name);
        w.u32(zb.entries[j].crc);
        let oi = za.find(&name);
        if oi >= 0 {
            let o = oi as usize;
            if za.entries[o].crc == zb.entries[j].crc && za.entries[o].usize == zb.entries[j].usize {
                w.byte(0);
            } else {
                let nb = zb.entries[j].content();
                let ob = za.entries[o].content();
                if zb.entries[j].bad || za.entries[o].bad {
                    return Vec::new();
                }
                let sheet_form = xlsx::is_sheet(&name) && !xlsx::is_encoded(&nb);
                let d = if sheet_form {
                    delta::diff(&xlsx::encode(&ob), &xlsx::encode(&nb))
                } else {
                    delta::diff(&ob, &nb)
                };
                if d.len() < zb.entries[j].raw.len() {
                    if sheet_form {
                        w.byte(5);
                    } else {
                        w.byte(1);
                    }
                    w.varint(d.len() as i64);
                    w.all(&d);
                } else {
                    write_raw(&mut w, &zb.entries[j]);
                }
            }
        } else {
            let key = crc_key(&zb.entries[j]);
            match by_crc.get(&key) {
                Some(bn) => {
                    w.byte(3);
                    w.text(bn);
                }
                None => write_raw(&mut w, &zb.entries[j]),
            }
        }
        j += 1;
    }
    w.to_bytes()
}

pub fn write_raw(w: &mut Writer, e: &Entry) {
    w.byte(6);
    w.byte(e.method);
    w.varint(e.usize);
    w.varint(e.raw.len() as i64);
    w.all(&e.raw);
}

pub fn is_pack_delta(d: &Vec<u8>) -> bool {
    if d.len() < 4 {
        return false;
    }
    d[0] == 82 && d[1] == 68 && d[2] == 1 && d[3] == 2
}

fn failed(error: String) -> ApplyResult {
    ApplyResult { ok: false, error: error, data: Vec::new() }
}

pub fn apply(base: &Vec<u8>, d: &Vec<u8>) -> ApplyResult {
    if !is_pack_delta(d) {
        return delta::apply(base, d);
    }
    let mut za = zip::read(base);
    if !za.ok {
        return failed(format!("base: {}", za.error));
    }
    let mut rd = Reader::new(d);
    rd.pos = 4;
    let count = rd.varint();
    let mut out: Vec<Entry> = Vec::new();
    let mut i: i64 = 0;
    while i < count {
        let name = rd.text();
        let crc = rd.u32();
        let kind = rd.byte();
        if rd.failed {
            return failed("delta is truncated".to_string());
        }
        if kind == 6 {
            let mut re = Entry::new();
            re.name = name.clone();
            re.method = rd.byte();
            re.usize = rd.varint();
            let rlen = rd.varint();
            re.raw = rd.bytes(rlen);
            re.csize = rlen;
            re.crc = crc;
            if rd.failed {
                return failed("delta is truncated".to_string());
            }
            if zip::crc32(&re.content()) != crc {
                return failed(format!("part does not match its checksum: {}", name));
            }
            out.push(re);
            i += 1;
            continue;
        }
        if kind == 0 || kind == 3 {
            let mut base_name = name.clone();
            if kind == 3 {
                base_name = rd.text();
            }
            let oi = za.find(&base_name);
            if oi < 0 {
                return failed(format!("the base has no part {}", base_name));
            }
            let o = &za.entries[oi as usize];
            if o.crc != crc {
                return failed(format!("the base part differs: {}", base_name));
            }
            let mut keep = Entry::new();
            keep.name = name.clone();
            keep.method = o.method;
            keep.crc = o.crc;
            keep.csize = o.csize;
            keep.usize = o.usize;
            keep.raw = o.raw.clone();
            out.push(keep);
        } else {
            let mut part = ApplyResult { ok: true, error: String::new(), data: Vec::new() };
            if kind == 1 || kind == 5 {
                let dlen = rd.varint();
                let pd = rd.bytes(dlen);
                part = changed_part(&mut za, &name, kind, &pd);
                if !part.ok {
                    return part;
                }
            } else {
                let flen = rd.varint();
                part.data = rd.bytes(flen);
            }
            let data = part.data;
            if rd.failed {
                return failed("delta is truncated".to_string());
            }
            let ne = Entry::stored(&name, &data);
            if ne.crc != crc {
                return failed(format!("part does not match its checksum: {}", name));
            }
            out.push(ne);
        }
        i += 1;
    }
    ApplyResult { ok: true, error: String::new(), data: zip::write(&out) }
}

/// A DELTA (1) or SHEET (5) part applied to the base part of its name.
fn changed_part(za: &mut Archive, name: &str, kind: i64, pd: &Vec<u8>) -> ApplyResult {
    let oi = za.find(name);
    if oi < 0 {
        return failed(format!("the base has no part {}", name));
    }
    let mut from = za.entries[oi as usize].content();
    if za.entries[oi as usize].bad {
        return failed(format!("the base part cannot be read: {}", name));
    }
    if kind == 5 {
        from = xlsx::encode(&from);
    }
    let r = delta::apply(&from, pd);
    if !r.ok {
        return failed(format!("{}: {}", name, r.error));
    }
    if kind == 5 {
        return ApplyResult { ok: true, error: String::new(), data: xlsx::decode(&r.data) };
    }
    r
}

/// What changed, part by part (for a "what changed" view).
pub fn info(base: &Vec<u8>, d: &Vec<u8>) -> PackInfo {
    if !is_pack_delta(d) {
        return PackInfo { ok: false, error: "not a container delta".to_string(), parts: Vec::new() };
    }
    let za = zip::read(base);
    let mut rd = Reader::new(d);
    rd.pos = 4;
    let count = rd.varint();
    let mut seen: HashMap<String, bool> = HashMap::new();
    let mut parts: Vec<PartChange> = Vec::new();
    let mut i: i64 = 0;
    while i < count {
        let start = rd.pos;
        let mut c = PartChange::new();
        c.name = rd.text();
        rd.u32();
        c.kind = rd.byte();
        c.old_size = -1;
        let oi = za.find(&c.name);
        if oi >= 0 {
            c.old_size = za.entries[oi as usize].usize;
        }
        if c.kind == 0 {
            c.new_size = c.old_size;
        }
        if c.kind == 1 || c.kind == 5 {
            let dlen = rd.varint();
            let pd = rd.bytes(dlen);
            c.new_size = delta::info(&pd).new_len;
        }
        if c.kind == 2 {
            let flen = rd.varint();
            rd.bytes(flen);
            c.new_size = flen;
        }
        if c.kind == 6 {
            rd.byte();
            c.new_size = rd.varint();
            let rlen = rd.varint();
            rd.bytes(rlen);
            // shown as added / replaced
            c.kind = 2;
        }
        if c.kind == 3 {
            c.base_name = rd.text();
            let bi = za.find(&c.base_name);
            if bi >= 0 {
                c.old_size = za.entries[bi as usize].usize;
                c.new_size = c.old_size;
            }
            seen.insert(c.base_name.clone(), true);
        }
        c.cost = rd.pos - start;
        seen.insert(c.name.clone(), true);
        parts.push(c);
        i += 1;
    }
    if za.ok {
        for e in za.entries.iter() {
            if !seen.contains_key(&e.name) {
                let mut gone = PartChange::new();
                gone.name = e.name.clone();
                gone.kind = 4;
                gone.old_size = e.usize;
                parts.push(gone);
            }
        }
    }
    PackInfo { ok: !rd.failed, error: String::new(), parts: parts }
}
