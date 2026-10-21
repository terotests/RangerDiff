//! ../../tests/ShaTests.rgr
use crate::harness::Test;
use rangerdiff::sha256;

pub fn run(t: &mut Test) {
    t.start("sha256");
    t.eq_str(&sha256::text(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "empty");
    t.eq_str(&sha256::text("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "abc");
    t.eq_str(
        &sha256::text("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
        "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
        "two blocks",
    );
    t.eq_str(&sha256::text("äö€😀"), "5a945eca3a8e63234c1f34c91995c66e1bbac68c8df88facbddc4e83bfb4384f", "utf-8 text");
    let b: Vec<u8> = vec![0; 1000];
    t.eq_str(&sha256::hash(&b), "541b3e9daa09b20bf85fa273e5cbd3e80185aa4ec298e765db87742b70138a53", "1000 zero bytes");
}
