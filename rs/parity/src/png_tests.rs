//! ../../tests/PngTests.rgr: the PNG pixel delta on testdata/images.
use crate::harness::Test;
use rangerdiff::bytes;
use rangerdiff::delta;
use rangerdiff::inflate::Inflate;
use rangerdiff::png;
use rangerdiff::smart;
use std::fs;

pub fn load(name: &str) -> Vec<u8> {
    fs::read(format!("testdata/images/{}", name)).unwrap_or_default()
}

fn one(t: &mut Test, name: &str) {
    t.start(&format!("png {}", name));
    let base = load("shot.png");
    let target = load(name);
    let d = png::diff(&base, &target);
    t.ok(png::is_png_delta(&d), "is a pixel delta");
    let r = png::apply(&base, &d);
    t.ok(r.ok, &format!("applies {}", r.error));
    // same skeleton and pixels as the target
    let want = png::split(&target);
    let got = png::split(&r.data);
    t.ok(got.ok, &format!("rebuilt PNG reads {}", got.error));
    t.ok(bytes::equal(&want.pixels, &got.pixels), "same pixels");
    t.ok(bytes::equal(&want.skeleton, &got.skeleton), "same chunks");
    let plain = delta::diff(&base, &target);
    t.ok(
        d.len() < plain.len(),
        &format!("pixel delta {} < byte delta {}", d.len(), plain.len()),
    );
}

fn smart_test(t: &mut Test) {
    t.start("smart");
    let b1 = load("shot.png");
    let b2 = load("shot-annotated.png");
    let d = smart::diff(&b1, &b2);
    t.eq_int(smart::kind_of(&d), 3, "png gets the pixel delta");
    t.ok(smart::apply(&b1, &d).ok, "applies");
    let x1 = fs::read("testdata/xlsx/base.xlsx").unwrap_or_default();
    let x2 = fs::read("testdata/xlsx/edit-cell.xlsx").unwrap_or_default();
    let dx = smart::diff(&x1, &x2);
    t.eq_int(smart::kind_of(&dx), 2, "xlsx gets the segmented delta");
    let t1 = bytes::from_text("# Title\n\nSome text\n");
    let t2 = bytes::from_text("# Title\n\nSome more text\n");
    let dt = smart::diff(&t1, &t2);
    t.eq_int(smart::kind_of(&dt), 1, "text gets the byte delta");
    t.ok(smart::exact(&dt), "byte delta is exact");
    let rt = smart::apply(&t1, &dt);
    t.ok(bytes::equal(&rt.data, &t2), "text applies");
}

/// A header that claims fewer pixels than the stream holds: inflate stops at
/// the header's size and the delta falls back to bytes.
fn lying(t: &mut Test) {
    t.start("png header too small");
    let base = load("shot.png");
    let mut bad = load("shot-annotated.png");
    // height 1
    bad[20] = 0;
    bad[21] = 0;
    bad[22] = 0;
    bad[23] = 1;
    let parts = png::split(&bad);
    t.ok(!parts.ok, &format!("refused: {}", parts.error));
    let d = smart::diff(&base, &bad);
    let r = smart::apply(&base, &d);
    t.ok(r.ok && bytes::equal(&r.data, &bad), "the delta rebuilds it");
}

pub fn run(t: &mut Test) {
    one(t, "shot-annotated.png");
    one(t, "shot-text.png");
    smart_test(t);
    lying(t);
    t.start("zlib");
    // a zlib stream with no pixels still reads
    let z = png::zlib_stored(&Vec::new());
    let mut inf = Inflate::from(&z, 2);
    inf.run();
    t.eq_int(inf.out.len() as i64, 0, "empty stored zlib");
    let pixels = png::split(&load("shot.png")).pixels;
    let z2 = png::zlib_stored(&pixels);
    let mut inf2 = Inflate::from(&z2, 2);
    inf2.run();
    t.ok(bytes::equal(&inf2.out, &pixels), "stored zlib round trip");
    t.eq_int(inf2.input_pos(), z2.len() as i64 - 4, "Adler-32 follows the stream");
}
