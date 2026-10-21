//! SHA-256 (FIPS 180-4) of bytes, as 64 hex digits: the id of every stored
//! object. Built on `u32p` so the same digest comes out on every target; a
//! browser host may use crypto.subtle instead and gets the same string.
use crate::bytes;
use crate::u32p;

const K: [&str; 64] = [
    "428a2f98", "71374491", "b5c0fbcf", "e9b5dba5", "3956c25b", "59f111f1", "923f82a4", "ab1c5ed5",
    "d807aa98", "12835b01", "243185be", "550c7dc3", "72be5d74", "80deb1fe", "9bdc06a7", "c19bf174",
    "e49b69c1", "efbe4786", "0fc19dc6", "240ca1cc", "2de92c6f", "4a7484aa", "5cb0a9dc", "76f988da",
    "983e5152", "a831c66d", "b00327c8", "bf597fc7", "c6e00bf3", "d5a79147", "06ca6351", "14292967",
    "27b70a85", "2e1b2138", "4d2c6dfc", "53380d13", "650a7354", "766a0abb", "81c2c92e", "92722c85",
    "a2bfe8a1", "a81a664b", "c24b8b70", "c76c51a3", "d192e819", "d6990624", "f40e3585", "106aa070",
    "19a4c116", "1e376c08", "2748774c", "34b0bcb5", "391c0cb3", "4ed8aa4a", "5b9cca4f", "682e6ff3",
    "748f82ee", "78a5636f", "84c87814", "8cc70208", "90befffa", "a4506ceb", "bef9a3f7", "c67178f2",
];

const H0: [&str; 8] = ["6a09e667", "bb67ae85", "3c6ef372", "a54ff53a", "510e527f", "9b05688c", "1f83d9ab", "5be0cd19"];

/// Eight hex digits as a 32-bit pattern.
pub fn parse(h: &str) -> i64 {
    u32p::from_halves(parse16(&h[0..4]), parse16(&h[4..8]))
}

fn parse16(h: &str) -> i64 {
    let mut v: i64 = 0;
    for c in h.chars() {
        let d = c as i64;
        let mut x = d - 48;
        if d >= 97 {
            x = d - 87;
        }
        v = v * 16 + x;
    }
    v
}

/// A 32-bit pattern as eight hex digits.
pub fn hex32(v: i64) -> String {
    let digits = "0123456789abcdef";
    let mut out = String::new();
    let mut i = 0;
    while i < 4 {
        let b = u32p::byte_at(v, i) as usize;
        out.push_str(&digits[b / 16..b / 16 + 1]);
        out.push_str(&digits[b % 16..b % 16 + 1]);
        i += 1;
    }
    out
}

/// The digest of `data`.
pub fn hash(data: &Vec<u8>) -> String {
    let mut k: Vec<i64> = Vec::new();
    for h in K.iter() {
        k.push(parse(h));
    }
    let mut hs: Vec<i64> = Vec::new();
    for h in H0.iter() {
        hs.push(parse(h));
    }
    let n = data.len() as i64;
    // padded message: data, 0x80, zeros, 64-bit big-endian bit length
    let total = (n + 72) / 64 * 64;
    let mut msg = data.clone();
    msg.push(128);
    while (msg.len() as i64) < total {
        msg.push(0);
    }
    // bit length = n * 8: below 2^31 for n < 2^28, so the top four bytes stay 0
    let bits = n * 8;
    let mut j = 0;
    while j < 4 {
        msg[(total - 4 + j) as usize] = u32p::byte_at(bits, j) as u8;
        j += 1;
    }
    let mut w: Vec<i64> = vec![0; 64];
    let mut off: i64 = 0;
    while off < total {
        let mut t: i64 = 0;
        while t < 16 {
            let p = (off + t * 4) as usize;
            w[t as usize] = u32p::from_bytes_be(msg[p] as i64, msg[p + 1] as i64, msg[p + 2] as i64, msg[p + 3] as i64);
            t += 1;
        }
        while t < 64 {
            let w15 = w[(t - 15) as usize];
            let w2 = w[(t - 2) as usize];
            let s0 = u32p::rotr(w15, 7) ^ u32p::rotr(w15, 18) ^ u32p::shr(w15, 3);
            let s1 = u32p::rotr(w2, 17) ^ u32p::rotr(w2, 19) ^ u32p::shr(w2, 10);
            let sum1 = u32p::add(w[(t - 16) as usize], s0);
            let sum2 = u32p::add(w[(t - 7) as usize], s1);
            w[t as usize] = u32p::add(sum1, sum2);
            t += 1;
        }
        let mut a = hs[0];
        let mut b = hs[1];
        let mut c = hs[2];
        let mut d = hs[3];
        let mut e = hs[4];
        let mut f = hs[5];
        let mut g = hs[6];
        let mut h = hs[7];
        let mut i = 0;
        while i < 64 {
            let big_s1 = u32p::rotr(e, 6) ^ u32p::rotr(e, 11) ^ u32p::rotr(e, 25);
            let ch = (e & f) ^ (u32p::bnot(e) & g);
            let t1a = u32p::add(h, big_s1);
            let t1b = u32p::add(ch, k[i]);
            let t1 = u32p::add(u32p::add(t1a, t1b), w[i]);
            let big_s0 = u32p::rotr(a, 2) ^ u32p::rotr(a, 13) ^ u32p::rotr(a, 22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let t2 = u32p::add(big_s0, maj);
            h = g;
            g = f;
            f = e;
            e = u32p::add(d, t1);
            d = c;
            c = b;
            b = a;
            a = u32p::add(t1, t2);
            i += 1;
        }
        hs[0] = u32p::add(hs[0], a);
        hs[1] = u32p::add(hs[1], b);
        hs[2] = u32p::add(hs[2], c);
        hs[3] = u32p::add(hs[3], d);
        hs[4] = u32p::add(hs[4], e);
        hs[5] = u32p::add(hs[5], f);
        hs[6] = u32p::add(hs[6], g);
        hs[7] = u32p::add(hs[7], h);
        off += 64;
    }
    let mut out = String::new();
    for v in &hs {
        out.push_str(&hex32(*v));
    }
    out
}

/// The digest of a string's UTF-8 bytes.
pub fn text(s: &str) -> String {
    hash(&bytes::from_text(s))
}
