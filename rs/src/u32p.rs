//! 32-bit unsigned algebra that means the same thing on every target, as
//! Ranger's lib/core/RgU32.rgr: a u32 is carried as its SIGNED 32-bit bit
//! pattern in an `i64`, and every intermediate stays below 2^31, because
//! `int` is 32 bits on the C++ target and the bit operators are 32 bits on
//! JavaScript. Shifts are bounded to 0..31.

/// The pattern with only the top bit set, `-2^31`.
pub fn sign_bit() -> i64 {
    -2147483647 - 1
}

/// The low 16 bits.
pub fn lo_half(v: i64) -> i64 {
    v & 65535
}

/// Bits 16..31 as 0..65535.
pub fn hi_half(v: i64) -> i64 {
    (v >> 16) & 65535
}

/// The pattern `hi << 16 | lo`.
pub fn from_halves(hi: i64, lo: i64) -> i64 {
    let h = hi & 65535;
    let l = lo & 65535;
    let r = ((h & 32767) << 16) | l;
    if (h & 32768) != 0 {
        return r + sign_bit();
    }
    r
}

/// Any int folded to its 32-bit pattern.
pub fn wrap32(v: i64) -> i64 {
    from_halves(hi_half(v), lo_half(v))
}

/// Bitwise not.
pub fn bnot(a: i64) -> i64 {
    wrap32(!a)
}

/// Shift left by 0..31.
pub fn shl(v: i64, n: i64) -> i64 {
    let c = n & 31;
    if c == 0 {
        return wrap32(v);
    }
    let lo = lo_half(v);
    let hi = hi_half(v);
    if c < 16 {
        let new_lo = (lo << c) & 65535;
        let carry = lo >> (16 - c);
        let new_hi = ((hi << c) + carry) & 65535;
        return from_halves(new_hi, new_lo);
    }
    let d = c - 16;
    from_halves((lo << d) & 65535, 0)
}

/// Logical shift right by 0..31.
pub fn shr(v: i64, n: i64) -> i64 {
    let c = n & 31;
    if c == 0 {
        return wrap32(v);
    }
    let body = v & 2147483647;
    let mut r = body >> c;
    if v < 0 {
        r = r | (1 << (31 - c));
    }
    r
}

/// Rotate right by 0..31.
pub fn rotr(v: i64, n: i64) -> i64 {
    let c = n & 31;
    if c == 0 {
        return wrap32(v);
    }
    shl(v, 32 - c) | shr(v, c)
}

/// Addition modulo 2^32.
pub fn add(a: i64, b: i64) -> i64 {
    let lo = lo_half(a) + lo_half(b);
    let carry = lo >> 16;
    let hi = hi_half(a) + hi_half(b) + carry;
    from_halves(hi & 65535, lo & 65535)
}

/// Byte `i` (0 = most significant) of the pattern.
pub fn byte_at(v: i64, i: i64) -> i64 {
    shr(v, 8 * (3 - i)) & 255
}

/// The pattern of four big-endian bytes.
pub fn from_bytes_be(b0: i64, b1: i64, b2: i64, b3: i64) -> i64 {
    let hi = ((b0 & 255) << 8) + (b1 & 255);
    let lo = ((b2 & 255) << 8) + (b3 & 255);
    from_halves(hi, lo)
}
