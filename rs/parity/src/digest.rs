//! Lines that pin the encoded formats: the same data through the .rgr
//! library (../../parity/Parity.rgr) must print the same.
use crate::delta_tests::mutate;
use crate::harness::Random;
use rangerdiff::bytes;
use rangerdiff::bytes::Writer;
use rangerdiff::delta;
use rangerdiff::pack;
use rangerdiff::png;
use rangerdiff::repo::{Repo, Tree};
use rangerdiff::xlsx;
use rangerdiff::zip;
use std::fs;

fn sum_hex(b: &Vec<u8>) -> String {
    let mut w = Writer::new();
    w.u32(bytes::adler32(b));
    bytes::hex(&w.to_bytes())
}

pub fn run() {
    let mut w = Writer::new();
    w.varint(0);
    w.varint(127);
    w.varint(128);
    w.varint(300000);
    w.zigzag(-1);
    w.zigzag(-70000);
    w.u32(-1);
    w.u32le(305419896);
    w.u16le(4660);
    w.text("päivää 🙂");
    println!("digest writer {}", bytes::hex(&w.to_bytes()));
    let txt = bytes::from_text("Hyvää päivää, maailma 🙂 \u{1F600}");
    println!("digest text {} {} {}", txt.len(), bytes::hex(&txt), bytes::to_text(&txt));
    let mut r = Random::new(424242);
    let mut round = 0;
    while round < 40 {
        let size = r.below(30000);
        let base = if round % 2 == 0 { r.text_bytes(size) } else { r.bytes(size) };
        let mut target = base.clone();
        let edits = 1 + r.below(4);
        let mut k = 0;
        while k < edits {
            target = mutate(&mut r, &target);
            k += 1;
        }
        let d = delta::diff(&base, &target);
        let i = delta::info(&d);
        println!(
            "digest delta {} {} {} {} {} {} {} {}",
            round,
            base.len(),
            target.len(),
            d.len(),
            sum_hex(&d),
            i.copies,
            i.adds,
            i.add_bytes
        );
        round += 1;
    }
    let small = delta::diff(&bytes::from_text("hello world, hello world"), &bytes::from_text("hello there world, hello world!"));
    println!("digest small {}", bytes::hex(&small));
    files();
}

fn read(path: &str) -> Vec<u8> {
    fs::read(path).unwrap_or_default()
}

/// The container, PNG and repository formats on testdata/.
fn files() {
    let base = read("testdata/xlsx/base.xlsx");
    let mut z = zip::read(&base);
    let si = z.find("xl/worksheets/sheet1.xml");
    let sheet = z.entries[si as usize].content();
    let enc = xlsx::encode(&sheet);
    println!("digest sheet {} {}", enc.len(), sum_hex(&enc));
    let zw = zip::write(&z.entries);
    println!("digest zip {} {} {}", z.entries.len(), zw.len(), sum_hex(&zw));
    let names = ["edit-cell.xlsx", "edit-row.xlsx", "insert-rows.xlsx", "delete-rows.xlsx", "add-sheet.xlsx", "style-header.xlsx", "edit-column.xlsx"];
    for n in names.iter() {
        let d = pack::diff(&base, &read(&format!("testdata/xlsx/{}", n)));
        println!("digest pack {} {} {}", n, d.len(), sum_hex(&d));
    }
    let shot = read("testdata/images/shot.png");
    for pn in ["shot-annotated.png", "shot-text.png"].iter() {
        let target = read(&format!("testdata/images/{}", pn));
        let pd = png::diff(&shot, &target);
        let r = png::apply(&shot, &pd);
        println!("digest png {} {} {} {}", pn, pd.len(), sum_hex(&pd), sum_hex(&r.data));
    }
    let mut r = Repo::new();
    let mut t = Tree::new();
    t.entries.push(r.entry_of("deck.md", &bytes::from_text("# Deck\n\nHello"), ""));
    t.entries.push(r.entry_of("media/shot.png", &shot, "{\"bright\":20}"));
    let c1 = r.commit_tree(&t, &Vec::new(), "tero", "laptop", "2026-10-03T10:00:00Z", "First");
    let mut t2 = Tree::new();
    t2.entries.push(r.entry_of("deck.md", &bytes::from_text("# Deck\n\nHello again"), ""));
    t2.entries.push(r.entry_of("media/shot.png", &read("testdata/images/shot-text.png"), ""));
    let c2 = r.commit_tree(&t2, &vec![c1.clone()], "tero", "laptop", "2026-10-03T10:01:00Z", "Second");
    println!("digest repo {} {} {}", c1, c2, r.stored_bytes());
}
