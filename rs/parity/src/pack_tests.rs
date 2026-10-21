//! ../../tests/PackTests.rgr: ZIP read/write and the segmented XLSX delta,
//! on testdata/xlsx.
use crate::harness::Test;
use rangerdiff::bytes;
use rangerdiff::pack;
use rangerdiff::smart;
use rangerdiff::zip;
use rangerdiff::zip::Entry;
use std::fs;

pub fn load(name: &str) -> Vec<u8> {
    fs::read(format!("testdata/xlsx/{}", name)).unwrap_or_default()
}

/// Every part of `a` equals the part of the same name in `b`.
fn same_parts(a: &Vec<u8>, b: &Vec<u8>) -> bool {
    let mut za = zip::read(a);
    let mut zb = zip::read(b);
    if !za.ok || !zb.ok {
        return false;
    }
    if za.entries.len() != zb.entries.len() {
        return false;
    }
    let mut i: usize = 0;
    while i < za.entries.len() {
        if za.entries[i].name != zb.entries[i].name {
            return false;
        }
        let ca = za.entries[i].content();
        let cb = zb.entries[i].content();
        if !bytes::equal(&ca, &cb) {
            return false;
        }
        i += 1;
    }
    true
}

fn zip_test(t: &mut Test) {
    t.start("zip");
    let b = load("base.xlsx");
    let mut z = zip::read(&b);
    t.ok(z.ok, &format!("reads base.xlsx {}", z.error));
    t.ok(z.entries.len() >= 9, "has the parts of a workbook");
    let si = z.find("xl/worksheets/sheet1.xml");
    t.ok(si >= 0, "has sheet1.xml");
    if si >= 0 {
        let s = &mut z.entries[si as usize];
        let xml = s.content();
        t.eq_int(xml.len() as i64, s.usize, "inflated size");
        t.eq_int(zip::crc32(&xml), s.crc, "crc32 of the content");
        t.ok(bytes::to_text(&xml).contains("<sheetData>"), "it is sheet XML");
    }
    // written back, every part is the same
    let again = zip::write(&z.entries);
    t.ok(same_parts(&b, &again), "rewritten archive has the same parts");
    // a stored archive reads back too
    let mut stored: Vec<Entry> = Vec::new();
    for e in z.entries.iter_mut() {
        let c = e.content();
        stored.push(Entry::stored(&e.name, &c));
    }
    let st = zip::write(&stored);
    t.ok(same_parts(&b, &st), "stored archive has the same parts");
    let bad = zip::read(&bytes::from_text("hello"));
    t.ok(!bad.ok, "not a zip is refused");
}

fn edit(t: &mut Test, name: &str, max_delta: i64) {
    t.start(&format!("xlsx {}", name));
    let base = load("base.xlsx");
    let target = load(name);
    let d = pack::diff(&base, &target);
    t.ok(pack::is_pack_delta(&d), "is a segmented delta");
    let r = pack::apply(&base, &d);
    t.ok(r.ok, &format!("applies {}", r.error));
    t.ok(same_parts(&target, &r.data), "rebuilt workbook has the new parts");
    t.ok(
        d.len() as i64 <= max_delta,
        &format!("delta {} bytes, at most {}", d.len(), max_delta),
    );
    let info = pack::info(&base, &d);
    t.ok(info.ok, "info reads");
    t.ok(info.changed_count() >= 1, "something changed");
    // and back: the reverse delta rebuilds the base parts
    let back = pack::diff(&r.data, &base);
    let r2 = pack::apply(&r.data, &back);
    t.ok(r2.ok && same_parts(&base, &r2.data), "reverse delta gives the base");
}

fn damage(t: &mut Test) {
    t.start("xlsx damage");
    let base = load("base.xlsx");
    let target = load("edit-cell.xlsx");
    let d = pack::diff(&base, &target);
    let other = load("add-sheet.xlsx");
    let r = pack::apply(&other, &d);
    t.ok(!r.ok, "a different base is refused");
    let cut: Vec<u8> = d[0..d.len() - 2].to_vec();
    let r2 = pack::apply(&base, &cut);
    t.ok(!r2.ok, "a truncated delta is refused");
}

