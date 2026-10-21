//! ../../tests/DeltaTests.rgr: every edit kind, the edges, random edit
//! sequences, damage.
use crate::harness::{part, Random, Test};
use rangerdiff::bytes;
use rangerdiff::delta;
use rangerdiff::delta::DeltaInfo;

fn txt(s: &str) -> Vec<u8> {
    bytes::from_text(s)
}

/// diff, apply, compare; returns the delta info
fn round_trip(t: &mut Test, base: &Vec<u8>, target: &Vec<u8>, what: &str) -> DeltaInfo {
    let d = delta::diff(base, target);
    let r = delta::apply(base, &d);
    t.ok(r.ok, &format!("{} applies ({})", what, r.error));
    t.ok(bytes::equal(&r.data, target), &format!("{} gives the new version", what));
    delta::info(&d)
}

fn edges(t: &mut Test) {
    t.start("edges");
    let e: Vec<u8> = Vec::new();
    let x = txt("some bytes");
    round_trip(t, &e, &e, "empty to empty");
    let i1 = round_trip(t, &e, &x, "empty to text");
    t.eq_int(i1.add_bytes, 10, "all added");
    let i2 = round_trip(t, &x, &e, "text to empty");
    t.eq_int(i2.ops.len() as i64, 0, "no operations");
    let i3 = round_trip(t, &x, &x, "same");
    t.eq_int(i3.copies, 1, "one copy");
    t.eq_int(i3.add_bytes, 0, "nothing added");
    let one: Vec<u8> = vec![0];
    let two: Vec<u8> = vec![7];
    round_trip(t, &one, &two, "one byte changed");
    let mut r = Random::new(7);
    let a = r.bytes(3000);
    let b = r.bytes(3000);
    let i4 = round_trip(t, &a, &b, "unrelated random");
    t.ok(i4.add_bytes >= 2990, "unrelated data is added, not copied");
}

fn edits(t: &mut Test) {
    t.start("edit commands");
    let mut r = Random::new(11);
    let base = r.text_bytes(10000);
    let ins = txt("INSERTED TEXT");
    // insert in the middle: the tail moves, it is still one copy
    let d1 = delta::insert_at(&base, 4000, &ins);
    let r1 = delta::apply(&base, &d1);
    t.ok(r1.ok, "insertAt applies");
    t.eq_int(r1.data.len() as i64, 10013, "insertAt length");
    t.ok(d1.len() < 40, "insertAt delta is small");
    let i1 = round_trip(t, &base, &r1.data, "diff of an insert");
    t.eq_int(i1.copies, 2, "insert: two copies");
    t.eq_int(i1.add_bytes, 13, "insert: only the new bytes added");
    // delete
    let d2 = delta::delete_at(&base, 2000, 500);
    let r2 = delta::apply(&base, &d2);
    t.eq_int(r2.data.len() as i64, 9500, "deleteAt length");
    let i2 = round_trip(t, &base, &r2.data, "diff of a delete");
    t.eq_int(i2.copies, 2, "delete: two copies");
    t.eq_int(i2.add_bytes, 0, "delete: nothing added");
    // offset + rewrite (same length)
    let d3 = delta::rewrite_at(&base, 5000, &ins);
    let r3 = delta::apply(&base, &d3);
    t.eq_int(r3.data.len() as i64, 10000, "rewriteAt keeps the length");
    let i3 = round_trip(t, &base, &r3.data, "diff of a rewrite");
    t.ok(i3.add_bytes <= 13, "rewrite: at most the rewritten bytes added");
    // rewrite past the end grows the file
    let d4 = delta::rewrite_at(&base, 9995, &ins);
    let r4 = delta::apply(&base, &d4);
    t.eq_int(r4.data.len() as i64, 10008, "rewrite past the end");
    // replace a range with something longer
    let d5 = delta::replace_at(&base, 100, 3, &ins);
    let r5 = delta::apply(&base, &d5);
    t.eq_int(r5.data.len() as i64, 10010, "replaceAt length");
    round_trip(t, &base, &r5.data, "diff of a replace");
    // a header grows: everything after it moves
    let hdr = r.bytes(64);
    let grown = bytes::concat(&hdr, &base);
    let i6 = round_trip(t, &base, &grown, "header grows");
    t.eq_int(i6.add_bytes, 64, "header: only the header added");
    t.eq_int(i6.copies, 1, "header: the rest is one copy");
    // two halves swapped
    let h1 = part(&base, 0, 5000);
    let h2 = part(&base, 5000, 10000);
    let swapped = bytes::concat(&h2, &h1);
    let i7 = round_trip(t, &base, &swapped, "halves swapped");
    t.ok(i7.add_bytes < 32, "swap: copies, not adds");
    // the same block repeated
    let twice = bytes::concat(&base, &base);
    let i8 = round_trip(t, &base, &twice, "content doubled");
    t.eq_int(i8.add_bytes, 0, "doubled: nothing added");
}

