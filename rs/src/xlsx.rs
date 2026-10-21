//! Worksheet XML in a row-relative form, as ../src/RdXlsx.rgr, so inserting
//! or deleting rows does not change every row below. Row numbers, cell
//! addresses and formula references become markers that start with byte
//! 0x01, which XML 1.0 does not allow, so a marker cannot clash with content:
//!
//!   <row r="1050">     →  <row r="\1R+1">     distance from the previous row
//!   <c r="F1050">      →  <c r="F\1C">        the cell is in its row
//!   <f>D1050*E1050</f> →  <f>D\1F0*E\1F0</f>  distance from the formula's row
//!
//! decode(encode(x)) == x is checked on every encode; a sheet that does not
//! round-trip (or holds a 0x01 byte) is left as it is.
use crate::bytes;
use crate::bytes::Writer;

pub fn is_sheet(name: &str) -> bool {
    let n = name.chars().count() as i64;
    name.starts_with("xl/worksheets/") && n >= 4 && name.ends_with(".xml")
}

/// Whether the bytes at `p` spell `s`.
pub fn at(b: &Vec<u8>, p: i64, s: &str) -> bool {
    let n = s.as_bytes().len() as i64;
    if p + n > b.len() as i64 {
        return false;
    }
    let mut i: i64 = 0;
    while i < n {
        if b[(p + i) as usize] != s.as_bytes()[i as usize] {
            return false;
        }
        i += 1;
    }
    true
}

/// The byte at `p`, 0 past the end.
pub fn byte_at(b: &Vec<u8>, p: i64) -> i64 {
    if p >= b.len() as i64 {
        return 0;
    }
    b[p as usize] as i64
}

fn is_digit(c: i64) -> bool {
    c >= 48 && c <= 57
}

fn is_upper(c: i64) -> bool {
    c >= 65 && c <= 90
}

fn is_word_char(c: i64) -> bool {
    is_upper(c) || is_digit(c) || (c >= 97 && c <= 122) || c == 95 || c == 46
}

/// A decimal int, digit by digit.
pub fn write_int(w: &mut Writer, value: i64) {
    let mut v = value;
    if v < 0 {
        w.byte(45);
        v = 0 - v;
    }
    let mut div: i64 = 1;
    while div * 10 <= v {
        div = div * 10;
    }
    while div > 0 {
        w.byte(48 + (v / div) % 10);
        div = div / 10;
    }
}

/// The digits at `p` as an int; -1 when there are none, more than 9, or a
/// leading 0 (unless the number is 0).
pub fn read_num(b: &Vec<u8>, p: i64, end: i64) -> i64 {
    let mut v: i64 = 0;
    let mut i = p;
    while i < end && is_digit(b[i as usize] as i64) {
        v = v * 10 + (b[i as usize] as i64 - 48);
        i += 1;
    }
    let len = i - p;
    if len == 0 || len > 9 {
        return -1;
    }
    if b[p as usize] == 48 && len > 1 {
        return -1;
    }
    v
}

pub fn num_len(b: &Vec<u8>, p: i64, end: i64) -> i64 {
    let mut i = p;
    while i < end && is_digit(b[i as usize] as i64) {
        i += 1;
    }
    i - p
}

fn tag_end(b: &Vec<u8>, p: i64) -> i64 {
    let n = b.len() as i64;
    let mut e = p;
    while e < n && b[e as usize] != 62 {
        e += 1;
    }
    e
}