/// Where the first central directory entry (PK 1 2) starts.
fn first_cd(b: &Vec<u8>) -> i64 {
    let mut p: usize = 0;
    while p + 4 <= b.len() {
        if b[p] == 80 && b[p + 1] == 75 && b[p + 2] == 1 && b[p + 3] == 2 {
            return p as i64;
        }
        p += 1;
    }
    -1
}

/// A delta still rebuilds the target byte for byte.
fn round_trip(t: &mut Test, base: &Vec<u8>, target: &Vec<u8>, what: &str) {
    let d = smart::diff(base, target);
    let r = smart::apply(base, &d);
    t.ok(r.ok && bytes::equal(&r.data, target), what);
}

fn entry_like(e: &Entry) -> Entry {
    let mut c = Entry::new();
    c.name = e.name.clone();
    c.method = e.method;
    c.crc = e.crc;
    c.usize = e.usize;
    c.raw = e.raw.clone();
    c
}

/// Archives that cannot be read whole: no crash, no endless inflate, and the
/// delta falls back to bytes.
fn broken(t: &mut Test) {
    t.start("broken archives");
    let base = load("base.xlsx");
    let target = load("edit-cell.xlsx");
    let z = zip::read(&target);
    // a deflate stream cut short
    let mut cut: Vec<Entry> = Vec::new();
    // a part that claims to be smaller than it inflates to (a zip bomb)
    let mut small: Vec<Entry> = Vec::new();
    for e in z.entries.iter() {
        let mut c = entry_like(e);
        let mut s = entry_like(e);
        if e.name == "xl/worksheets/sheet1.xml" && e.method == 8 {
            c.raw = e.raw[0..20].to_vec();
            s.usize = 10;
        }
        cut.push(c);
        small.push(s);
    }
    let cut_zip = zip::write(&cut);
    let mut zc = zip::read(&cut_zip);
    let ci = zc.find("xl/worksheets/sheet1.xml");
    if ci >= 0 {
        zc.entries[ci as usize].content();
        t.ok(zc.entries[ci as usize].bad, "a cut part is bad");
    }
    round_trip(t, &base, &cut_zip, "cut part: the delta rebuilds it");
    round_trip(t, &cut_zip, &base, "cut part as the base: the delta rebuilds the target");
    let small_zip = zip::write(&small);
    let mut zs = zip::read(&small_zip);
    let si = zs.find("xl/worksheets/sheet1.xml");
    if si >= 0 {
        let c = zs.entries[si as usize].content();
        t.eq_int(c.len() as i64, 0, "inflate stops at the size the archive gives");
        t.ok(zs.entries[si as usize].bad, "an oversized part is bad");
    }
    round_trip(t, &base, &small_zip, "oversized part: the delta rebuilds it");
    // a name that runs past the end of the file
    let at = first_cd(&target);
    t.ok(at > 0, "finds the central directory");
    let mut long_name = target.clone();
    long_name[(at + 28) as usize] = 255;
    long_name[(at + 29) as usize] = 255;
    t.ok(!zip::read(&long_name).ok, "a name past the end is refused");
    round_trip(t, &base, &long_name, "a name past the end: byte delta");
    // ZIP64 sizes
    let mut z64 = target.clone();
    let mut k: i64 = 20;
    while k < 24 {
        z64[(at + k) as usize] = 255;
        k += 1;
    }
    let r64 = zip::read(&z64);
    t.ok(!r64.ok, "ZIP64 is refused");
    t.eq_str(&r64.error, "ZIP64 is not supported", "says why");
    round_trip(t, &base, &z64, "ZIP64: byte delta");
    round_trip(t, &z64, &base, "ZIP64 as the base: byte delta");
}

pub fn run(t: &mut Test) {
    zip_test(t);
    edit(t, "edit-cell.xlsx", 400);
    edit(t, "edit-row.xlsx", 600);
    edit(t, "insert-rows.xlsx", 6000);
    edit(t, "delete-rows.xlsx", 600);
    edit(t, "add-sheet.xlsx", 8000);
    edit(t, "style-header.xlsx", 1500);
    edit(t, "edit-column.xlsx", 16000);
    damage(t);
    broken(t);
}
