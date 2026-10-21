//! One diff/apply for every file, as ../src/RdSmart.rgr: ZIP containers
//! (XLSX, DOCX, PPTX) get the segmented delta (pack), PNG the pixel delta
//! (png), everything else the byte delta. The segmented form is used only
//! when it is clearly smaller (under 80 %) than the byte delta, because only
//! the byte delta rebuilds the file byte for byte.
use crate::delta;
use crate::delta::ApplyResult;
use crate::pack;
use crate::png;
use crate::zip;

/// 1 bytes, 2 container, 3 png; 0 not a RangerDiff delta.
pub fn kind_of(d: &Vec<u8>) -> i64 {
    if d.len() < 4 {
        return 0;
    }
    if d[0] != 82 || d[1] != 68 || d[2] != 1 {
        return 0;
    }
    d[3] as i64
}

pub fn diff(base: &Vec<u8>, target: &Vec<u8>) -> Vec<u8> {
    let plain = delta::diff(base, target);
    let mut smart = plain.clone();
    if zip::is_zip(base) && zip::is_zip(target) {
        smart = pack::diff(base, target);
    } else if png::is_png(base) && png::is_png(target) {
        smart = png::diff(base, target);
    }
    if smart.len() * 5 < plain.len() * 4 {
        return smart;
    }
    plain
}

pub fn apply(base: &Vec<u8>, d: &Vec<u8>) -> ApplyResult {
    let k = kind_of(d);
    if k == 2 {
        return pack::apply(base, d);
    }
    if k == 3 {
        return png::apply(base, d);
    }
    delta::apply(base, d)
}

/// Whether apply gives the file byte for byte (not only the same content).
pub fn exact(d: &Vec<u8>) -> bool {
    kind_of(d) == 1
}