/// The encoded sheet, or the sheet itself when it cannot be encoded.
pub fn encode(b: &Vec<u8>) -> Vec<u8> {
    let n = b.len() as i64;
    for c in b.iter() {
        if *c == 1 {
            return b.clone();
        }
    }
    let mut w = Writer::new();
    let mut prev_row: i64 = 0;
    let mut cur_row: i64 = 0;
    let mut in_formula = false;
    let mut in_quote = false;
    let mut p: i64 = 0;
    // the bytes [ps, p) are copied as they are, at the next marker
    let mut ps: i64 = 0;
    while p < n {
        let c = b[p as usize] as i64;
        if in_formula {
            if c == 60 && byte_at(b, p + 1) == 47 {
                in_formula = false;
                in_quote = false;
                p += 1;
                continue;
            }
            if c == 34 {
                in_quote = !in_quote;
            }
            // a reference: 1-3 capitals then digits, not inside a name or a
            // string, not a function call
            if !in_quote && is_upper(c) {
                let prev_ok = p == 0 || !is_word_char(b[(p - 1) as usize] as i64);
                if prev_ok {
                    let mut q = p;
                    while q < n && is_upper(b[q as usize] as i64) && q - p < 3 {
                        q += 1;
                    }
                    let dl = num_len(b, q, n);
                    let num = read_num(b, q, n);
                    let after = q + dl;
                    let next_c = byte_at(b, after);
                    if num > 0 && cur_row > 0 && !is_word_char(next_c) && next_c != 40 {
                        w.bytes(b, ps, q - ps);
                        w.byte(1);
                        w.byte(70);
                        write_int(&mut w, num - cur_row);
                        p = after;
                        ps = p;
                        continue;
                    }
                    // not a reference: the letters stay as they are
                    p = q;
                    continue;
                }
            }
            p += 1;
            continue;
        }
        if c == 60 {
            let c1 = byte_at(b, p + 1);
            let c2 = byte_at(b, p + 2);
            if c1 == 114 && at(b, p, "<row ") {
                let end_tag = tag_end(b, p);
                let ra = find_attr(b, p, end_tag, " r=\"");
                if ra > 0 {
                    let rv = read_num(b, ra, end_tag);
                    let rl = num_len(b, ra, end_tag);
                    if rv > 0 && byte_at(b, ra + rl) == 34 {
                        w.bytes(b, ps, ra - ps);
                        w.byte(1);
                        w.byte(82);
                        write_int(&mut w, rv - prev_row);
                        prev_row = rv;
                        cur_row = rv;
                        p = ra + rl;
                        ps = p;
                        continue;
                    }
                }
                // a row without a number: references stay as they are
                cur_row = 0;
            }
            if c1 == 99 && c2 == 32 && cur_row > 0 {
                let end_tag = tag_end(b, p);
                let ca = find_attr(b, p, end_tag, " r=\"");
                if ca > 0 {
                    let mut q = ca;
                    while q < end_tag && is_upper(b[q as usize] as i64) {
                        q += 1;
                    }
                    let cv = read_num(b, q, end_tag);
                    let cl = num_len(b, q, end_tag);
                    if q > ca && cv == cur_row && byte_at(b, q + cl) == 34 {
                        w.bytes(b, ps, q - ps);
                        w.byte(1);
                        w.byte(67);
                        p = q + cl;
                        ps = p;
                        continue;
                    }
                }
            }
            if c1 == 102 && (c2 == 62 || c2 == 32) {
                let end_tag = tag_end(b, p);
                // <f .../> has no text
                if end_tag < n && b[(end_tag - 1) as usize] != 47 {
                    p = end_tag + 1;
                    in_formula = true;
                    in_quote = false;
                    continue;
                }
            }
        }
        p += 1;
    }
    w.bytes(b, ps, n - ps);
    let enc = w.to_bytes();
    if !bytes::equal(&decode(&enc), b) {
        return b.clone();
    }
    enc
}

/// Where the value of `attr` (given with its quote) starts between `p` and
/// `end`, or -1.
pub fn find_attr(b: &Vec<u8>, p: i64, end: i64, attr: &str) -> i64 {
    let mut q = p;
    while q < end {
        if at(b, q, attr) {
            return q + attr.as_bytes().len() as i64;
        }
        q += 1;
    }
    -1
}

pub fn is_encoded(b: &Vec<u8>) -> bool {
    for c in b.iter() {
        if *c == 1 {
            return true;
        }
    }
    false
}

/// A signed decimal at `p`: (value, length).
pub fn read_signed(b: &Vec<u8>, p: i64) -> (i64, i64) {
    let n = b.len() as i64;
    let mut neg = false;
    let mut i = p;
    if i < n && b[i as usize] == 45 {
        neg = true;
        i += 1;
    }
    let mut v: i64 = 0;
    while i < n && is_digit(b[i as usize] as i64) {
        v = v * 10 + (b[i as usize] as i64 - 48);
        i += 1;
    }
    if neg {
        v = 0 - v;
    }
    (v, i - p)
}

pub fn decode(b: &Vec<u8>) -> Vec<u8> {
    let n = b.len() as i64;
    let mut w = Writer::new();
    let mut row: i64 = 0;
    let mut p: i64 = 0;
    let mut ps: i64 = 0;
    while p < n {
        let c = b[p as usize];
        if c == 1 && p + 1 < n {
            w.bytes(b, ps, p - ps);
            let kind = b[(p + 1) as usize] as i64;
            if kind == 67 {
                write_int(&mut w, row);
                p += 2;
                ps = p;
                continue;
            }
            let (value, len) = read_signed(b, p + 2);
            if kind == 82 {
                row = row + value;
                write_int(&mut w, row);
            } else {
                write_int(&mut w, row + value);
            }
            p = p + 2 + len;
            ps = p;
            continue;
        }
        p += 1;
    }
    w.bytes(b, ps, n - ps);
    w.to_bytes()
}