/// a random edit of b
pub fn mutate(r: &mut Random, b: &Vec<u8>) -> Vec<u8> {
    let n = b.len() as i64;
    let kind = r.below(5);
    let off = r.below(n + 1);
    let mut len = r.below(200);
    if off + len > n {
        len = n - off;
    }
    let pre = part(b, 0, off);
    let post = part(b, off + len, n);
    if kind == 0 {
        // insert
        let n_mid = 1 + r.below(300);
        let mid = r.text_bytes(n_mid);
        let rest = part(b, off, n);
        return bytes::concat(&bytes::concat(&pre, &mid), &rest);
    }
    if kind == 1 {
        // delete
        return bytes::concat(&pre, &post);
    }
    if kind == 2 {
        // rewrite in place
        let mid2 = r.bytes(len);
        return bytes::concat(&bytes::concat(&pre, &mid2), &post);
    }
    if kind == 3 {
        // move a block to the end
        let moved = part(b, off, off + len);
        return bytes::concat(&bytes::concat(&pre, &post), &moved);
    }
    // copy a block somewhere else
    let blk = part(b, off, off + len);
    let at = r.below(n + 1);
    let p2 = part(b, 0, at);
    let q2 = part(b, at, n);
    bytes::concat(&bytes::concat(&p2, &blk), &q2)
}

fn random(t: &mut Test) {
    t.start("random edit sequences");
    let mut r = Random::new(12345);
    let mut round = 0;
    while round < 300 {
        let size = r.below(20000);
        let base = if round % 3 == 0 { r.bytes(size) } else { r.text_bytes(size) };
        let mut target = base.clone();
        let edits = 1 + r.below(6);
        let mut k = 0;
        while k < edits {
            target = mutate(&mut r, &target);
            k += 1;
        }
        let d = delta::diff(&base, &target);
        let res = delta::apply(&base, &d);
        if !res.ok || !bytes::equal(&res.data, &target) {
            t.ok(false, &format!("round {} {}", round, res.error));
        } else {
            t.ok(true, "");
        }
        // the delta must stay near the edited amount, never above the file
        t.ok(d.len() <= target.len() + 32, "never much larger than the new version");
        round += 1;
    }
}

fn damage(t: &mut Test) {
    t.start("damage");
    let mut r = Random::new(99);
    let base = r.text_bytes(4000);
    let target = mutate(&mut r, &base);
    let d = delta::diff(&base, &target);
    let other = r.text_bytes(4000);
    let r1 = delta::apply(&other, &d);
    t.ok(!r1.ok, "wrong base is refused");
    let cut = part(&d, 0, d.len() as i64 - 3);
    let r2 = delta::apply(&base, &cut);
    t.ok(!r2.ok, "truncated delta is refused");
    let mut bad = d.clone();
    let last = bad.len() - 1;
    bad[last] = ((bad[last] as i64 + 1) % 256) as u8;
    let r3 = delta::apply(&base, &bad);
    t.ok(!r3.ok, "changed byte is caught");
    let r4 = delta::apply(&base, &txt("not a delta at all"));
    t.ok(!r4.ok, "garbage is refused");
}

fn reverse(t: &mut Test) {
    t.start("reverse");
    let mut r = Random::new(5);
    let base = r.text_bytes(8000);
    let m1 = mutate(&mut r, &base);
    let target = mutate(&mut r, &m1);
    let d = delta::diff(&base, &target);
    let back = delta::reverse(&base, &d);
    let res = delta::apply(&target, &back);
    t.ok(res.ok, "reverse applies to the new version");
    t.ok(bytes::equal(&res.data, &base), "reverse gives the base");
}

pub fn run(t: &mut Test) {
    edges(t);
    edits(t);
    random(t);
    damage(t);
    reverse(t);
}
