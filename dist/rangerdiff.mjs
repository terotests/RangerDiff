export class RgNum  {
}
RgNum.nan = function() {
  return 0.0 / 0.0;
};
RgNum.inf = function() {
  return 1.0 / 0.0;
};
RgNum.negInf = function() {
  const one = 1.0;
  return 0.0 - one / 0.0;
};
RgNum.negZero = function() {
  const negOne = 0.0 - 1.0;
  return negOne / RgNum.inf();
};
RgNum.isNaN = function(v) {
  return v != v;
};
RgNum.isFinite = function(v) {
  if ( v != v ) {
    return false;
  }
  const i = RgNum.inf();
  if ( v == i ) {
    return false;
  }
  if ( v == 0.0 - i ) {
    return false;
  }
  return true;
};
RgNum.isNegZero = function(v) {
  if ( v != 0.0 ) {
    return false;
  }
  return 1.0 / v < 0.0;
};
RgNum.isNegative = function(v) {
  if ( v < 0.0 ) {
    return true;
  }
  return RgNum.isNegZero(v);
};
RgNum.isInteger = function(v) {
  if ( false == RgNum.isFinite(v) ) {
    return false;
  }
  return RgNum.trunc(v) == v;
};
RgNum.abs = function(v) {
  if ( v != v ) {
    return v;
  }
  if ( RgNum.isNegZero(v) ) {
    return 0.0;
  }
  if ( v < 0.0 ) {
    return 0.0 - v;
  }
  return v;
};
RgNum.roundingBig = function() {
  return 4503599627370496.0;
};
RgNum.floorD = function(v) {
  if ( v != v ) {
    return v;
  }
  if ( false == RgNum.isFinite(v) ) {
    return v;
  }
  if ( v == 0.0 ) {
    return v;
  }
  const big = RgNum.roundingBig();
  let av = v;
  if ( av < 0.0 ) {
    av = 0.0 - av;
  }
  if ( av >= big ) {
    return v;
  }
  let t = 0.0;
  if ( v >= 0.0 ) {
    t = (v + big) - big;
  } else {
    t = (v - big) + big;
  }
  if ( t > v ) {
    return t - 1.0;
  }
  return t;
};
RgNum.ceilD = function(v) {
  if ( v != v ) {
    return v;
  }
  if ( false == RgNum.isFinite(v) ) {
    return v;
  }
  const r = 0.0 - RgNum.floorD((0.0 - v));
  if ( r == 0.0 ) {
    if ( RgNum.isNegative(v) ) {
      return RgNum.negZero();
    }
    return 0.0;
  }
  return r;
};
RgNum.trunc = function(v) {
  if ( v != v ) {
    return v;
  }
  if ( false == RgNum.isFinite(v) ) {
    return v;
  }
  if ( v == 0.0 ) {
    return v;
  }
  if ( v < 0.0 ) {
    const t = 0.0 - RgNum.floorD((0.0 - v));
    if ( t == 0.0 ) {
      return RgNum.negZero();
    }
    return t;
  }
  return RgNum.floorD(v);
};
RgNum.round = function(v) {
  if ( v != v ) {
    return v;
  }
  if ( false == RgNum.isFinite(v) ) {
    return v;
  }
  if ( v == 0.0 ) {
    return v;
  }
  const big = RgNum.roundingBig();
  const av = RgNum.abs(v);
  if ( av >= big ) {
    return v;
  }
  const r = RgNum.floorD((v + 0.5));
  if ( r == 0.0 ) {
    if ( v < 0.0 ) {
      return RgNum.negZero();
    }
    return 0.0;
  }
  return r;
};
RgNum.sign = function(v) {
  if ( v != v ) {
    return v;
  }
  if ( v == 0.0 ) {
    return v;
  }
  if ( v < 0.0 ) {
    return 0.0 - 1.0;
  }
  return 1.0;
};
RgNum.min2 = function(a, b) {
  if ( a != a ) {
    return a;
  }
  if ( b != b ) {
    return b;
  }
  if ( a < b ) {
    return a;
  }
  if ( b < a ) {
    return b;
  }
  if ( RgNum.isNegZero(a) ) {
    return a;
  }
  if ( RgNum.isNegZero(b) ) {
    return b;
  }
  return a;
};
RgNum.max2 = function(a, b) {
  if ( a != a ) {
    return a;
  }
  if ( b != b ) {
    return b;
  }
  if ( a > b ) {
    return a;
  }
  if ( b > a ) {
    return b;
  }
  if ( RgNum.isNegZero(a) ) {
    return b;
  }
  return a;
};
RgNum.ln2 = function() {
  return 0.6931471805599453;
};
RgNum.ln10 = function() {
  return 2.302585092994046;
};
RgNum.exp = function(x) {
  if ( x != x ) {
    return x;
  }
  const i = RgNum.inf();
  if ( x == i ) {
    return i;
  }
  if ( x == 0.0 - i ) {
    return 0.0;
  }
  const l2 = RgNum.ln2();
  const kD = RgNum.floorD((x / l2 + 0.5));
  const r = x - kD * l2;
  let term = 1.0;
  let sum = 1.0;
  let n = 1;
  while (n < 24) {
    term = (term * r) / n;
    sum = sum + term;
    n = n + 1;
  };
  const k = Math.floor( kD);
  let scale = 1.0;
  if ( k >= 0 ) {
    scale = RgNum.pow2(k);
  } else {
    const down = RgNum.pow2((0 - k));
    scale = 1.0 / down;
  }
  return sum * scale;
};
RgNum.log = function(x) {
  if ( x != x ) {
    return x;
  }
  const i = RgNum.inf();
  if ( x < 0.0 ) {
    return RgNum.nan();
  }
  if ( x == 0.0 ) {
    return 0.0 - i;
  }
  if ( x == i ) {
    return i;
  }
  let k = 0;
  let m = x;
  while (m >= 2.0) {
    m = m / 2.0;
    k = k + 1;
  };
  while (m < 1.0) {
    m = m * 2.0;
    k = k - 1;
  };
  const z = (m - 1.0) / (m + 1.0);
  const z2 = z * z;
  let term = z;
  let sum = z;
  let n = 1;
  while (n < 30) {
    term = term * z2;
    sum = sum + term / (2 * n + 1);
    n = n + 1;
  };
  const l2 = RgNum.ln2();
  return 2.0 * sum + k * l2;
};
RgNum.pow2 = function(n) {
  let acc = 1.0;
  let base = 2.0;
  let e = n;
  if ( e < 0 ) {
    e = 0;
  }
  while (e > 0) {
    if ( (e & 1) == 1 ) {
      acc = acc * base;
    }
    base = base * base;
    e = (e >> 1);
  };
  return acc;
};
RgNum.powInt = function(base, expn) {
  let acc = 1.0;
  let b = base;
  let e = expn;
  let invert = false;
  if ( e < 0 ) {
    invert = true;
    e = 0 - e;
  }
  while (e > 0) {
    if ( (e & 1) == 1 ) {
      acc = acc * b;
    }
    b = b * b;
    e = (e >> 1);
  };
  if ( invert ) {
    if ( acc != 0.0 ) {
      return 1.0 / acc;
    }
    return RgNum.inf();
  }
  return acc;
};
RgNum.pow10 = function(n) {
  return RgNum.powInt(10.0, n);
};
RgNum.pow = function(base, expo) {
  const i = RgNum.inf();
  if ( expo != expo ) {
    return RgNum.nan();
  }
  if ( expo == 0.0 ) {
    return 1.0;
  }
  if ( base != base ) {
    return RgNum.nan();
  }
  const absBase = RgNum.abs(base);
  const expIsInt = RgNum.isInteger(expo);
  let expOdd = false;
  if ( expIsInt ) {
    const half = expo / 2.0;
    expOdd = RgNum.trunc(half) != half;
  }
  if ( expo == i ) {
    if ( absBase == 1.0 ) {
      return RgNum.nan();
    }
    if ( absBase > 1.0 ) {
      return i;
    }
    return 0.0;
  }
  if ( expo == 0.0 - i ) {
    if ( absBase == 1.0 ) {
      return RgNum.nan();
    }
    if ( absBase > 1.0 ) {
      return 0.0;
    }
    return i;
  }
  if ( base == i ) {
    if ( expo > 0.0 ) {
      return i;
    }
    return 0.0;
  }
  if ( base == 0.0 - i ) {
    if ( expo > 0.0 ) {
      if ( expIsInt && expOdd ) {
        return 0.0 - i;
      }
      return i;
    }
    if ( expIsInt && expOdd ) {
      return RgNum.negZero();
    }
    return 0.0;
  }
  if ( base == 0.0 ) {
    const negBase = RgNum.isNegZero(base);
    if ( expo > 0.0 ) {
      if ( negBase && (expIsInt && expOdd) ) {
        return RgNum.negZero();
      }
      return 0.0;
    }
    if ( negBase && (expIsInt && expOdd) ) {
      return 0.0 - i;
    }
    return i;
  }
  if ( base < 0.0 ) {
    if ( false == expIsInt ) {
      return RgNum.nan();
    }
  }
  if ( expIsInt ) {
    const av = RgNum.abs(expo);
    if ( av <= 1024.0 ) {
      return RgNum.powInt(base, Math.floor( expo));
    }
  }
  const r = RgNum.exp((expo * RgNum.log(absBase)));
  return r;
};
RgNum.sqrtD = function(v) {
  if ( v != v ) {
    return v;
  }
  if ( v < 0.0 ) {
    return RgNum.nan();
  }
  if ( v == 0.0 ) {
    return v;
  }
  return Math.sqrt(v);
};
RgNum.toUint32 = function(v) {
  if ( v != v ) {
    return 0.0;
  }
  if ( false == RgNum.isFinite(v) ) {
    return 0.0;
  }
  const two32 = 4294967296.0;
  const t = RgNum.trunc(v);
  let m = t - two32 * RgNum.floorD((t / two32));
  if ( m < 0.0 ) {
    m = m + two32;
  }
  return m;
};
RgNum.toInt32 = function(v) {
  const u = RgNum.toUint32(v);
  const two31 = 2147483648.0;
  if ( u >= two31 ) {
    return u - 4294967296.0;
  }
  return u;
};
RgNum.toFloat32 = function(v) {
  if ( v != v ) {
    return v;
  }
  if ( v == 0.0 ) {
    return v;
  }
  if ( false == RgNum.isFinite(v) ) {
    return v;
  }
  const neg = v < 0.0;
  let m = v;
  if ( neg ) {
    m = 0.0 - v;
  }
  let e = 0;
  while (m >= 2.0) {
    m = m / 2.0;
    e = e + 1;
  };
  while (m < 1.0) {
    m = m * 2.0;
    e = e - 1;
  };
  if ( e > 127 ) {
    if ( neg ) {
      return 0.0 - RgNum.inf();
    }
    return RgNum.inf();
  }
  const scaleBits = 8388608.0;
  const shifted = m * scaleBits;
  let rounded = RgNum.round(shifted);
  if ( rounded >= 16777216.0 ) {
    rounded = rounded / 2.0;
    e = e + 1;
    if ( e > 127 ) {
      if ( neg ) {
        return 0.0 - RgNum.inf();
      }
      return RgNum.inf();
    }
  }
  const mant = rounded / scaleBits;
  const out = mant * RgNum.powInt(2.0, e);
  if ( neg ) {
    return 0.0 - out;
  }
  return out;
};
export class RgU32  {
}
RgU32.twoPow31D = function() {
  return 2147483648.0;
};
RgU32.twoPow32D = function() {
  return 4294967296.0;
};
RgU32.signBit = function() {
  const m = 2147483647;
  return 0 - (m + 1);
};
RgU32.loHalf = function(v) {
  return (v & 65535);
};
RgU32.hiHalf = function(v) {
  return ((v >> 16) & 65535);
};
RgU32.fromHalves = function(hi, lo) {
  const h = (hi & 65535);
  const l = (lo & 65535);
  const r = (((h & 32767) << 16) | l);
  if ( (h & 32768) != 0 ) {
    return r + RgU32.signBit();
  }
  return r;
};
RgU32.wrap32 = function(v) {
  return RgU32.fromHalves(RgU32.hiHalf(v), RgU32.loHalf(v));
};
RgU32.band = function(a, b) {
  return (a & b);
};
RgU32.bor = function(a, b) {
  return (a | b);
};
RgU32.bxor = function(a, b) {
  return (a ^ b);
};
RgU32.bnot = function(a) {
  return RgU32.wrap32((~a));
};
RgU32.shiftCount = function(n) {
  const c = (n & 31);
  return c;
};
RgU32.shl = function(v, n) {
  const c = RgU32.shiftCount(n);
  if ( c == 0 ) {
    return RgU32.wrap32(v);
  }
  const lo = RgU32.loHalf(v);
  const hi = RgU32.hiHalf(v);
  let full = 0;
  if ( c < 16 ) {
    const newLo = ((lo << c) & 65535);
    const carry = (lo >> (16 - c));
    const newHi = (((hi << c) + carry) & 65535);
    full = RgU32.fromHalves(newHi, newLo);
  } else {
    const d = c - 16;
    const newHi_1 = ((lo << d) & 65535);
    full = RgU32.fromHalves(newHi_1, 0);
  }
  return full;
};
RgU32.shr = function(v, n) {
  const c = RgU32.shiftCount(n);
  if ( c == 0 ) {
    return RgU32.wrap32(v);
  }
  const body = (v & 2147483647);
  let r = (body >> c);
  if ( v < 0 ) {
    r = (r | (1 << (31 - c)));
  }
  return r;
};
RgU32.sar = function(v, n) {
  const c = RgU32.shiftCount(n);
  if ( c == 0 ) {
    return RgU32.wrap32(v);
  }
  return (RgU32.wrap32(v) >> c);
};
RgU32.rotl = function(v, n) {
  const c = RgU32.shiftCount(n);
  if ( c == 0 ) {
    return RgU32.wrap32(v);
  }
  const left = RgU32.shl(v, c);
  const right = RgU32.shr(v, (32 - c));
  return (left | right);
};
RgU32.rotr = function(v, n) {
  const c = RgU32.shiftCount(n);
  if ( c == 0 ) {
    return RgU32.wrap32(v);
  }
  const right = RgU32.shr(v, c);
  const left = RgU32.shl(v, (32 - c));
  return (left | right);
};
RgU32.addU = function(a, b) {
  const lo = RgU32.loHalf(a) + RgU32.loHalf(b);
  const carry = (lo >> 16);
  const hi = (RgU32.hiHalf(a) + RgU32.hiHalf(b)) + carry;
  return RgU32.fromHalves((hi & 65535), (lo & 65535));
};
RgU32.sub = function(a, b) {
  return RgU32.addU(a, RgU32.addU(RgU32.bnot(b), 1));
};
RgU32.toUnsignedD = function(v) {
  if ( v >= 0 ) {
    return v;
  }
  return v + RgU32.twoPow32D();
};
RgU32.fromUnsignedD = function(d) {
  const two32 = RgU32.twoPow32D();
  let x = d;
  let hiD = 0.0;
  let loD = 0.0;
  if ( x < 0.0 ) {
    x = x + two32;
  }
  if ( x >= two32 ) {
    x = x - two32 * RgNum.floorD((x / two32));
  }
  hiD = RgNum.floorD((x / 65536.0));
  loD = x - hiD * 65536.0;
  return RgU32.fromHalves(Math.floor( hiD), Math.floor( loD));
};
RgU32.clz = function(v) {
  const p = RgU32.wrap32(v);
  if ( p == 0 ) {
    return 32;
  }
  if ( p < 0 ) {
    return 0;
  }
  let n = 0;
  let probe = 1073741824;
  while (n < 31) {
    if ( (p & probe) != 0 ) {
      return n + 1;
    }
    probe = (probe >> 1);
    n = n + 1;
  };
  return 31;
};
RgU32.popcount = function(v) {
  const lo = RgU32.loHalf(v);
  const hi = RgU32.hiHalf(v);
  let n = 0;
  let i = 0;
  while (i < 16) {
    if ( ((lo >> i) & 1) != 0 ) {
      n = n + 1;
    }
    if ( ((hi >> i) & 1) != 0 ) {
      n = n + 1;
    }
    i = i + 1;
  };
  return n;
};
RgU32.byteAt = function(v, i) {
  const sh = 8 * (3 - i);
  return (RgU32.shr(v, sh) & 255);
};
RgU32.fromBytesBE = function(b0, b1, b2, b3) {
  const hi = ((b0 & 255) << 8) + (b1 & 255);
  const lo = ((b2 & 255) << 8) + (b3 & 255);
  return RgU32.fromHalves(hi, lo);
};
export class RgText  {
}
RgText.kind = function() {
  if ( ("é".length) > 1 ) {
    return 1;
  }
  if ( ("😀".length) == 1 ) {
    return 2;
  }
  return 0;
};
RgText.unitsAreBytes = function() {
  return RgText.kind() == 1;
};
RgText.unitsArePoints = function() {
  return RgText.kind() == 2;
};
RgText.utf8WidthOf = function(cp) {
  if ( cp < 128 ) {
    return 1;
  }
  if ( cp < 2048 ) {
    return 2;
  }
  if ( cp < 65536 ) {
    return 3;
  }
  return 4;
};
RgText.byteSlice = function(s, i, j) {
  const n = s.length;
  let a = i;
  let b = j;
  if ( a < 0 ) {
    a = 0;
  }
  if ( b > n ) {
    b = n;
  }
  if ( b <= a ) {
    return "";
  }
  return s.substring(a, b );
};
RgText.decodeAt = function(s, i) {
  let out = [];
  const n = s.length;
  if ( i >= n ) {
    out.push(0 - 1);
    out.push(0);
    return out;
  }
  const b0 = (s.charCodeAt(i ) & 255);
  if ( b0 < 128 ) {
    out.push(b0);
    out.push(1);
    return out;
  }
  if ( b0 < 224 ) {
    let c1 = 0;
    if ( i + 1 < n ) {
      c1 = (s.charCodeAt(i + 1 ) & 63);
    }
    out.push((b0 & 31) * 64 + c1);
    out.push(2);
    return out;
  }
  if ( b0 < 240 ) {
    let d1 = 0;
    let d2 = 0;
    if ( i + 1 < n ) {
      d1 = (s.charCodeAt(i + 1 ) & 63);
    }
    if ( i + 2 < n ) {
      d2 = (s.charCodeAt(i + 2 ) & 63);
    }
    out.push(((b0 & 15) * 4096 + d1 * 64) + d2);
    out.push(3);
    return out;
  }
  let e1 = 0;
  let e2 = 0;
  let e3 = 0;
  if ( i + 1 < n ) {
    e1 = (s.charCodeAt(i + 1 ) & 63);
  }
  if ( i + 2 < n ) {
    e2 = (s.charCodeAt(i + 2 ) & 63);
  }
  if ( i + 3 < n ) {
    e3 = (s.charCodeAt(i + 3 ) & 63);
  }
  out.push((((b0 & 7) * 262144 + e1 * 4096) + e2 * 64) + e3);
  out.push(4);
  return out;
};
RgText.fromCodePoint = function(cp) {
  if ( RgText.unitsAreBytes() ) {
    return RgText.encodeUtf8(cp);
  }
  if ( RgText.unitsArePoints() ) {
    const p = String.fromCharCode(cp);
    return p;
  }
  if ( cp < 65536 ) {
    const q = String.fromCharCode(cp);
    return q;
  }
  const adj = cp - 65536;
  const hi = String.fromCharCode(55296 + (adj >> 10));
  const lo = String.fromCharCode(56320 + (adj & 1023));
  return hi + lo;
};
RgText.encodeUtf8 = function(cp) {
  const p = String.fromCharCode(cp);
  return p;
};
RgText.len = function(s) {
  const n = s.length;
  if ( RgText.unitsArePoints() ) {
    let p = 0;
    let cnt = 0;
    while (p < n) {
      if ( s.charCodeAt(p ) > 65535 ) {
        cnt = cnt + 2;
      } else {
        cnt = cnt + 1;
      }
      p = p + 1;
    };
    return cnt;
  }
  if ( false == RgText.unitsAreBytes() ) {
    return n;
  }
  let i = 0;
  let units = 0;
  while (i < n) {
    const b = (s.charCodeAt(i ) & 255);
    if ( b < 128 ) {
      units = units + 1;
      i = i + 1;
    } else {
      if ( b < 224 ) {
        units = units + 1;
        i = i + 2;
      } else {
        if ( b < 240 ) {
          units = units + 1;
          i = i + 3;
        } else {
          units = units + 2;
          i = i + 4;
        }
      }
    }
  };
  return units;
};
RgText.unitAt = function(s, u) {
  const n = s.length;
  if ( u < 0 ) {
    return 0 - 1;
  }
  if ( RgText.unitsArePoints() ) {
    let p = 0;
    let units = 0;
    while (p < n) {
      const cp = s.charCodeAt(p );
      if ( cp < 65536 ) {
        if ( units == u ) {
          return cp;
        }
        units = units + 1;
      } else {
        const adj = cp - 65536;
        if ( units == u ) {
          return 55296 + (adj >> 10);
        }
        if ( units + 1 == u ) {
          return 56320 + (adj & 1023);
        }
        units = units + 2;
      }
      p = p + 1;
    };
    return 0 - 1;
  }
  if ( false == RgText.unitsAreBytes() ) {
    if ( u >= n ) {
      return 0 - 1;
    }
    return (s.charCodeAt(u ) & 65535);
  }
  let i = 0;
  let units_1 = 0;
  while (i < n) {
    const dec = RgText.decodeAt(s, i);
    const cp_1 = dec[0];
    const w = dec[1];
    if ( w == 0 ) {
      return 0 - 1;
    }
    if ( cp_1 < 65536 ) {
      if ( units_1 == u ) {
        return cp_1;
      }
      units_1 = units_1 + 1;
    } else {
      const adj_1 = cp_1 - 65536;
      if ( units_1 == u ) {
        return 55296 + (adj_1 >> 10);
      }
      if ( units_1 + 1 == u ) {
        return 56320 + (adj_1 & 1023);
      }
      units_1 = units_1 + 2;
    }
    i = i + w;
  };
  return 0 - 1;
};
RgText.substr = function(s, a, b) {
  let lo = a;
  let hi = b;
  if ( lo < 0 ) {
    lo = 0;
  }
  if ( hi < lo ) {
    hi = lo;
  }
  const n = s.length;
  if ( RgText.unitsArePoints() ) {
    let out = "";
    let p = 0;
    let units = 0;
    while (p < n) {
      const cp = s.charCodeAt(p );
      let w = 1;
      if ( cp > 65535 ) {
        w = 2;
      }
      if ( units >= lo && units + w <= hi ) {
        out = out + s[p];
      }
      units = units + w;
      p = p + 1;
    };
    return out;
  }
  if ( false == RgText.unitsAreBytes() ) {
    if ( lo >= n ) {
      return "";
    }
    let hi2 = hi;
    if ( hi2 > n ) {
      hi2 = n;
    }
    return s.substring(lo, hi2 );
  }
  let out2 = "";
  let i = 0;
  let units2 = 0;
  while (i < n) {
    const dec = RgText.decodeAt(s, i);
    const cp_1 = dec[0];
    const w_1 = dec[1];
    if ( w_1 == 0 ) {
      i = n;
    } else {
      if ( cp_1 < 65536 ) {
        if ( units2 >= lo && units2 < hi ) {
          out2 = out2 + RgText.byteSlice(s, i, (i + w_1));
        }
        units2 = units2 + 1;
      } else {
        const adj = cp_1 - 65536;
        const takeHi = units2 >= lo && units2 < hi;
        const takeLo = units2 + 1 >= lo && units2 + 1 < hi;
        if ( takeHi && takeLo ) {
          out2 = out2 + RgText.byteSlice(s, i, (i + w_1));
        } else {
          if ( takeHi ) {
            out2 = out2 + RgText.encodeUtf8((55296 + (adj >> 10)));
          }
          if ( takeLo ) {
            out2 = out2 + RgText.encodeUtf8((56320 + (adj & 1023)));
          }
        }
        units2 = units2 + 2;
      }
      i = i + w_1;
    }
  };
  return out2;
};
RgText.utf8ByteOfUnit = function(s, u) {
  if ( u <= 0 ) {
    return 0;
  }
  const n = RgText.len(s);
  let bytes = 0;
  let i = 0;
  while (i < n) {
    if ( i >= u ) {
      return bytes;
    }
    const cp = RgText.codePointAt(s, i);
    if ( cp < 0 ) {
      return bytes;
    }
    let w = 1;
    if ( cp > 65535 ) {
      w = 2;
    }
    bytes = bytes + RgText.utf8WidthOf(cp);
    i = i + w;
  };
  return bytes;
};
RgText.unitOfUtf8Byte = function(s, byteIdx) {
  if ( byteIdx <= 0 ) {
    return 0;
  }
  const n = RgText.len(s);
  let bytes = 0;
  let units = 0;
  let i = 0;
  while (i < n) {
    if ( bytes >= byteIdx ) {
      return units;
    }
    const cp = RgText.codePointAt(s, i);
    if ( cp < 0 ) {
      return units;
    }
    let w = 1;
    if ( cp > 65535 ) {
      w = 2;
    }
    bytes = bytes + RgText.utf8WidthOf(cp);
    units = units + w;
    i = i + w;
  };
  return units;
};
RgText.codePointAt = function(s, u) {
  const first = RgText.unitAt(s, u);
  if ( first < 0 ) {
    return 0 - 1;
  }
  if ( first < 55296 ) {
    return first;
  }
  if ( first > 56319 ) {
    return first;
  }
  const second = RgText.unitAt(s, (u + 1));
  if ( second < 56320 ) {
    return first;
  }
  if ( second > 57343 ) {
    return first;
  }
  return ((first - 55296) * 1024 + (second - 56320)) + 65536;
};
RgText.toCodePoints = function(s) {
  let out = [];
  const n = RgText.len(s);
  let u = 0;
  while (u < n) {
    const cp = RgText.codePointAt(s, u);
    if ( cp < 0 ) {
      u = n;
    } else {
      out.push(cp);
      if ( cp > 65535 ) {
        u = u + 2;
      } else {
        u = u + 1;
      }
    }
  };
  return out;
};
RgText.codePointCount = function(s) {
  const cps = RgText.toCodePoints(s);
  return cps.length;
};
RgText.fromCodePoints = function(cps) {
  let out = "";
  let i = 0;
  while (i < cps.length) {
    out = out + RgText.fromCodePoint(cps[i]);
    i = i + 1;
  };
  return out;
};
RgText.toCodeUnits = function(s) {
  let out = [];
  const n = RgText.len(s);
  let u = 0;
  while (u < n) {
    out.push(RgText.unitAt(s, u));
    u = u + 1;
  };
  return out;
};
RgText.fromCodeUnits = function(units) {
  let out = "";
  let i = 0;
  const n = units.length;
  while (i < n) {
    const hi = units[i];
    let paired = false;
    if ( hi >= 55296 && hi <= 56319 ) {
      if ( i + 1 < n ) {
        const lo = units[(i + 1)];
        if ( lo >= 56320 && lo <= 57343 ) {
          const cp = ((hi - 55296) * 1024 + (lo - 56320)) + 65536;
          out = out + RgText.fromCodePoint(cp);
          i = i + 2;
          paired = true;
        }
      }
    }
    if ( false == paired ) {
      out = out + RgText.fromCodePoint(hi);
      i = i + 1;
    }
  };
  return out;
};
RgText.toUtf8Bytes = function(s) {
  let out = [];
  if ( RgText.unitsAreBytes() ) {
    const n = s.length;
    let i = 0;
    while (i < n) {
      out.push((s.charCodeAt(i ) & 255));
      i = i + 1;
    };
    return out;
  }
  const cps = RgText.toCodePoints(s);
  let k = 0;
  while (k < cps.length) {
    const cp = cps[k];
    if ( cp < 128 ) {
      out.push(cp);
    } else {
      if ( cp < 2048 ) {
        out.push((192 | (cp >> 6)));
        out.push((128 | (cp & 63)));
      } else {
        if ( cp < 65536 ) {
          out.push((224 | (cp >> 12)));
          out.push((128 | ((cp >> 6) & 63)));
          out.push((128 | (cp & 63)));
        } else {
          out.push((240 | (cp >> 18)));
          out.push((128 | ((cp >> 12) & 63)));
          out.push((128 | ((cp >> 6) & 63)));
          out.push((128 | (cp & 63)));
        }
      }
    }
    k = k + 1;
  };
  return out;
};
RgText.fromUtf8Bytes = function(bytes) {
  let cps = [];
  const n = bytes.length;
  let i = 0;
  while (i < n) {
    const b0 = (bytes[i] & 255);
    if ( b0 < 128 ) {
      cps.push(b0);
      i = i + 1;
    } else {
      if ( b0 < 224 ) {
        let c1 = 0;
        if ( i + 1 < n ) {
          c1 = (bytes[(i + 1)] & 63);
        }
        cps.push((b0 & 31) * 64 + c1);
        i = i + 2;
      } else {
        if ( b0 < 240 ) {
          let d1 = 0;
          let d2 = 0;
          if ( i + 1 < n ) {
            d1 = (bytes[(i + 1)] & 63);
          }
          if ( i + 2 < n ) {
            d2 = (bytes[(i + 2)] & 63);
          }
          cps.push(((b0 & 15) * 4096 + d1 * 64) + d2);
          i = i + 3;
        } else {
          let e1 = 0;
          let e2 = 0;
          let e3 = 0;
          if ( i + 1 < n ) {
            e1 = (bytes[(i + 1)] & 63);
          }
          if ( i + 2 < n ) {
            e2 = (bytes[(i + 2)] & 63);
          }
          if ( i + 3 < n ) {
            e3 = (bytes[(i + 3)] & 63);
          }
          cps.push((((b0 & 7) * 262144 + e1 * 4096) + e2 * 64) + e3);
          i = i + 4;
        }
      }
    }
  };
  return RgText.fromCodePoints(cps);
};
export class RdWriter  {
  constructor() {
    this.buf = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(256));
    this.__len = 0;
  }
  ensure (extra) {
    const need = this.__len + extra;
    const cap = this.buf.byteLength;
    if ( need <= cap ) {
      return;
    }
    let ncap = cap * 2;
    while (ncap < need) {
      ncap = ncap * 2;
    };
    let nb = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(ncap));
    if ( this.__len > 0 ) {
      (function(
        d,
        dOff,
        s,
        sOff,
        len
      ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(nb,0,this.buf,0,this.__len);
    }
    this.buf = nb;
  };
  byte (b) {
    this.ensure(1);
    this.buf._view.setUint8(this.__len, b);
    this.__len = this.__len + 1;
  };
  bytes (src, off, n) {
    if ( n <= 0 ) {
      return;
    }
    this.ensure(n);
    (function(
      d,
      dOff,
      s,
      sOff,
      len
    ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(this.buf,this.__len,src,off,n);
    this.__len = this.__len + n;
  };
  all (src) {
    this.bytes(src, 0, src.byteLength);
  };
  varint (value) {
    let v = value;
    while (v >= 128) {
      this.byte(v % 128 + 128);
      v = ((v / 128) | 0);
    };
    this.byte(v);
  };
  zigzag (v) {
    if ( v < 0 ) {
      this.varint((0 - v) * 2 - 1);
    } else {
      this.varint(v * 2);
    }
  };
  u32 (v) {
    this.byte(RgU32.byteAt(v, 0));
    this.byte(RgU32.byteAt(v, 1));
    this.byte(RgU32.byteAt(v, 2));
    this.byte(RgU32.byteAt(v, 3));
  };
  u32le (v) {
    this.byte(RgU32.byteAt(v, 3));
    this.byte(RgU32.byteAt(v, 2));
    this.byte(RgU32.byteAt(v, 1));
    this.byte(RgU32.byteAt(v, 0));
  };
  u16le (v) {
    this.byte((v & 255));
    this.byte(((v >> 8) & 255));
  };
  text (s) {
    const b = RdBytes.fromText(s);
    this.varint(b.byteLength);
    this.all(b);
  };
  toBuffer () {
    return (function(
      b,
      s,
      e
    ){ var slice = b.slice(s,e); return Object.assign(slice, { _view: new DataView(slice) }); })(this.buf,0,this.__len);
  };
}
export class RdReader  {
  constructor(b) {
    this.data = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    this.pos = 0;
    this.__len = 0;
    this.failed = false;
    this.data = b;
    this.__len = b.byteLength;
  }
  eof () {
    return this.pos >= this.__len;
  };
  byte () {
    if ( this.pos >= this.__len ) {
      this.failed = true;
      return 0;
    }
    const v = this.data._view.getUint8(this.pos);
    this.pos = this.pos + 1;
    return v;
  };
  varint () {
    let result = 0;
    let mul = 1;
    let guard = 0;
    while (true) {
      const b = this.byte();
      result = result + (b % 128) * mul;
      if ( b < 128 ) {
        break;
      }
      mul = mul * 128;
      guard = guard + 1;
      if ( guard > 4 ) {
        this.failed = true;
        break;
      }
    };
    return result;
  };
  zigzag () {
    const v = this.varint();
    if ( v % 2 == 1 ) {
      return 0 - (((v + 1) / 2) | 0);
    }
    return ((v / 2) | 0);
  };
  u32 () {
    const b0 = this.byte();
    const b1 = this.byte();
    const b2 = this.byte();
    const b3 = this.byte();
    return RgU32.fromBytesBE(b0, b1, b2, b3);
  };
  bytes (n) {
    if ( n < 0 || this.pos + n > this.__len ) {
      this.failed = true;
      return (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    }
    const out = (function(
      b,
      s,
      e
    ){ var slice = b.slice(s,e); return Object.assign(slice, { _view: new DataView(slice) }); })(this.data,this.pos,this.pos + n);
    this.pos = this.pos + n;
    return out;
  };
  text () {
    const n = this.varint();
    const b = this.bytes(n);
    return RdBytes.toText(b);
  };
}
export class RdBytes  {
}
RdBytes.adler32 = function(b) {
  return RdBytes.adler32Range(b, 0, b.byteLength);
};
RdBytes.adler32Range = function(b, start, end) {
  let a = 1;
  let s = 0;
  let i = start;
  while (i < end) {
    let stop = i + 5552;
    if ( stop > end ) {
      stop = end;
    }
    while (i < stop) {
      a = a + b._view.getUint8(i);
      s = s + a;
      i = i + 1;
    };
    a = a % 65521;
    s = s % 65521;
  };
  return RgU32.fromHalves(s, a);
};
RdBytes.equal = function(a, b) {
  const n = a.byteLength;
  if ( n != b.byteLength ) {
    return false;
  }
  let i = 0;
  while (i < n) {
    if ( a._view.getUint8(i) != b._view.getUint8(i) ) {
      return false;
    }
    i = i + 1;
  };
  return true;
};
RdBytes.concat = function(a, b) {
  const na = a.byteLength;
  const nb = b.byteLength;
  let out = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(na + nb));
  if ( na > 0 ) {
    (function(
      d,
      dOff,
      s,
      sOff,
      len
    ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(out,0,a,0,na);
  }
  if ( nb > 0 ) {
    (function(
      d,
      dOff,
      s,
      sOff,
      len
    ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(out,na,b,0,nb);
  }
  return out;
};
RdBytes.fromText = function(s) {
  const cps = RgText.toCodePoints(s);
  const w = new RdWriter();
  // Loop start
  for ( const cp of cps) {
    if ( cp < 128 ) {
      w.byte(cp);
    } else {
      if ( cp < 2048 ) {
        w.byte(192 + ((cp / 64) | 0));
        w.byte(128 + cp % 64);
      } else {
        if ( cp < 65536 ) {
          w.byte(224 + ((cp / 4096) | 0));
          w.byte(128 + ((cp / 64) | 0) % 64);
          w.byte(128 + cp % 64);
        } else {
          w.byte(240 + ((cp / 262144) | 0));
          w.byte(128 + ((cp / 4096) | 0) % 64);
          w.byte(128 + ((cp / 64) | 0) % 64);
          w.byte(128 + cp % 64);
        }
      }
    }
  }
  return w.toBuffer();
};
RdBytes.toText = function(b) {
  const n = b.byteLength;
  let cps = [];
  let i = 0;
  while (i < n) {
    const c = b._view.getUint8(i);
    let need = 0;
    let cp = c;
    if ( c >= 240 ) {
      need = 3;
      cp = c - 240;
    } else {
      if ( c >= 224 ) {
        need = 2;
        cp = c - 224;
      } else {
        if ( c >= 192 ) {
          need = 1;
          cp = c - 192;
        } else {
          if ( c >= 128 ) {
            cp = 65533;
          }
        }
      }
    }
    i = i + 1;
    let k = 0;
    while (k < need) {
      if ( i >= n ) {
        cp = 65533;
        break;
      }
      const d = b._view.getUint8(i);
      if ( d < 128 || d >= 192 ) {
        cp = 65533;
        break;
      }
      cp = cp * 64 + (d - 128);
      i = i + 1;
      k = k + 1;
    };
    cps.push(cp);
  };
  return RgText.fromCodePoints(cps);
};
RdBytes.hex = function(b) {
  const digits = "0123456789abcdef";
  let out = "";
  const n = b.byteLength;
  let i = 0;
  while (i < n) {
    const v = b._view.getUint8(i);
    out = out + digits.substring(((v / 16) | 0), ((v / 16) | 0) + 1 );
    out = out + digits.substring(v % 16, v % 16 + 1 );
    i = i + 1;
  };
  return out;
};
export class RdSha256  {
}
RdSha256.k = function() {
  const hex = ["428a2f98", "71374491", "b5c0fbcf", "e9b5dba5", "3956c25b", "59f111f1", "923f82a4", "ab1c5ed5", "d807aa98", "12835b01", "243185be", "550c7dc3", "72be5d74", "80deb1fe", "9bdc06a7", "c19bf174", "e49b69c1", "efbe4786", "0fc19dc6", "240ca1cc", "2de92c6f", "4a7484aa", "5cb0a9dc", "76f988da", "983e5152", "a831c66d", "b00327c8", "bf597fc7", "c6e00bf3", "d5a79147", "06ca6351", "14292967", "27b70a85", "2e1b2138", "4d2c6dfc", "53380d13", "650a7354", "766a0abb", "81c2c92e", "92722c85", "a2bfe8a1", "a81a664b", "c24b8b70", "c76c51a3", "d192e819", "d6990624", "f40e3585", "106aa070", "19a4c116", "1e376c08", "2748774c", "34b0bcb5", "391c0cb3", "4ed8aa4a", "5b9cca4f", "682e6ff3", "748f82ee", "78a5636f", "84c87814", "8cc70208", "90befffa", "a4506ceb", "bef9a3f7", "c67178f2"];
  let out = [];
  // Loop start
  for ( const h of hex) {
    out.push(RdSha256.parse(h));
  }
  return out;
};
RdSha256.parse = function(h) {
  const hi = RdSha256.parse16(h.substring(0, 4 ));
  const lo = RdSha256.parse16(h.substring(4, 8 ));
  return RgU32.fromHalves(hi, lo);
};
RdSha256.parse16 = function(h) {
  const digits = "0123456789abcdef";
  let v = 0;
  let i = 0;
  while (i < 4) {
    v = v * 16 + digits.indexOf(h.substring(i, i + 1 ));
    i = i + 1;
  };
  return v;
};
RdSha256.hex32 = function(v) {
  const digits = "0123456789abcdef";
  let out = "";
  let i = 0;
  while (i < 4) {
    const b = RgU32.byteAt(v, i);
    out = out + digits.substring(((b / 16) | 0), ((b / 16) | 0) + 1 );
    out = out + digits.substring(b % 16, b % 16 + 1 );
    i = i + 1;
  };
  return out;
};
RdSha256.hash = function(data) {
  const K = RdSha256.k();
  let H = [RdSha256.parse("6a09e667"), RdSha256.parse("bb67ae85"), RdSha256.parse("3c6ef372"), RdSha256.parse("a54ff53a"), RdSha256.parse("510e527f"), RdSha256.parse("9b05688c"), RdSha256.parse("1f83d9ab"), RdSha256.parse("5be0cd19")];
  const n = data.byteLength;
  const total = (((n + 72) / 64) | 0) * 64;
  let msg = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(total));
  if ( n > 0 ) {
    (function(
      d,
      dOff,
      s,
      sOff,
      len
    ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(msg,0,data,0,n);
  }
  msg._view.setUint8(n, 128);
  const bits = n * 8;
  let j = 0;
  while (j < 4) {
    msg._view.setUint8((total - 4) + j, RgU32.byteAt(bits, j));
    j = j + 1;
  };
  let W = new Int32Array(64);
  let off = 0;
  while (off < total) {
    let t = 0;
    while (t < 16) {
      const p = off + t * 4;
      W[t] = RgU32.fromBytesBE(
        msg._view.getUint8(p),
        msg._view.getUint8(p + 1),
        msg._view.getUint8(p + 2),
        msg._view.getUint8(p + 3)
      );
      t = t + 1;
    };
    while (t < 64) {
      const w15 = W[(t - 15)];
      const w2 = W[(t - 2)];
      const s0 = ((RgU32.rotr(w15, 7) ^ RgU32.rotr(w15, 18)) ^ RgU32.shr(w15, 3));
      const s1 = ((RgU32.rotr(w2, 17) ^ RgU32.rotr(w2, 19)) ^ RgU32.shr(w2, 10));
      const sum1 = RgU32.addU(W[(t - 16)], s0);
      const sum2 = RgU32.addU(W[(t - 7)], s1);
      W[t] = RgU32.addU(sum1, sum2);
      t = t + 1;
    };
    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];
    let i = 0;
    while (i < 64) {
      const S1 = ((RgU32.rotr(e, 6) ^ RgU32.rotr(e, 11)) ^ RgU32.rotr(e, 25));
      const ch = ((e & f) ^ (RgU32.bnot(e) & g));
      const t1a = RgU32.addU(h, S1);
      const t1b = RgU32.addU(ch, K[i]);
      const t1 = RgU32.addU(RgU32.addU(t1a, t1b), W[i]);
      const S0 = ((RgU32.rotr(a, 2) ^ RgU32.rotr(a, 13)) ^ RgU32.rotr(a, 22));
      const maj = (((a & b) ^ (a & c)) ^ (b & c));
      const t2 = RgU32.addU(S0, maj);
      h = g;
      g = f;
      f = e;
      e = RgU32.addU(d, t1);
      d = c;
      c = b;
      b = a;
      a = RgU32.addU(t1, t2);
      i = i + 1;
    };
    H[0] = RgU32.addU(H[0], a);
    H[1] = RgU32.addU(H[1], b);
    H[2] = RgU32.addU(H[2], c);
    H[3] = RgU32.addU(H[3], d);
    H[4] = RgU32.addU(H[4], e);
    H[5] = RgU32.addU(H[5], f);
    H[6] = RgU32.addU(H[6], g);
    H[7] = RgU32.addU(H[7], h);
    off = off + 64;
  };
  let out = "";
  // Loop start
  for ( const v of H) {
    out = out + RdSha256.hex32(v);
  }
  return out;
};
RdSha256.text = function(s) {
  return RdSha256.hash(RdBytes.fromText(s));
};
export class ZipBuffer  {
  constructor() {
    this.data = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    this.pos = 0;
    this.length = 0;
  }
  initWithBuffer (buf) {
    this.data = buf;
    this.length = buf.byteLength;
    this.pos = 0;
  };
  initWithSize (size) {
    this.data = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(size));
    this.length = size;
    this.pos = 0;
  };
  getPosition () {
    return this.pos;
  };
  setPosition (newPos) {
    this.pos = newPos;
  };
  seek (offset) {
    this.pos = offset;
  };
  skip (count) {
    this.pos = this.pos + count;
  };
  remaining () {
    return this.length - this.pos;
  };
  isEOF () {
    return this.pos >= this.length;
  };
  readUint8 () {
    if ( this.pos >= this.length ) {
      return 0;
    }
    const value = this.data._view.getUint8(this.pos);
    this.pos = this.pos + 1;
    return value;
  };
  readUint16LE () {
    const b0 = this.readUint8();
    const b1 = this.readUint8();
    return b0 + b1 * 256;
  };
  readUint32LE () {
    const b0 = this.readUint8();
    const b1 = this.readUint8();
    const b2 = this.readUint8();
    const b3 = this.readUint8();
    return ((b0 + b1 * 256) + b2 * 65536) + b3 * 16777216;
  };
  readBytes (count) {
    let result = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(count));
    let i = 0;
    while (i < count) {
      if ( this.pos < this.length ) {
        const b = this.data._view.getUint8(this.pos);
        result._view.setUint8(i, b);
        this.pos = this.pos + 1;
      }
      i = i + 1;
    };
    return result;
  };
  readString (count) {
    let result = "";
    let i = 0;
    while (i < count) {
      if ( this.pos < this.length ) {
        const ch = this.data._view.getUint8(this.pos);
        result = result + String.fromCharCode(ch);
        this.pos = this.pos + 1;
      }
      i = i + 1;
    };
    return result;
  };
  peekUint8 () {
    if ( this.pos >= this.length ) {
      return 0;
    }
    return this.data._view.getUint8(this.pos);
  };
  peekUint32LE () {
    const savedPos = this.pos;
    const value = this.readUint32LE();
    this.pos = savedPos;
    return value;
  };
  writeUint8 (value) {
    if ( this.pos < this.length ) {
      this.data._view.setUint8(this.pos, value);
      this.pos = this.pos + 1;
    }
  };
  writeUint16LE (value) {
    const b0 = (value & 255);
    const b1 = ((value >>> 8) & 255);
    this.writeUint8(b0);
    this.writeUint8(b1);
  };
  writeUint32LE (value) {
    const b0 = (value & 255);
    const b1 = ((value >>> 8) & 255);
    const b2 = ((value >>> 16) & 255);
    const b3 = ((value >>> 24) & 255);
    this.writeUint8(b0);
    this.writeUint8(b1);
    this.writeUint8(b2);
    this.writeUint8(b3);
  };
  writeBytes (src, srcOffset, count) {
    let i = 0;
    while (i < count) {
      const b = src._view.getUint8(srcOffset + i);
      this.writeUint8(b);
      i = i + 1;
    };
  };
  writeBuffer (src) {
    const __len = src.byteLength;
    this.writeBytes(src, 0, __len);
  };
  writeString (s) {
    const __len = s.length;
    let i = 0;
    while (i < __len) {
      const ch = s.charCodeAt(i );
      this.writeUint8(ch);
      i = i + 1;
    };
  };
  getBuffer () {
    return this.data;
  };
  getLength () {
    return this.length;
  };
  findSignatureBackward (sig, startPos) {
    let searchPos = startPos;
    while (searchPos >= 0) {
      const savedPos = this.pos;
      this.pos = searchPos;
      const value = this.readUint32LE();
      this.pos = savedPos;
      if ( value == sig ) {
        return searchPos;
      }
      searchPos = searchPos - 1;
    };
    return -1;
  };
}
export class GrowableZipBuffer  {
  constructor() {
    this.chunks = [];
    this.chunkLens = [];
    this.chunkSize = 65536;
    this.currentChunk = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    this.currentPos = 0;
    this.totalSize = 0;
    this.currentPos = 0;
    this.totalSize = 0;
    const initSize = this.chunkSize;
    this.currentChunk = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(initSize));
  }
  setChunkSize (size) {
    if ( size < 1 ) {
      return;
    }
    if ( this.totalSize > 0 ) {
      return;
    }
    this.chunkSize = size;
    this.currentChunk = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(size));
    this.currentPos = 0;
  };
  allocateNewChunk () {
    this.chunks.push(this.currentChunk);
    this.chunkLens.push(this.currentPos);
    const size = this.chunkSize;
    this.currentChunk = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(size));
    this.currentPos = 0;
  };
  writeUint8 (value) {
    if ( this.currentPos >= this.chunkSize ) {
      this.allocateNewChunk();
    }
    this.currentChunk._view.setUint8(this.currentPos, value);
    this.currentPos = this.currentPos + 1;
    this.totalSize = this.totalSize + 1;
  };
  writeUint16LE (value) {
    const b0 = value % 256;
    const b1D = value / 256.0;
    const b1 = Math.floor( b1D) % 256;
    this.writeUint8(b0);
    this.writeUint8(b1);
  };
  writeUint32LE (value) {
    const b0 = value % 256;
    const rem1D = value / 256.0;
    const rem1 = Math.floor( rem1D);
    const b1 = rem1 % 256;
    const rem2D = rem1 / 256.0;
    const rem2 = Math.floor( rem2D);
    const b2 = rem2 % 256;
    const rem3D = rem2 / 256.0;
    const b3 = Math.floor( rem3D);
    this.writeUint8(b0);
    this.writeUint8(b1);
    this.writeUint8(b2);
    this.writeUint8(b3);
  };
  writeBytes (src, srcOffset, count) {
    let left = count;
    let at = srcOffset;
    while (left > 0) {
      if ( this.currentPos >= this.chunkSize ) {
        this.allocateNewChunk();
      }
      const room = this.chunkSize - this.currentPos;
      let take = left;
      if ( take > room ) {
        take = room;
      }
      (function(
        d,
        dOff,
        s,
        sOff,
        len
      ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(this.currentChunk,this.currentPos,src,at,take);
      this.currentPos = this.currentPos + take;
      this.totalSize = this.totalSize + take;
      at = at + take;
      left = left - take;
    };
  };
  writeBuffer (src) {
    const __len = src.byteLength;
    this.writeBytes(src, 0, __len);
  };
  writeString (s) {
    const __len = s.length;
    let i = 0;
    while (i < __len) {
      const ch = s.charCodeAt(i );
      this.writeUint8(ch);
      i = i + 1;
    };
  };
  getSize () {
    return this.totalSize;
  };
  toBuffer () {
    const size = this.totalSize;
    let result = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(size));
    let destPos = 0;
    const numChunks = this.chunks.length;
    let i = 0;
    while (i < numChunks) {
      const chunk = this.chunks[i];
      const used = this.chunkLens[i];
      if ( used > 0 ) {
        (function(
          d,
          dOff,
          s,
          sOff,
          len
        ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(result,destPos,chunk,0,used);
        destPos = destPos + used;
      }
      i = i + 1;
    };
    const curPos = this.currentPos;
    if ( curPos > 0 ) {
      const curChunk = this.currentChunk;
      (function(
        d,
        dOff,
        s,
        sOff,
        len
      ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(result,destPos,curChunk,0,curPos);
      destPos = destPos + curPos;
    }
    return result;
  };
}
export class InflateHuffmanTable  {
  constructor() {
    this.counts = [];
    this.symbols = [];
    this.maxBits = 0;
    let i = 0;
    while (i < 16) {
      this.counts.push(0);
      i = i + 1;
    };
  }
  build (lengths, numSymbols) {
    let i = 0;
    while (i < 16) {
      this.counts[i] = 0;
      i = i + 1;
    };
    i = 0;
    while (i < numSymbols) {
      const __len = lengths[i];
      if ( __len > 0 ) {
        const cnt = this.counts[__len];
        this.counts[__len] = cnt + 1;
        if ( __len > this.maxBits ) {
          this.maxBits = __len;
        }
      }
      i = i + 1;
    };
    let offsets = [];
    let offset = 0;
    i = 0;
    while (i < 16) {
      offsets.push(offset);
      const cnt_1 = this.counts[i];
      offset = offset + cnt_1;
      i = i + 1;
    };
    i = 0;
    while (i < numSymbols) {
      this.symbols.push(0);
      i = i + 1;
    };
    i = 0;
    while (i < numSymbols) {
      const len_1 = lengths[i];
      if ( len_1 > 0 ) {
        const off = offsets[len_1];
        this.symbols[off] = i;
        offsets[len_1] = off + 1;
      }
      i = i + 1;
    };
  };
  decode (reader) {
    let code = 0;
    let first = 0;
    let index = 0;
    let __len = 1;
    while (__len <= this.maxBits) {
      const bit = reader.readBit();
      code = code * 2 + bit;
      const count = this.counts[__len];
      if ( code - first < count ) {
        return this.symbols[((index + code) - first)];
      }
      index = index + count;
      first = (first + count) * 2;
      __len = __len + 1;
    };
    return -1;
  };
}
export class InflateBitReader  {
  constructor() {
    this.data = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    this.bytePos = 0;
    this.bitPos = 0;
    this.currentByte = 0;
    this.dataLength = 0;
  }
  init (buf, offset, length) {
    this.data = buf;
    this.bytePos = offset;
    this.dataLength = offset + length;
    this.bitPos = 0;
    this.currentByte = 0;
  };
  readBit () {
    if ( this.bitPos == 0 ) {
      if ( this.bytePos >= this.dataLength ) {
        return 0;
      }
      this.currentByte = this.data._view.getUint8(this.bytePos);
      this.bytePos = this.bytePos + 1;
      this.bitPos = 8;
    }
    const bit = (this.currentByte & 1);
    this.currentByte = (this.currentByte >> 1);
    this.bitPos = this.bitPos - 1;
    return bit;
  };
  readBits (count) {
    let result = 0;
    let multiplier = 1;
    let i = 0;
    while (i < count) {
      const bit = this.readBit();
      result = result + bit * multiplier;
      multiplier = multiplier * 2;
      i = i + 1;
    };
    return result;
  };
  alignToByte () {
    this.bitPos = 0;
  };
  readByte () {
    this.alignToByte();
    if ( this.bytePos >= this.dataLength ) {
      return 0;
    }
    const b = this.data._view.getUint8(this.bytePos);
    this.bytePos = this.bytePos + 1;
    return b;
  };
  readUint16LE () {
    const b0 = this.readByte();
    const b1 = this.readByte();
    return b0 + b1 * 256;
  };
  getBytePosition () {
    return this.bytePos;
  };
  isEOF () {
    return this.bytePos >= this.dataLength && this.bitPos == 0;
  };
}
export class Inflate  {
  constructor() {
    this.input = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    this.reader = new InflateBitReader();
    this.outBuf = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    this.outLen = 0;
    this.outCap = 0;
    this.fixedLitLen = new InflateHuffmanTable();
    this.fixedDist = new InflateHuffmanTable();
    this.fixedTablesBuilt = false;
    this.lengthBase = [];
    this.lengthExtra = [];
    this.distBase = [];
    this.distExtra = [];
    this.buildLengthDistTables();
  }
  resetOutput (hint) {
    let cap = hint;
    if ( cap < 4096 ) {
      cap = 4096;
    }
    this.outBuf = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(cap));
    this.outCap = cap;
    this.outLen = 0;
  };
  ensureCapacity (extra) {
    const need = this.outLen + extra;
    if ( need <= this.outCap ) {
      return;
    }
    let newCap = this.outCap * 2;
    if ( newCap < need ) {
      newCap = need;
    }
    let grown = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(newCap));
    (function(
      d,
      dOff,
      s,
      sOff,
      len
    ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(grown,0,this.outBuf,0,this.outLen);
    this.outBuf = grown;
    this.outCap = newCap;
  };
  pushByte (b) {
    this.ensureCapacity(1);
    this.outBuf._view.setUint8(this.outLen, b);
    this.outLen = this.outLen + 1;
  };
  finalOutput () {
    const size = this.outLen;
    let result = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(size));
    (function(
      d,
      dOff,
      s,
      sOff,
      len
    ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(result,0,this.outBuf,0,size);
    return result;
  };
  buildLengthDistTables () {
    let bases = [];
    bases.push(3);
    bases.push(4);
    bases.push(5);
    bases.push(6);
    bases.push(7);
    bases.push(8);
    bases.push(9);
    bases.push(10);
    bases.push(11);
    bases.push(13);
    bases.push(15);
    bases.push(17);
    bases.push(19);
    bases.push(23);
    bases.push(27);
    bases.push(31);
    bases.push(35);
    bases.push(43);
    bases.push(51);
    bases.push(59);
    bases.push(67);
    bases.push(83);
    bases.push(99);
    bases.push(115);
    bases.push(131);
    bases.push(163);
    bases.push(195);
    bases.push(227);
    bases.push(258);
    this.lengthBase = bases;
    let extras = [];
    extras.push(0);
    extras.push(0);
    extras.push(0);
    extras.push(0);
    extras.push(0);
    extras.push(0);
    extras.push(0);
    extras.push(0);
    extras.push(1);
    extras.push(1);
    extras.push(1);
    extras.push(1);
    extras.push(2);
    extras.push(2);
    extras.push(2);
    extras.push(2);
    extras.push(3);
    extras.push(3);
    extras.push(3);
    extras.push(3);
    extras.push(4);
    extras.push(4);
    extras.push(4);
    extras.push(4);
    extras.push(5);
    extras.push(5);
    extras.push(5);
    extras.push(5);
    extras.push(0);
    this.lengthExtra = extras;
    let dBases = [];
    dBases.push(1);
    dBases.push(2);
    dBases.push(3);
    dBases.push(4);
    dBases.push(5);
    dBases.push(7);
    dBases.push(9);
    dBases.push(13);
    dBases.push(17);
    dBases.push(25);
    dBases.push(33);
    dBases.push(49);
    dBases.push(65);
    dBases.push(97);
    dBases.push(129);
    dBases.push(193);
    dBases.push(257);
    dBases.push(385);
    dBases.push(513);
    dBases.push(769);
    dBases.push(1025);
    dBases.push(1537);
    dBases.push(2049);
    dBases.push(3073);
    dBases.push(4097);
    dBases.push(6145);
    dBases.push(8193);
    dBases.push(12289);
    dBases.push(16385);
    dBases.push(24577);
    this.distBase = dBases;
    let dExtras = [];
    dExtras.push(0);
    dExtras.push(0);
    dExtras.push(0);
    dExtras.push(0);
    dExtras.push(1);
    dExtras.push(1);
    dExtras.push(2);
    dExtras.push(2);
    dExtras.push(3);
    dExtras.push(3);
    dExtras.push(4);
    dExtras.push(4);
    dExtras.push(5);
    dExtras.push(5);
    dExtras.push(6);
    dExtras.push(6);
    dExtras.push(7);
    dExtras.push(7);
    dExtras.push(8);
    dExtras.push(8);
    dExtras.push(9);
    dExtras.push(9);
    dExtras.push(10);
    dExtras.push(10);
    dExtras.push(11);
    dExtras.push(11);
    dExtras.push(12);
    dExtras.push(12);
    dExtras.push(13);
    dExtras.push(13);
    this.distExtra = dExtras;
  };
  buildFixedTables () {
    if ( this.fixedTablesBuilt ) {
      return;
    }
    let lengths = [];
    let i = 0;
    while (i < 144) {
      lengths.push(8);
      i = i + 1;
    };
    while (i < 256) {
      lengths.push(9);
      i = i + 1;
    };
    while (i < 280) {
      lengths.push(7);
      i = i + 1;
    };
    while (i < 288) {
      lengths.push(8);
      i = i + 1;
    };
    this.fixedLitLen.build(lengths, 288);
    let distLengths = [];
    i = 0;
    while (i < 32) {
      distLengths.push(5);
      i = i + 1;
    };
    this.fixedDist.build(distLengths, 32);
    this.fixedTablesBuilt = true;
  };
  decompress (data) {
    return this.decompressFrom(data, 0);
  };
  decompressFrom (data, offset) {
    this.input = data;
    const dataLen = data.byteLength;
    let from = offset;
    if ( from < 0 ) {
      from = 0;
    }
    if ( from > dataLen ) {
      from = dataLen;
    }
    const rest = dataLen - from;
    this.resetOutput(rest * 4);
    this.reader.init(data, from, rest);
    this.buildFixedTables();
    let finalBlock = false;
    while (false == finalBlock) {
      const bfinal = this.reader.readBit();
      const btype = this.reader.readBits(2);
      finalBlock = bfinal == 1;
      if ( btype == 0 ) {
        this.decompressStored();
      }
      if ( btype == 1 ) {
        this.decompressHuffman(this.fixedLitLen, this.fixedDist);
      }
      if ( btype == 2 ) {
        this.decompressDynamic();
      }
    };
    return this.finalOutput();
  };
  inputPos () {
    return this.reader.getBytePosition();
  };
  decompressStored () {
    this.reader.alignToByte();
    const __len = this.reader.readUint16LE();
    const nlen = this.reader.readUint16LE();
    if ( __len + nlen != 65535 ) {
    }
    this.ensureCapacity(__len);
    let i = 0;
    while (i < __len) {
      const b = this.reader.readByte();
      this.pushByte(b);
      i = i + 1;
    };
  };
  decompressHuffman (litLenTable, distTable) {
    let done = false;
    while (false == done) {
      const sym = litLenTable.decode(this.reader);
      if ( sym < 256 ) {
        this.pushByte(sym);
      }
      if ( sym == 256 ) {
        done = true;
      }
      if ( sym > 256 ) {
        const lengthCode = sym - 257;
        let length = this.lengthBase[lengthCode];
        const extraBits = this.lengthExtra[lengthCode];
        if ( extraBits > 0 ) {
          length = length + this.reader.readBits(extraBits);
        }
        const distCode = distTable.decode(this.reader);
        let dist = this.distBase[distCode];
        const distExtraBits = this.distExtra[distCode];
        if ( distExtraBits > 0 ) {
          dist = dist + this.reader.readBits(distExtraBits);
        }
        this.copyFromOutput(dist, length);
      }
    };
  };
  decompressDynamic () {
    const hlit = this.reader.readBits(5) + 257;
    const hdist = this.reader.readBits(5) + 1;
    const hclen = this.reader.readBits(4) + 4;
    let clOrder = [];
    clOrder.push(16);
    clOrder.push(17);
    clOrder.push(18);
    clOrder.push(0);
    clOrder.push(8);
    clOrder.push(7);
    clOrder.push(9);
    clOrder.push(6);
    clOrder.push(10);
    clOrder.push(5);
    clOrder.push(11);
    clOrder.push(4);
    clOrder.push(12);
    clOrder.push(3);
    clOrder.push(13);
    clOrder.push(2);
    clOrder.push(14);
    clOrder.push(1);
    clOrder.push(15);
    let clLengths = [];
    let i = 0;
    while (i < 19) {
      clLengths.push(0);
      i = i + 1;
    };
    i = 0;
    while (i < hclen) {
      const idx = clOrder[i];
      const __len = this.reader.readBits(3);
      clLengths[idx] = __len;
      i = i + 1;
    };
    const clTable = new InflateHuffmanTable();
    clTable.build(clLengths, 19);
    let allLengths = [];
    const totalCodes = hlit + hdist;
    i = 0;
    while (i < totalCodes) {
      const sym = clTable.decode(this.reader);
      if ( sym < 16 ) {
        allLengths.push(sym);
        i = i + 1;
      }
      if ( sym == 16 ) {
        const repeat = this.reader.readBits(2) + 3;
        let prevLen = 0;
        const arrLen = allLengths.length;
        if ( arrLen > 0 ) {
          prevLen = allLengths[(arrLen - 1)];
        }
        let j = 0;
        while (j < repeat) {
          allLengths.push(prevLen);
          j = j + 1;
        };
        i = i + repeat;
      }
      if ( sym == 17 ) {
        const repeat_1 = this.reader.readBits(3) + 3;
        let j_1 = 0;
        while (j_1 < repeat_1) {
          allLengths.push(0);
          j_1 = j_1 + 1;
        };
        i = i + repeat_1;
      }
      if ( sym == 18 ) {
        const repeat_2 = this.reader.readBits(7) + 11;
        let j_2 = 0;
        while (j_2 < repeat_2) {
          allLengths.push(0);
          j_2 = j_2 + 1;
        };
        i = i + repeat_2;
      }
    };
    let litLenLengths = [];
    let distLengths = [];
    i = 0;
    while (i < hlit) {
      litLenLengths.push(allLengths[i]);
      i = i + 1;
    };
    while (i < totalCodes) {
      distLengths.push(allLengths[i]);
      i = i + 1;
    };
    const dynLitLen = new InflateHuffmanTable();
    dynLitLen.build(litLenLengths, hlit);
    const dynDist = new InflateHuffmanTable();
    dynDist.build(distLengths, hdist);
    this.decompressHuffman(dynLitLen, dynDist);
  };
  copyFromOutput (distance, length) {
    const srcPos = this.outLen - distance;
    this.ensureCapacity(length);
    let i = 0;
    while (i < length) {
      let b = 0;
      const readPos = srcPos + i;
      if ( readPos >= 0 ) {
        if ( readPos < this.outLen ) {
          b = this.outBuf._view.getUint8(readPos);
        }
      }
      this.outBuf._view.setUint8(this.outLen, b);
      this.outLen = this.outLen + 1;
      i = i + 1;
    };
  };
}
export class RdZipEntry  {
  constructor() {
    this.name = "";
    this.method = 0;
    this.crc = 0;
    this.csize = 0;
    this.usize = 0;
    this.raw = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    this.hasContent = false;
    this.contentBuf = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
  }
  content () {
    if ( this.hasContent ) {
      return this.contentBuf;
    }
    if ( this.method == 8 ) {
      const inf = new Inflate();
      this.contentBuf = inf.decompress(this.raw);
    } else {
      this.contentBuf = this.raw;
    }
    this.hasContent = true;
    return this.contentBuf;
  };
}
RdZipEntry.stored = function(name, data) {
  const e = new RdZipEntry();
  e.name = name;
  e.method = 0;
  e.raw = data;
  e.contentBuf = data;
  e.hasContent = true;
  e.csize = data.byteLength;
  e.usize = data.byteLength;
  e.crc = RdZip.crc32(data);
  return e;
};
export class RdZipArchive  {
  constructor() {
    this.ok = false;
    this.error = "";
    this.entries = [];
  }
  find (name) {
    let found;
    // Loop start
    for ( const e of this.entries) {
      if ( e.name == name ) {
        found = e;
        break;
      }
    }
    return found;
  };
  names () {
    let out = [];
    // Loop start
    for ( const e of this.entries) {
      out.push(e.name);
    }
    return out;
  };
}
export class RdZip  {
}
RdZip.u16 = function(b, p) {
  return b._view.getUint8(p) + b._view.getUint8(p + 1) * 256;
};
RdZip.u32 = function(b, p) {
  return RgU32.fromBytesBE(
    b._view.getUint8(p + 3),
    b._view.getUint8(p + 2),
    b._view.getUint8(p + 1),
    b._view.getUint8(p)
  );
};
RdZip.isZip = function(b) {
  if ( b.byteLength < 22 ) {
    return false;
  }
  return b._view.getUint8(0) == 80 && (b._view.getUint8(1) == 75 && (b._view.getUint8(2) == 3 && b._view.getUint8(3) == 4));
};
RdZip.read = function(b) {
  const z = new RdZipArchive();
  const n = b.byteLength;
  let eocd = -1;
  let p = n - 22;
  let stop = n - 65557;
  if ( stop < 0 ) {
    stop = 0;
  }
  while (p >= stop) {
    if ( (b._view.getUint8(p) == 80 && b._view.getUint8(p + 1) == 75) && (b._view.getUint8(p + 2) == 5 && b._view.getUint8(p + 3) == 6) ) {
      eocd = p;
      break;
    }
    p = p - 1;
  };
  if ( eocd < 0 ) {
    z.error = "not a ZIP archive";
    return z;
  }
  const count = RdZip.u16(b, (eocd + 10));
  const cd = RdZip.u32(b, (eocd + 16));
  let i = 0;
  let at = cd;
  while (i < count) {
    if ( at + 46 > n || RdZip.u32(b, at) != 33639248 ) {
      z.error = "broken central directory";
      return z;
    }
    const e = new RdZipEntry();
    e.method = RdZip.u16(b, (at + 10));
    e.crc = RdZip.u32(b, (at + 16));
    e.csize = RdZip.u32(b, (at + 20));
    e.usize = RdZip.u32(b, (at + 24));
    const nameLen = RdZip.u16(b, (at + 28));
    const extraLen = RdZip.u16(b, (at + 30));
    const commentLen = RdZip.u16(b, (at + 32));
    const local = RdZip.u32(b, (at + 42));
    e.name = RdBytes.toText(((function(
      b,
      s,
      e
    ){ var slice = b.slice(s,e); return Object.assign(slice, { _view: new DataView(slice) }); })(b,at + 46,(at + 46) + nameLen)));
    if ( e.method != 0 && e.method != 8 ) {
      z.error = "unsupported compression in " + e.name;
      return z;
    }
    if ( local + 30 > n || RdZip.u32(b, local) != 67324752 ) {
      z.error = "broken local header of " + e.name;
      return z;
    }
    const dataAt = ((local + 30) + RdZip.u16(b, (local + 26))) + RdZip.u16(b, (local + 28));
    if ( dataAt + e.csize > n ) {
      z.error = "truncated part " + e.name;
      return z;
    }
    e.raw = (function(
      b,
      s,
      e
    ){ var slice = b.slice(s,e); return Object.assign(slice, { _view: new DataView(slice) }); })(b,dataAt,dataAt + e.csize);
    z.entries.push(e);
    at = (((at + 46) + nameLen) + extraLen) + commentLen;
    i = i + 1;
  };
  z.ok = true;
  return z;
};
RdZip.write = function(entries) {
  const w = new RdWriter();
  let offsets = [];
  let names = [];
  // Loop start
  for ( const e of entries) {
    const nb = RdBytes.fromText(e.name);
    names.push(nb);
    offsets.push(w.__len);
    w.u32le(67324752);
    w.u16le(20);
    w.u16le(2048);
    w.u16le(e.method);
    w.u16le(0);
    w.u16le(33);
    w.u32le(e.crc);
    w.u32le(e.raw.byteLength);
    w.u32le(e.usize);
    w.u16le(nb.byteLength);
    w.u16le(0);
    w.all(nb);
    w.all(e.raw);
  }
  const cdStart = w.__len;
  // Loop start
  for ( let j = 0; j < entries.length; j++) {
    var e2 = entries[j];
    const nb2 = names[j];
    w.u32le(33639248);
    w.u16le(20);
    w.u16le(20);
    w.u16le(2048);
    w.u16le(e2.method);
    w.u16le(0);
    w.u16le(33);
    w.u32le(e2.crc);
    w.u32le(e2.raw.byteLength);
    w.u32le(e2.usize);
    w.u16le(nb2.byteLength);
    w.u16le(0);
    w.u16le(0);
    w.u16le(0);
    w.u16le(0);
    w.u32le(0);
    w.u32le(offsets[j]);
    w.all(nb2);
  }
  const cdLen = w.__len - cdStart;
  w.u32le(101010256);
  w.u16le(0);
  w.u16le(0);
  w.u16le(entries.length);
  w.u16le(entries.length);
  w.u32le(cdLen);
  w.u32le(cdStart);
  w.u16le(0);
  return w.toBuffer();
};
RdZip.crcTable = function() {
  let t = new Int32Array(256);
  const poly = RgU32.fromHalves(60856, 33568);
  let n = 0;
  while (n < 256) {
    let c = n;
    let k = 0;
    while (k < 8) {
      if ( (c & 1) != 0 ) {
        c = (poly ^ RgU32.shr(c, 1));
      } else {
        c = RgU32.shr(c, 1);
      }
      k = k + 1;
    };
    t[n] = c;
    n = n + 1;
  };
  return t;
};
RdZip.crc32 = function(b) {
  const t = RdZip.crcTable();
  let c = RgU32.bnot(0);
  const n = b.byteLength;
  let i = 0;
  while (i < n) {
    const idx = ((c ^ b._view.getUint8(i)) & 255);
    c = (t[idx] ^ RgU32.shr(c, 8));
    i = i + 1;
  };
  return RgU32.bnot(c);
};
export class RdOp  {
  constructor() {
    this.kind = 0;
    this.off = 0;
    this.__len = 0;
    this.data = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
  }
  isCopy () {
    return this.kind == 1;
  };
}
export class RdDeltaInfo  {
  constructor() {
    this.ok = false;
    this.error = "";
    this.baseLen = 0;
    this.newLen = 0;
    this.baseSum = 0;
    this.newSum = 0;
    this.copyBytes = 0;
    this.addBytes = 0;
    this.copies = 0;
    this.adds = 0;
    this.ops = [];
  }
}
export class RdApplyResult  {
  constructor() {
    this.ok = false;
    this.error = "";
    this.data = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
  }
}
export class RdDeltaWriter  {
  constructor() {
    this.kinds = [];
    this.offs = [];
    this.lens = [];
    this.srcs = [];
    this.total = 0;
  }
  copy (off, __len) {
    if ( __len <= 0 ) {
      return;
    }
    const n = this.kinds.length;
    if ( n > 0 ) {
      const k = n - 1;
      if ( this.kinds[k] == 1 && this.offs[k] + this.lens[k] == off ) {
        this.lens[k] = this.lens[k] + __len;
        this.total = this.total + __len;
        return;
      }
    }
    this.kinds.push(1);
    this.offs.push(off);
    this.lens.push(__len);
    this.srcs.push((function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0)));
    this.total = this.total + __len;
  };
  add (src, off, __len) {
    if ( __len <= 0 ) {
      return;
    }
    this.kinds.push(0);
    this.offs.push(off);
    this.lens.push(__len);
    this.srcs.push(src);
    this.total = this.total + __len;
  };
  encode (baseLen, baseSum, newSum) {
    const w = new RdWriter();
    w.byte(82);
    w.byte(68);
    w.byte(1);
    w.byte(1);
    w.varint(baseLen);
    w.varint(this.total);
    w.u32(baseSum);
    w.u32(newSum);
    let lastEnd = 0;
    const n = this.kinds.length;
    let i = 0;
    while (i < n) {
      const __len = this.lens[i];
      if ( this.kinds[i] == 1 ) {
        const off = this.offs[i];
        w.varint(__len * 2 + 1);
        w.zigzag(off - lastEnd);
        lastEnd = off + __len;
      } else {
        w.varint(__len * 2);
        w.bytes(this.srcs[i], this.offs[i], __len);
      }
      i = i + 1;
    };
    return w.toBuffer();
  };
}
export class RdDelta  {
}
RdDelta.blockFor = function(baseLen) {
  if ( baseLen > 8388608 ) {
    return 32;
  }
  return 16;
};
RdDelta.diff = function(base, target) {
  const w = RdDelta.ops(base, target);
  return w.encode(
    base.byteLength,
    RdBytes.adler32(base),
    RdBytes.adler32(target)
  );
};
RdDelta.ops = function(base, target) {
  const w = new RdDeltaWriter();
  const bl = base.byteLength;
  const tl = target.byteLength;
  let p = 0;
  let lim = bl;
  if ( tl < lim ) {
    lim = tl;
  }
  while (p < lim && base._view.getUint8(p) == target._view.getUint8(p)) {
    p = p + 1;
  };
  let s = 0;
  while (s + p < lim && base._view.getUint8((bl - 1) - s) == target._view.getUint8((tl - 1) - s)) {
    s = s + 1;
  };
  w.copy(0, p);
  RdDelta.matchMiddle(w, base, target, p, tl - s);
  w.copy(bl - s, s);
  return w;
};
RdDelta.matchMiddle = function(w, base, target, start, end) {
  const bl = base.byteLength;
  const B = RdDelta.blockFor(bl);
  const nblocks = ((bl / B) | 0);
  if ( nblocks == 0 || end - start < B ) {
    w.add(target, start, end - start);
    return;
  }
  let tsize = 1024;
  while (tsize < nblocks * 2) {
    tsize = tsize * 2;
  };
  const mask = tsize - 1;
  let head = new Int32Array(tsize);
  let next = new Int32Array(nblocks);
  let bi = 0;
  while (bi < nblocks) {
    const h = RdDelta.blockHash(base, (bi * B), B, mask);
    next[bi] = head[h];
    head[h] = bi + 1;
    bi = bi + 1;
  };
  let lit = start;
  let t = start;
  let a = 0;
  let b = 0;
  let fresh = true;
  let lastEnd = -1;
  while (t + B <= end) {
    if ( fresh ) {
      a = 0;
      b = 0;
      let k = 0;
      while (k < B) {
        const x = target._view.getUint8(t + k);
        a = a + x;
        b = b + a;
        k = k + 1;
      };
      fresh = false;
    }
    let bestOff = -1;
    let bestFwd = 0;
    let bestBack = 0;
    if ( lastEnd >= 0 ) {
      const fwd0 = RdDelta.forward(base, lastEnd, target, t, end);
      if ( fwd0 >= B ) {
        bestOff = lastEnd;
        bestFwd = fwd0;
      }
    }
    const h_1 = ((b * 4099 + a) & mask);
    let cand = head[h_1];
    let tries = 0;
    while (cand > 0 && tries < 32) {
      const c = (cand - 1) * B;
      const fwd = RdDelta.forward(base, c, target, t, end);
      if ( fwd >= B ) {
        const back = RdDelta.backward(base, c, target, t, lit);
        if ( fwd + back > bestFwd + bestBack ) {
          bestOff = c;
          bestFwd = fwd;
          bestBack = back;
        }
      }
      cand = next[(cand - 1)];
      tries = tries + 1;
    };
    let bestT = t;
    if ( (lastEnd >= 0 && t - lit < 64) && bestFwd < 4096 ) {
      let gain = bestFwd + bestBack;
      let k2 = 0;
      while (k2 < 16 && t + k2 < end) {
        let j2 = 0;
        while (j2 < 48 && lastEnd + j2 < bl) {
          if ( base._view.getUint8(lastEnd + j2) == target._view.getUint8(t + k2) ) {
            const f2 = RdDelta.forward(
              base,
              (lastEnd + j2),
              target,
              (t + k2),
              end
            );
            if ( f2 >= B && f2 - k2 > gain ) {
              gain = f2 - k2;
              bestOff = lastEnd + j2;
              bestFwd = f2;
              bestBack = 0;
              bestT = t + k2;
            }
          }
          j2 = j2 + 1;
        };
        k2 = k2 + 1;
      };
    }
    if ( bestOff >= 0 ) {
      if ( bestBack == 0 ) {
        bestBack = RdDelta.backward(base, bestOff, target, bestT, lit);
      }
      const from = bestT - bestBack;
      w.add(target, lit, from - lit);
      w.copy(bestOff - bestBack, bestFwd + bestBack);
      t = bestT + bestFwd;
      lit = t;
      lastEnd = bestOff + bestFwd;
      fresh = true;
    } else {
      if ( t + B < end ) {
        const out = target._view.getUint8(t);
        const inb = target._view.getUint8(t + B);
        a = (a - out) + inb;
        b = (b - B * out) + a;
      }
      t = t + 1;
    }
  };
  w.add(target, lit, end - lit);
};
RdDelta.blockHash = function(base, off, B, mask) {
  let a = 0;
  let b = 0;
  let k = 0;
  while (k < B) {
    a = a + base._view.getUint8(off + k);
    b = b + a;
    k = k + 1;
  };
  return ((b * 4099 + a) & mask);
};
RdDelta.forward = function(base, c, target, t, end) {
  const bl = base.byteLength;
  let n = 0;
  while ((c + n < bl && t + n < end) && base._view.getUint8(c + n) == target._view.getUint8(t + n)) {
    n = n + 1;
  };
  return n;
};
RdDelta.backward = function(base, c, target, t, lit) {
  let n = 0;
  while ((c - n > 0 && t - n > lit) && base._view.getUint8((c - n) - 1) == target._view.getUint8((t - n) - 1)) {
    n = n + 1;
  };
  return n;
};
RdDelta.info = function(delta) {
  const r = new RdDeltaInfo();
  const rd = new RdReader(delta);
  if ( (rd.byte() != 82 || rd.byte() != 68) || (rd.byte() != 1 || rd.byte() != 1) ) {
    r.error = "not a RangerDiff byte delta";
    return r;
  }
  r.baseLen = rd.varint();
  r.newLen = rd.varint();
  r.baseSum = rd.u32();
  r.newSum = rd.u32();
  let produced = 0;
  let lastEnd = 0;
  while (produced < r.newLen && rd.failed == false) {
    const hdr = rd.varint();
    const op = new RdOp();
    op.kind = hdr % 2;
    op.__len = ((hdr / 2) | 0);
    if ( op.__len <= 0 ) {
      r.error = "empty operation";
      return r;
    }
    if ( op.kind == 1 ) {
      op.off = lastEnd + rd.zigzag();
      if ( op.off < 0 || op.off + op.__len > r.baseLen ) {
        r.error = "COPY outside the base";
        return r;
      }
      lastEnd = op.off + op.__len;
      r.copyBytes = r.copyBytes + op.__len;
      r.copies = r.copies + 1;
    } else {
      op.data = rd.bytes(op.__len);
      r.addBytes = r.addBytes + op.__len;
      r.adds = r.adds + 1;
    }
    produced = produced + op.__len;
    r.ops.push(op);
  };
  if ( rd.failed ) {
    r.error = "delta is truncated";
    return r;
  }
  if ( produced != r.newLen ) {
    r.error = "operations do not add up to the new length";
    return r;
  }
  if ( rd.eof() == false ) {
    r.error = "bytes after the last operation";
    return r;
  }
  r.ok = true;
  return r;
};
RdDelta.apply = function(base, delta) {
  const res = new RdApplyResult();
  const info = RdDelta.info(delta);
  if ( info.ok == false ) {
    res.error = info.error;
    return res;
  }
  if ( base.byteLength != info.baseLen ) {
    res.error = "the base has the wrong length";
    return res;
  }
  if ( RdBytes.adler32(base) != info.baseSum ) {
    res.error = "the base is not the one this delta was made from";
    return res;
  }
  let out = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(info.newLen));
  let at = 0;
  // Loop start
  for ( const op of info.ops) {
    if ( op.kind == 1 ) {
      (function(
        d,
        dOff,
        s,
        sOff,
        len
      ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(out,at,base,op.off,op.__len);
    } else {
      (function(
        d,
        dOff,
        s,
        sOff,
        len
      ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(out,at,op.data,0,op.__len);
    }
    at = at + op.__len;
  }
  if ( RdBytes.adler32(out) != info.newSum ) {
    res.error = "the result does not match the checksum";
    return res;
  }
  res.ok = true;
  res.data = out;
  return res;
};
RdDelta.fromOps = function(base, w) {
  const tmp = RdDelta.encode0(base, w);
  const r = RdDelta.applyUnchecked(base, tmp);
  return w.encode(
    base.byteLength,
    RdBytes.adler32(base),
    RdBytes.adler32(r.data)
  );
};
RdDelta.insertAt = function(base, off, bytes) {
  const w = new RdDeltaWriter();
  w.copy(0, off);
  w.add(bytes, 0, bytes.byteLength);
  w.copy(off, base.byteLength - off);
  return RdDelta.fromOps(base, w);
};
RdDelta.deleteAt = function(base, off, __len) {
  const w = new RdDeltaWriter();
  w.copy(0, off);
  w.copy(off + __len, (base.byteLength - off) - __len);
  return RdDelta.fromOps(base, w);
};
RdDelta.rewriteAt = function(base, off, bytes) {
  const bl = base.byteLength;
  const n = bytes.byteLength;
  const w = new RdDeltaWriter();
  w.copy(0, off);
  w.add(bytes, 0, n);
  if ( off + n < bl ) {
    w.copy(off + n, (bl - off) - n);
  }
  return RdDelta.fromOps(base, w);
};
RdDelta.replaceAt = function(base, off, __len, bytes) {
  const w = new RdDeltaWriter();
  w.copy(0, off);
  w.add(bytes, 0, bytes.byteLength);
  w.copy(off + __len, (base.byteLength - off) - __len);
  return RdDelta.fromOps(base, w);
};
RdDelta.encode0 = function(base, w) {
  return w.encode(base.byteLength, 0, 0);
};
RdDelta.applyUnchecked = function(base, delta) {
  const res = new RdApplyResult();
  const info = RdDelta.info(delta);
  if ( info.ok == false ) {
    res.error = info.error;
    return res;
  }
  let out = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(info.newLen));
  let at = 0;
  // Loop start
  for ( const op of info.ops) {
    if ( op.kind == 1 ) {
      (function(
        d,
        dOff,
        s,
        sOff,
        len
      ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(out,at,base,op.off,op.__len);
    } else {
      (function(
        d,
        dOff,
        s,
        sOff,
        len
      ){ var dv = new Uint8Array(d); var sv = new Uint8Array(s); for(var i=0;i<len;i++) dv[dOff+i]=sv[sOff+i]; })(out,at,op.data,0,op.__len);
    }
    at = at + op.__len;
  }
  res.ok = true;
  res.data = out;
  return res;
};
RdDelta.reverse = function(base, delta) {
  const r = RdDelta.apply(base, delta);
  return RdDelta.diff(r.data, base);
};
export class RdXlsx  {
}
RdXlsx.isSheet = function(name) {
  return name.indexOf("xl/worksheets/") == 0 && name.indexOf(".xml") == name.length - 4;
};
RdXlsx.at = function(b, p, s) {
  const n = s.length;
  if ( p + n > b.byteLength ) {
    return false;
  }
  let i = 0;
  while (i < n) {
    if ( b._view.getUint8(p + i) != s.charCodeAt(i ) ) {
      return false;
    }
    i = i + 1;
  };
  return true;
};
RdXlsx.byteAt = function(b, p) {
  if ( p >= b.byteLength ) {
    return 0;
  }
  return b._view.getUint8(p);
};
RdXlsx.isDigit = function(c) {
  return c >= 48 && c <= 57;
};
RdXlsx.isUpper = function(c) {
  return c >= 65 && c <= 90;
};
RdXlsx.isWordChar = function(c) {
  return (RdXlsx.isUpper(c) || RdXlsx.isDigit(c)) || ((c >= 97 && c <= 122 || c == 95) || c == 46);
};
RdXlsx.writeInt = function(w, value) {
  let v = value;
  if ( v < 0 ) {
    w.byte(45);
    v = 0 - v;
  }
  let div = 1;
  while (div * 10 <= v) {
    div = div * 10;
  };
  while (div > 0) {
    w.byte(48 + ((v / div) | 0) % 10);
    div = ((div / 10) | 0);
  };
};
RdXlsx.readNum = function(b, p, end) {
  let v = 0;
  let i = p;
  while (i < end && RdXlsx.isDigit(b._view.getUint8(i))) {
    v = v * 10 + (b._view.getUint8(i) - 48);
    i = i + 1;
  };
  const __len = i - p;
  if ( __len == 0 || __len > 9 ) {
    return -1;
  }
  if ( b._view.getUint8(p) == 48 && __len > 1 ) {
    return -1;
  }
  return v;
};
RdXlsx.numLen = function(b, p, end) {
  let i = p;
  while (i < end && RdXlsx.isDigit(b._view.getUint8(i))) {
    i = i + 1;
  };
  return i - p;
};
RdXlsx.encode = function(b) {
  const n = b.byteLength;
  let i = 0;
  while (i < n) {
    if ( b._view.getUint8(i) == 1 ) {
      return b;
    }
    i = i + 1;
  };
  const w = new RdWriter();
  w.ensure(n + 16);
  let prevRow = 0;
  let curRow = 0;
  let inFormula = false;
  let inQuote = false;
  let p = 0;
  let ps = 0;
  while (p < n) {
    const c = b._view.getUint8(p);
    if ( inFormula ) {
      if ( c == 60 && RdXlsx.byteAt(b, p + 1) == 47 ) {
        inFormula = false;
        inQuote = false;
        p = p + 1;
        continue;
      }
      if ( c == 34 ) {
        inQuote = inQuote == false;
      }
      if ( inQuote == false && RdXlsx.isUpper(c) ) {
        let prevOk = true;
        if ( p > 0 ) {
          const pc = b._view.getUint8(p - 1);
          if ( RdXlsx.isWordChar(pc) ) {
            prevOk = false;
          }
        }
        if ( prevOk ) {
          let q = p;
          while (q < n && (RdXlsx.isUpper(b._view.getUint8(q)) && q - p < 3)) {
            q = q + 1;
          };
          const dl = RdXlsx.numLen(b, q, n);
          const num = RdXlsx.readNum(b, q, n);
          const after = q + dl;
          let nextC = 0;
          if ( after < n ) {
            nextC = b._view.getUint8(after);
          }
          if ( ((num > 0 && curRow > 0) && RdXlsx.isWordChar(nextC) == false) && nextC != 40 ) {
            w.bytes(b, ps, q - ps);
            w.byte(1);
            w.byte(70);
            RdXlsx.writeInt(w, num - curRow);
            p = after;
            ps = p;
            continue;
          }
          p = q;
          continue;
        }
      }
      p = p + 1;
      continue;
    }
    if ( c == 60 ) {
      const c1 = RdXlsx.byteAt(b, (p + 1));
      const c2 = RdXlsx.byteAt(b, (p + 2));
      if ( c1 == 114 && RdXlsx.at(b, p, "<row ") ) {
        let endTag = p;
        while (endTag < n && b._view.getUint8(endTag) != 62) {
          endTag = endTag + 1;
        };
        const ra = RdXlsx.findAttr(b, p, endTag, " r=\"");
        if ( ra > 0 ) {
          const rv = RdXlsx.readNum(b, ra, endTag);
          const rl = RdXlsx.numLen(b, ra, endTag);
          if ( rv > 0 && b._view.getUint8(ra + rl) == 34 ) {
            w.bytes(b, ps, ra - ps);
            w.byte(1);
            w.byte(82);
            RdXlsx.writeInt(w, rv - prevRow);
            prevRow = rv;
            curRow = rv;
            p = ra + rl;
            ps = p;
            continue;
          }
        }
        curRow = 0;
      }
      if ( (c1 == 99 && c2 == 32) && curRow > 0 ) {
        let endTag2 = p;
        while (endTag2 < n && b._view.getUint8(endTag2) != 62) {
          endTag2 = endTag2 + 1;
        };
        const ca = RdXlsx.findAttr(b, p, endTag2, " r=\"");
        if ( ca > 0 ) {
          let q2 = ca;
          while (q2 < endTag2 && RdXlsx.isUpper(b._view.getUint8(q2))) {
            q2 = q2 + 1;
          };
          const cv = RdXlsx.readNum(b, q2, endTag2);
          const cl = RdXlsx.numLen(b, q2, endTag2);
          if ( (q2 > ca && cv == curRow) && b._view.getUint8(q2 + cl) == 34 ) {
            w.bytes(b, ps, q2 - ps);
            w.byte(1);
            w.byte(67);
            p = q2 + cl;
            ps = p;
            continue;
          }
        }
      }
      if ( c1 == 102 && (c2 == 62 || c2 == 32) ) {
        let endTag3 = p;
        while (endTag3 < n && b._view.getUint8(endTag3) != 62) {
          endTag3 = endTag3 + 1;
        };
        if ( endTag3 < n && b._view.getUint8(endTag3 - 1) != 47 ) {
          p = endTag3 + 1;
          inFormula = true;
          inQuote = false;
          continue;
        }
      }
    }
    p = p + 1;
  };
  w.bytes(b, ps, n - ps);
  const enc = w.toBuffer();
  if ( RdBytes.equal(RdXlsx.decode(enc), b) == false ) {
    return b;
  }
  return enc;
};
RdXlsx.findAttr = function(b, p, end, attr) {
  let q = p;
  while (q < end) {
    if ( RdXlsx.at(b, q, attr) ) {
      return q + attr.length;
    }
    q = q + 1;
  };
  return -1;
};
RdXlsx.isEncoded = function(b) {
  const n = b.byteLength;
  let i = 0;
  while (i < n) {
    if ( b._view.getUint8(i) == 1 ) {
      return true;
    }
    i = i + 1;
  };
  return false;
};
RdXlsx.readSigned = function(b, p) {
  const n = b.byteLength;
  let neg = false;
  let i = p;
  if ( i < n && b._view.getUint8(i) == 45 ) {
    neg = true;
    i = i + 1;
  }
  let v = 0;
  while (i < n && RdXlsx.isDigit(b._view.getUint8(i))) {
    v = v * 10 + (b._view.getUint8(i) - 48);
    i = i + 1;
  };
  if ( neg ) {
    v = 0 - v;
  }
  let out = [];
  out.push(v);
  out.push(i - p);
  return out;
};
RdXlsx.decode = function(b) {
  const n = b.byteLength;
  const w = new RdWriter();
  w.ensure(n + ((n / 4) | 0));
  let row = 0;
  let p = 0;
  let ps = 0;
  while (p < n) {
    const c = b._view.getUint8(p);
    if ( c == 1 && p + 1 < n ) {
      w.bytes(b, ps, p - ps);
      const kind = b._view.getUint8(p + 1);
      if ( kind == 67 ) {
        RdXlsx.writeInt(w, row);
        p = p + 2;
        ps = p;
        continue;
      }
      const sv = RdXlsx.readSigned(b, (p + 2));
      if ( kind == 82 ) {
        row = row + sv[0];
        RdXlsx.writeInt(w, row);
      } else {
        RdXlsx.writeInt(w, row + sv[0]);
      }
      p = (p + 2) + sv[1];
      ps = p;
      continue;
    }
    p = p + 1;
  };
  w.bytes(b, ps, n - ps);
  return w.toBuffer();
};
export class RdPartChange  {
  constructor() {
    this.name = "";
    this.kind = 0;
    this.baseName = "";
    this.oldSize = 0;
    this.newSize = 0;
    this.cost = 0;
  }
  kindName () {
    if ( this.kind == 0 ) {
      return "same";
    }
    if ( this.kind == 1 || this.kind == 5 ) {
      return "changed";
    }
    if ( this.kind == 2 ) {
      if ( this.oldSize < 0 ) {
        return "added";
      }
      return "replaced";
    }
    if ( this.kind == 3 ) {
      return "renamed";
    }
    return "removed";
  };
}
export class RdPackInfo  {
  constructor() {
    this.ok = false;
    this.error = "";
    this.parts = [];
  }
  changed () {
    let out = [];
    // Loop start
    for ( const p of this.parts) {
      if ( p.kind != 0 ) {
        out.push(p);
      }
    }
    return out;
  };
}
export class RdPack  {
}
RdPack.diff = function(base, target) {
  if ( RdZip.isZip(base) == false || RdZip.isZip(target) == false ) {
    return RdDelta.diff(base, target);
  }
  const za = RdZip.read(base);
  const zb = RdZip.read(target);
  if ( za.ok == false || zb.ok == false ) {
    return RdDelta.diff(base, target);
  }
  return RdPack.diffArchives(za, zb);
};
RdPack.diffArchives = function(za, zb) {
  const w = new RdWriter();
  w.byte(82);
  w.byte(68);
  w.byte(1);
  w.byte(2);
  w.varint(zb.entries.length);
  let byCrc = {};
  // Loop start
  for ( const ea of za.entries) {
    const key = ((ea.crc).toString()) + (":" + ((ea.usize).toString()));
    byCrc[key] = ea.name;
  }
  // Loop start
  for ( const e of zb.entries) {
    w.text(e.name);
    w.u32(e.crc);
    const old = za.find(e.name);
    if ( (typeof(old) !== "undefined" && old != null )  ) {
      const o = old;
      if ( o.crc == e.crc && o.usize == e.usize ) {
        w.byte(0);
      } else {
        const nb = e.content();
        const sheetForm = RdXlsx.isSheet(e.name) && RdXlsx.isEncoded(nb) == false;
        let d = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
        if ( sheetForm ) {
          d = RdDelta.diff(RdXlsx.encode(o.content()), RdXlsx.encode(nb));
        } else {
          d = RdDelta.diff(o.content(), nb);
        }
        if ( d.byteLength < e.raw.byteLength ) {
          if ( sheetForm ) {
            w.byte(5);
          } else {
            w.byte(1);
          }
          w.varint(d.byteLength);
          w.all(d);
        } else {
          RdPack.writeRaw(w, e);
        }
      }
    } else {
      const key2 = ((e.crc).toString()) + (":" + ((e.usize).toString()));
      if ( ( typeof(byCrc[key2] ) != "undefined" && Object.prototype.hasOwnProperty.call(byCrc, key2) ) ) {
        w.byte(3);
        w.text(( Object.prototype.hasOwnProperty.call(byCrc, key2) ? byCrc[key2] : undefined ));
      } else {
        RdPack.writeRaw(w, e);
      }
    }
  }
  return w.toBuffer();
};
RdPack.writeRaw = function(w, e) {
  w.byte(6);
  w.byte(e.method);
  w.varint(e.usize);
  w.varint(e.raw.byteLength);
  w.all(e.raw);
};
RdPack.isPackDelta = function(d) {
  if ( d.byteLength < 4 ) {
    return false;
  }
  return (d._view.getUint8(0) == 82 && d._view.getUint8(1) == 68) && (d._view.getUint8(2) == 1 && d._view.getUint8(3) == 2);
};
RdPack.apply = function(base, delta) {
  if ( RdPack.isPackDelta(delta) == false ) {
    return RdDelta.apply(base, delta);
  }
  const res = new RdApplyResult();
  const za = RdZip.read(base);
  if ( za.ok == false ) {
    res.error = "base: " + za.error;
    return res;
  }
  const rd = new RdReader(delta);
  rd.pos = 4;
  const count = rd.varint();
  let out = [];
  let i = 0;
  while (i < count) {
    const name = rd.text();
    const crc = rd.u32();
    const kind = rd.byte();
    if ( rd.failed ) {
      res.error = "delta is truncated";
      return res;
    }
    if ( kind == 6 ) {
      const re = new RdZipEntry();
      re.name = name;
      re.method = rd.byte();
      re.usize = rd.varint();
      const rlen = rd.varint();
      re.raw = rd.bytes(rlen);
      re.csize = rlen;
      re.crc = crc;
      if ( rd.failed ) {
        res.error = "delta is truncated";
        return res;
      }
      if ( RdZip.crc32(re.content()) != crc ) {
        res.error = "part does not match its checksum: " + name;
        return res;
      }
      out.push(re);
      i = i + 1;
      continue;
    }
    if ( kind == 0 || kind == 3 ) {
      let baseName = name;
      if ( kind == 3 ) {
        baseName = rd.text();
      }
      const old = za.find(baseName);
      if ( typeof(old) === "undefined" ) {
        res.error = "the base has no part " + baseName;
        return res;
      }
      const o = old;
      if ( o.crc != crc ) {
        res.error = "the base part differs: " + baseName;
        return res;
      }
      const keep = new RdZipEntry();
      keep.name = name;
      keep.method = o.method;
      keep.crc = o.crc;
      keep.csize = o.csize;
      keep.usize = o.usize;
      keep.raw = o.raw;
      out.push(keep);
    } else {
      let data = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
      if ( kind == 1 || kind == 5 ) {
        const dlen = rd.varint();
        const pd = rd.bytes(dlen);
        const old2 = za.find(name);
        if ( typeof(old2) === "undefined" ) {
          res.error = "the base has no part " + name;
          return res;
        }
        const o2 = old2;
        let from = o2.content();
        if ( kind == 5 ) {
          from = RdXlsx.encode(from);
        }
        const r = RdDelta.apply(from, pd);
        if ( r.ok == false ) {
          res.error = (name + ": ") + r.error;
          return res;
        }
        data = r.data;
        if ( kind == 5 ) {
          data = RdXlsx.decode(data);
        }
      } else {
        const flen = rd.varint();
        data = rd.bytes(flen);
      }
      if ( rd.failed ) {
        res.error = "delta is truncated";
        return res;
      }
      const ne = RdZipEntry.stored(name, data);
      if ( ne.crc != crc ) {
        res.error = "part does not match its checksum: " + name;
        return res;
      }
      out.push(ne);
    }
    i = i + 1;
  };
  res.ok = true;
  res.data = RdZip.write(out);
  return res;
};
RdPack.info = function(base, delta) {
  const info = new RdPackInfo();
  if ( RdPack.isPackDelta(delta) == false ) {
    info.error = "not a container delta";
    return info;
  }
  const za = RdZip.read(base);
  const rd = new RdReader(delta);
  rd.pos = 4;
  const count = rd.varint();
  let seen = {};
  let i = 0;
  while (i < count) {
    const start = rd.pos;
    const c = new RdPartChange();
    c.name = rd.text();
    rd.u32();
    c.kind = rd.byte();
    c.oldSize = -1;
    const old = za.find(c.name);
    if ( (typeof(old) !== "undefined" && old != null )  ) {
      const oe = old;
      c.oldSize = oe.usize;
    }
    if ( c.kind == 0 ) {
      c.newSize = c.oldSize;
    }
    if ( c.kind == 1 || c.kind == 5 ) {
      const dlen = rd.varint();
      const pd = rd.bytes(dlen);
      const di = RdDelta.info(pd);
      c.newSize = di.newLen;
    }
    if ( c.kind == 2 ) {
      const flen = rd.varint();
      rd.bytes(flen);
      c.newSize = flen;
    }
    if ( c.kind == 6 ) {
      rd.byte();
      c.newSize = rd.varint();
      rd.bytes(rd.varint());
      c.kind = 2;
    }
    if ( c.kind == 3 ) {
      c.baseName = rd.text();
      const ob = za.find(c.baseName);
      if ( (typeof(ob) !== "undefined" && ob != null )  ) {
        const obe = ob;
        c.oldSize = obe.usize;
        c.newSize = c.oldSize;
      }
      seen[c.baseName] = true;
    }
    c.cost = rd.pos - start;
    seen[c.name] = true;
    info.parts.push(c);
    i = i + 1;
  };
  if ( za.ok ) {
    // Loop start
    for ( const e of za.entries) {
      if ( ( typeof(seen[e.name] ) != "undefined" && Object.prototype.hasOwnProperty.call(seen, e.name) ) == false ) {
        const gone = new RdPartChange();
        gone.name = e.name;
        gone.kind = 4;
        gone.oldSize = e.usize;
        info.parts.push(gone);
      }
    }
  }
  info.ok = rd.failed == false;
  return info;
};
export class RdPngParts  {
  constructor() {
    this.ok = false;
    this.error = "";
    this.skeleton = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    this.pixels = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
  }
}
export class RdPng  {
}
RdPng.isPng = function(b) {
  if ( b.byteLength < 8 ) {
    return false;
  }
  return (b._view.getUint8(0) == 137 && b._view.getUint8(1) == 80) && (b._view.getUint8(2) == 78 && b._view.getUint8(3) == 71);
};
RdPng.u32be = function(b, p) {
  return RgU32.fromBytesBE(
    b._view.getUint8(p),
    b._view.getUint8(p + 1),
    b._view.getUint8(p + 2),
    b._view.getUint8(p + 3)
  );
};
RdPng.isType = function(b, p, t) {
  let i = 0;
  while (i < 4) {
    if ( b._view.getUint8(p + i) != t.charCodeAt(i ) ) {
      return false;
    }
    i = i + 1;
  };
  return true;
};
RdPng.split = function(b) {
  const parts = new RdPngParts();
  if ( RdPng.isPng(b) == false ) {
    parts.error = "not a PNG";
    return parts;
  }
  const n = b.byteLength;
  const skel = new RdWriter();
  const zdata = new RdWriter();
  skel.bytes(b, 0, 8);
  let p = 8;
  let marked = false;
  while (p + 12 <= n) {
    const __len = RdPng.u32be(b, p);
    if ( __len < 0 || (p + 12) + __len > n ) {
      parts.error = "broken chunk";
      return parts;
    }
    if ( RdPng.isType(b, p + 4, "IDAT") ) {
      zdata.bytes(b, p + 8, __len);
      if ( marked == false ) {
        skel.u32(0);
        skel.bytes(b, p + 4, 4);
        skel.u32(0);
        marked = true;
      }
    } else {
      skel.bytes(b, p, __len + 12);
    }
    p = (p + 12) + __len;
  };
  if ( marked == false ) {
    parts.error = "no IDAT";
    return parts;
  }
  const z = zdata.toBuffer();
  if ( z.byteLength < 6 ) {
    parts.error = "IDAT too short";
    return parts;
  }
  const inf = new Inflate();
  parts.pixels = inf.decompressFrom(z, 2);
  parts.skeleton = skel.toBuffer();
  parts.ok = true;
  return parts;
};
RdPng.join = function(skeleton, pixels) {
  const w = new RdWriter();
  const n = skeleton.byteLength;
  w.bytes(skeleton, 0, 8);
  let p = 8;
  while (p + 12 <= n) {
    const __len = RdPng.u32be(skeleton, p);
    if ( __len == 0 && RdPng.isType(skeleton, p + 4, "IDAT") ) {
      const z = RdPng.zlibStored(pixels);
      w.u32(z.byteLength);
      const typeAndData = new RdWriter();
      typeAndData.bytes(skeleton, p + 4, 4);
      typeAndData.all(z);
      const td = typeAndData.toBuffer();
      w.all(td);
      w.u32(RdZip.crc32(td));
    } else {
      w.bytes(skeleton, p, __len + 12);
    }
    p = (p + 12) + __len;
  };
  return w.toBuffer();
};
RdPng.zlibStored = function(data) {
  const w = new RdWriter();
  w.byte(120);
  w.byte(1);
  const n = data.byteLength;
  let p = 0;
  if ( n == 0 ) {
    w.byte(1);
    w.u16le(0);
    w.u16le(65535);
  }
  while (p < n) {
    let __len = n - p;
    if ( __len > 65535 ) {
      __len = 65535;
    }
    let last = 0;
    if ( p + __len >= n ) {
      last = 1;
    }
    w.byte(last);
    w.u16le(__len);
    w.u16le(65535 - __len);
    w.bytes(data, p, __len);
    p = p + __len;
  };
  w.u32(RdBytes.adler32(data));
  return w.toBuffer();
};
RdPng.diff = function(base, target) {
  const a = RdPng.split(base);
  const b = RdPng.split(target);
  if ( a.ok == false || b.ok == false ) {
    return RdDelta.diff(base, target);
  }
  const ds = RdDelta.diff(a.skeleton, b.skeleton);
  const dp = RdDelta.diff(a.pixels, b.pixels);
  const w = new RdWriter();
  w.byte(82);
  w.byte(68);
  w.byte(1);
  w.byte(3);
  w.varint(ds.byteLength);
  w.all(ds);
  w.varint(dp.byteLength);
  w.all(dp);
  return w.toBuffer();
};
RdPng.isPngDelta = function(d) {
  if ( d.byteLength < 4 ) {
    return false;
  }
  return (d._view.getUint8(0) == 82 && d._view.getUint8(1) == 68) && (d._view.getUint8(2) == 1 && d._view.getUint8(3) == 3);
};
RdPng.apply = function(base, delta) {
  if ( RdPng.isPngDelta(delta) == false ) {
    return RdDelta.apply(base, delta);
  }
  const res = new RdApplyResult();
  const a = RdPng.split(base);
  if ( a.ok == false ) {
    res.error = "base: " + a.error;
    return res;
  }
  const rd = new RdReader(delta);
  rd.pos = 4;
  const ds = rd.bytes(rd.varint());
  const dp = rd.bytes(rd.varint());
  if ( rd.failed ) {
    res.error = "delta is truncated";
    return res;
  }
  const rs = RdDelta.apply(a.skeleton, ds);
  if ( rs.ok == false ) {
    res.error = "skeleton: " + rs.error;
    return res;
  }
  const rp = RdDelta.apply(a.pixels, dp);
  if ( rp.ok == false ) {
    res.error = "pixels: " + rp.error;
    return res;
  }
  res.ok = true;
  res.data = RdPng.join(rs.data, rp.data);
  return res;
};
export class RdSmart  {
}
RdSmart.kindOf = function(d) {
  if ( d.byteLength < 4 ) {
    return 0;
  }
  if ( (d._view.getUint8(0) != 82 || d._view.getUint8(1) != 68) || d._view.getUint8(2) != 1 ) {
    return 0;
  }
  return d._view.getUint8(3);
};
RdSmart.diff = function(base, target) {
  const plain = RdDelta.diff(base, target);
  let smart = plain;
  if ( RdZip.isZip(base) && RdZip.isZip(target) ) {
    smart = RdPack.diff(base, target);
  } else {
    if ( RdPng.isPng(base) && RdPng.isPng(target) ) {
      smart = RdPng.diff(base, target);
    }
  }
  if ( smart.byteLength * 5 < plain.byteLength * 4 ) {
    return smart;
  }
  return plain;
};
RdSmart.apply = function(base, delta) {
  const k = RdSmart.kindOf(delta);
  if ( k == 2 ) {
    return RdPack.apply(base, delta);
  }
  if ( k == 3 ) {
    return RdPng.apply(base, delta);
  }
  return RdDelta.apply(base, delta);
};
RdSmart.exact = function(delta) {
  return RdSmart.kindOf(delta) == 1;
};
export class RdHunk  {
  constructor() {
    this.aStart = 0;
    this.aLen = 0;
    this.bStart = 0;
    this.bLen = 0;
  }
}
export class RdLineDiff  {
  constructor() {
    this.a = [];
    this.b = [];
    this.hunks = [];
    this.added = 0;
    this.removed = 0;
  }
}
export class RdMergeChunk  {
  constructor() {
    this.conflict = false;
    this.lines = [];
    this.base = [];
    this.mine = [];
    this.theirs = [];
  }
}
export class RdMerge  {
  constructor() {
    this.chunks = [];
    this.conflicts = 0;
    this.fromMine = 0;
    this.fromTheirs = 0;
  }
  clean () {
    return this.conflicts == 0;
  };
  text (pick) {
    let out = [];
    // Loop start
    for ( const c of this.chunks) {
      if ( c.conflict == false ) {
        // Loop start
        for ( const l of c.lines) {
          out.push(l);
        }
      } else {
        if ( pick == "mine" || pick == "both" ) {
          if ( pick == "both" ) {
            RdText.appendAll(out, c.mine);
            RdText.appendAll(out, c.theirs);
          } else {
            RdText.appendAll(out, c.mine);
          }
        } else {
          if ( pick == "theirs" ) {
            RdText.appendAll(out, c.theirs);
          } else {
            out.push("<<<<<<< mine");
            RdText.appendAll(out, c.mine);
            out.push("=======");
            RdText.appendAll(out, c.theirs);
            out.push(">>>>>>> theirs");
          }
        }
      }
    }
    return out.join("\n");
  };
  resolve (picks) {
    let out = [];
    let k = 0;
    // Loop start
    for ( const c of this.chunks) {
      if ( c.conflict == false ) {
        RdText.appendAll(out, c.lines);
      } else {
        let pick = "markers";
        if ( k < picks.length ) {
          pick = picks[k];
        }
        k = k + 1;
        if ( pick == "mine" || pick == "both" ) {
          RdText.appendAll(out, c.mine);
        }
        if ( pick == "theirs" || pick == "both" ) {
          RdText.appendAll(out, c.theirs);
        }
        if ( pick == "base" ) {
          RdText.appendAll(out, c.base);
        }
        if ( pick == "markers" ) {
          out.push("<<<<<<< mine");
          RdText.appendAll(out, c.mine);
          out.push("=======");
          RdText.appendAll(out, c.theirs);
          out.push(">>>>>>> theirs");
        }
      }
    }
    return out.join("\n");
  };
}
export class RdText  {
}
RdText.lines = function(s) {
  return s.split("\n");
};
RdText.appendAll = function(out, src) {
  // Loop start
  for ( const l of src) {
    out.push(l);
  }
};
RdText.slice = function(src, start, end) {
  let out = [];
  let i = start;
  while (i < end) {
    out.push(src[i]);
    i = i + 1;
  };
  return out;
};
RdText.intern = function(src, table, out, first) {
  let nextId = first;
  // Loop start
  for ( let i = 0; i < src.length; i++) {
    var l = src[i];
    if ( ( typeof(table[l] ) != "undefined" && Object.prototype.hasOwnProperty.call(table, l) ) ) {
      out[i] = ( Object.prototype.hasOwnProperty.call(table, l) ? table[l] : undefined );
    } else {
      table[l] = nextId;
      out[i] = nextId;
      nextId = nextId + 1;
    }
  }
  return nextId;
};
RdText.diff = function(aText, bText) {
  return RdText.diffLines(RdText.lines(aText), RdText.lines(bText));
};
RdText.diffLines = function(a, b) {
  const res = new RdLineDiff();
  res.a = a;
  res.b = b;
  const n = a.length;
  const m = b.length;
  let table = {};
  const A = new Int32Array(n + 1);
  const B = new Int32Array(m + 1);
  const ids = RdText.intern(a, table, A, 0);
  RdText.intern(b, table, B, ids);
  let p = 0;
  while ((p < n && p < m) && A[p] == B[p]) {
    p = p + 1;
  };
  let s = 0;
  while ((s + p < n && s + p < m) && A[((n - 1) - s)] == B[((m - 1) - s)]) {
    s = s + 1;
  };
  RdText.myers(res, A, B, p, n - s, p, m - s);
  // Loop start
  for ( let i = 0; i < res.hunks.length; i++) {
    var h = res.hunks[i];
    res.added = res.added + h.bLen;
    res.removed = res.removed + h.aLen;
  }
  return res;
};
RdText.myers = function(res, A, B, a0, a1, b0, b1) {
  const N = a1 - a0;
  const M = b1 - b0;
  if ( N == 0 && M == 0 ) {
    return;
  }
  if ( N == 0 || M == 0 ) {
    RdText.addHunk(res, a0, N, b0, M);
    return;
  }
  const MAX = N + M;
  let maxD = MAX;
  if ( maxD > 4000 ) {
    maxD = 4000;
  }
  const off = maxD + 1;
  const width = 2 * maxD + 3;
  let V = new Int32Array(width);
  let trace = [];
  let found = -1;
  let d = 0;
  while (d <= maxD) {
    let snap = new Int32Array(width);
    let q = 0;
    while (q < width) {
      snap[q] = V[q];
      q = q + 1;
    };
    trace.push(snap);
    let k = 0 - d;
    while (k <= d) {
      let x = 0;
      if ( k == 0 - d || k != d && V[((k - 1) + off)] < V[((k + 1) + off)] ) {
        x = V[((k + 1) + off)];
      } else {
        x = V[((k - 1) + off)] + 1;
      }
      let y = x - k;
      while ((x < N && y < M) && A[(a0 + x)] == B[(b0 + y)]) {
        x = x + 1;
        y = y + 1;
      };
      V[k + off] = x;
      if ( x >= N && y >= M ) {
        found = d;
        break;
      }
      k = k + 2;
    };
    if ( found >= 0 ) {
      break;
    }
    d = d + 1;
  };
  if ( found < 0 ) {
    RdText.addHunk(res, a0, N, b0, M);
    return;
  }
  let xs = [];
  let ys = [];
  let kinds = [];
  let x2 = N;
  let y2 = M;
  let dd = found;
  while (dd > 0) {
    const Vd = trace[dd];
    const k2 = x2 - y2;
    let prevK = 0;
    if ( k2 == 0 - dd || k2 != dd && Vd[((k2 - 1) + off)] < Vd[((k2 + 1) + off)] ) {
      prevK = k2 + 1;
    } else {
      prevK = k2 - 1;
    }
    const prevX = Vd[(prevK + off)];
    const prevY = prevX - prevK;
    while (x2 > prevX && y2 > prevY) {
      x2 = x2 - 1;
      y2 = y2 - 1;
    };
    if ( prevK == k2 + 1 ) {
      kinds.push(1);
      xs.push(prevX);
      ys.push(prevY);
    } else {
      kinds.push(0);
      xs.push(prevX);
      ys.push(prevY);
    }
    x2 = prevX;
    y2 = prevY;
    dd = dd - 1;
  };
  const cnt = kinds.length;
  let i = cnt - 1;
  while (i >= 0) {
    const ex = xs[i];
    const ey = ys[i];
    if ( kinds[i] == 1 ) {
      RdText.addHunk(res, a0 + ex, 0, b0 + ey, 1);
    } else {
      RdText.addHunk(res, a0 + ex, 1, b0 + ey, 0);
    }
    i = i - 1;
  };
};
RdText.addHunk = function(res, aStart, aLen, bStart, bLen) {
  const n = res.hunks.length;
  if ( n > 0 ) {
    const last = res.hunks[(n - 1)];
    if ( last.aStart + last.aLen == aStart && last.bStart + last.bLen == bStart ) {
      last.aLen = last.aLen + aLen;
      last.bLen = last.bLen + bLen;
      return;
    }
  }
  const h = new RdHunk();
  h.aStart = aStart;
  h.aLen = aLen;
  h.bStart = bStart;
  h.bLen = bLen;
  res.hunks.push(h);
};
RdText.unified = function(d, context) {
  let out = [];
  const n = d.hunks.length;
  let i = 0;
  while (i < n) {
    const first = d.hunks[i];
    let j = i;
    while (j + 1 < n) {
      const cur = d.hunks[j];
      const nxt = d.hunks[(j + 1)];
      if ( nxt.aStart - (cur.aStart + cur.aLen) > context * 2 ) {
        break;
      }
      j = j + 1;
    };
    const lastH = d.hunks[j];
    let aFrom = first.aStart - context;
    if ( aFrom < 0 ) {
      aFrom = 0;
    }
    let aTo = (lastH.aStart + lastH.aLen) + context;
    if ( aTo > d.a.length ) {
      aTo = d.a.length;
    }
    const bFrom = first.bStart - (first.aStart - aFrom);
    const bTo = (lastH.bStart + lastH.bLen) + (aTo - (lastH.aStart + lastH.aLen));
    let hdr = "@@ -" + ((aFrom + 1).toString());
    hdr = (hdr + ",") + ((aTo - aFrom).toString());
    hdr = (hdr + " +") + ((bFrom + 1).toString());
    hdr = (hdr + ",") + ((bTo - bFrom).toString());
    out.push(hdr + " @@");
    let pos = aFrom;
    let k = i;
    while (k <= j) {
      const h = d.hunks[k];
      while (pos < h.aStart) {
        out.push(" " + d.a[pos]);
        pos = pos + 1;
      };
      let q = 0;
      while (q < h.aLen) {
        out.push("-" + d.a[(h.aStart + q)]);
        q = q + 1;
      };
      q = 0;
      while (q < h.bLen) {
        out.push("+" + d.b[(h.bStart + q)]);
        q = q + 1;
      };
      pos = h.aStart + h.aLen;
      k = k + 1;
    };
    while (pos < aTo) {
      out.push(" " + d.a[pos]);
      pos = pos + 1;
    };
    i = j + 1;
  };
  return out.join("\n");
};
RdText.merge3 = function(baseText, mineText, theirsText) {
  const base = RdText.lines(baseText);
  const mine = RdText.lines(mineText);
  const theirs = RdText.lines(theirsText);
  const dm = RdText.diffLines(base, mine);
  const dt = RdText.diffLines(base, theirs);
  const res = new RdMerge();
  let im = 0;
  let it = 0;
  const nm = dm.hunks.length;
  const nt = dt.hunks.length;
  let shiftM = 0;
  let shiftT = 0;
  let pos = 0;
  let clean = [];
  while (im < nm || it < nt) {
    let gStart = 0;
    let takeMine = false;
    if ( im < nm ) {
      takeMine = true;
      if ( it < nt ) {
        const hm0 = dm.hunks[im];
        const ht0 = dt.hunks[it];
        if ( ht0.aStart < hm0.aStart ) {
          takeMine = false;
        }
      }
    }
    if ( takeMine ) {
      const g1 = dm.hunks[im];
      gStart = g1.aStart;
    } else {
      const g2 = dt.hunks[it];
      gStart = g2.aStart;
    }
    while (pos < gStart) {
      clean.push(base[pos]);
      pos = pos + 1;
    };
    let gEnd = gStart;
    let jm = im;
    let jt = it;
    let usedM = false;
    let usedT = false;
    if ( takeMine ) {
      const hm1 = dm.hunks[im];
      gEnd = hm1.aStart + hm1.aLen;
      jm = jm + 1;
      usedM = true;
    } else {
      const ht1 = dt.hunks[it];
      gEnd = ht1.aStart + ht1.aLen;
      jt = jt + 1;
      usedT = true;
    }
    let grow = true;
    while (grow) {
      grow = false;
      if ( jm < nm ) {
        const hm = dm.hunks[jm];
        if ( hm.aStart < gEnd || hm.aStart == gStart ) {
          if ( hm.aStart + hm.aLen > gEnd ) {
            gEnd = hm.aStart + hm.aLen;
          }
          jm = jm + 1;
          usedM = true;
          grow = true;
        }
      }
      if ( jt < nt ) {
        const ht = dt.hunks[jt];
        if ( ht.aStart < gEnd || ht.aStart == gStart ) {
          if ( ht.aStart + ht.aLen > gEnd ) {
            gEnd = ht.aStart + ht.aLen;
          }
          jt = jt + 1;
          usedT = true;
          grow = true;
        }
      }
    };
    const mFrom = gStart + shiftM;
    const tFrom = gStart + shiftT;
    let q = im;
    while (q < jm) {
      const h = dm.hunks[q];
      shiftM = shiftM + (h.bLen - h.aLen);
      q = q + 1;
    };
    q = it;
    while (q < jt) {
      const h2 = dt.hunks[q];
      shiftT = shiftT + (h2.bLen - h2.aLen);
      q = q + 1;
    };
    const mPart = RdText.slice(mine, mFrom, (gEnd + shiftM));
    const tPart = RdText.slice(theirs, tFrom, (gEnd + shiftT));
    if ( usedM && usedT == false ) {
      RdText.appendAll(clean, mPart);
      res.fromMine = res.fromMine + 1;
    } else {
      if ( usedT && usedM == false ) {
        RdText.appendAll(clean, tPart);
        res.fromTheirs = res.fromTheirs + 1;
      } else {
        if ( mPart.join("\n") == tPart.join("\n") ) {
          if ( mPart.length == tPart.length ) {
            RdText.appendAll(clean, mPart);
          } else {
            RdText.conflictChunk(
              res,
              clean,
              RdText.slice(base, gStart, gEnd),
              mPart,
              tPart
            );
            clean = RdText.emptyList();
          }
        } else {
          RdText.conflictChunk(
            res,
            clean,
            RdText.slice(base, gStart, gEnd),
            mPart,
            tPart
          );
          clean = RdText.emptyList();
        }
      }
    }
    pos = gEnd;
    im = jm;
    it = jt;
  };
  while (pos < base.length) {
    clean.push(base[pos]);
    pos = pos + 1;
  };
  const tail = new RdMergeChunk();
  tail.lines = clean;
  res.chunks.push(tail);
  return res;
};
RdText.emptyList = function() {
  let out = [];
  return out;
};
RdText.conflictChunk = function(res, clean, b, m, t) {
  const before = new RdMergeChunk();
  before.lines = clean;
  res.chunks.push(before);
  const c = new RdMergeChunk();
  c.conflict = true;
  c.base = b;
  c.mine = m;
  c.theirs = t;
  res.chunks.push(c);
  res.conflicts = res.conflicts + 1;
};
export class RdEntry  {
  constructor() {
    this.path = "";
    this.blob = "";
    this.size = 0;
    this.recipe = "";
  }
}
export class RdTree  {
  constructor() {
    this.entries = [];
  }
  find (path) {
    let found;
    // Loop start
    for ( const e of this.entries) {
      if ( e.path == path ) {
        found = e;
        break;
      }
    }
    return found;
  };
  text () {
    let lines = [];
    // Loop start
    for ( const e of this.entries) {
      let l = (((e.path + "\t") + e.blob) + "\t") + ((e.size).toString());
      if ( e.recipe.length > 0 ) {
        l = (l + "\t") + e.recipe;
      }
      lines.push(l);
    }
    return lines.join("\n");
  };
}
RdTree.parse = function(s) {
  const t = new RdTree();
  if ( s.length == 0 ) {
    return t;
  }
  const lines = s.split("\n");
  // Loop start
  for ( const l of lines) {
    const f = l.split("\t");
    if ( f.length >= 3 ) {
      const e = new RdEntry();
      e.path = f[0];
      e.blob = f[1];
      e.size = RdRepo.toInt(f[2]);
      if ( f.length >= 4 ) {
        const rest = RdText.slice(f, 3, f.length);
        e.recipe = rest.join("\t");
      }
      t.entries.push(e);
    }
  }
  return t;
};
export class RdCommit  {
  constructor() {
    this.id = "";
    this.tree = "";
    this.parents = [];
    this.author = "";
    this.device = "";
    this.time = "";
    this.message = "";
  }
  text () {
    let lines = [];
    lines.push("tree " + this.tree);
    // Loop start
    for ( const p of this.parents) {
      lines.push("parent " + p);
    }
    lines.push("author " + this.author);
    lines.push("device " + this.device);
    lines.push("time " + this.time);
    lines.push("");
    lines.push(this.message);
    return lines.join("\n");
  };
}
RdCommit.parse = function(id, s) {
  const c = new RdCommit();
  c.id = id;
  const lines = s.split("\n");
  let i = 0;
  const n = lines.length;
  while (i < n) {
    const l = lines[i];
    if ( l.length == 0 ) {
      const rest = RdText.slice(lines, (i + 1), n);
      c.message = rest.join("\n");
      break;
    }
    const sp = l.indexOf(" ");
    const key = l.substring(0, sp );
    const val = l.substring(sp + 1, l.length );
    if ( key == "tree" ) {
      c.tree = val;
    }
    if ( key == "parent" ) {
      c.parents.push(val);
    }
    if ( key == "author" ) {
      c.author = val;
    }
    if ( key == "device" ) {
      c.device = val;
    }
    if ( key == "time" ) {
      c.time = val;
    }
    i = i + 1;
  };
  return c;
};
export class RdStored  {
  constructor() {
    this.id = "";
    this.kind = 0;
    this.base = "";
    this.data = (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    this.depth = 0;
  }
  encode () {
    const w = new RdWriter();
    w.byte(82);
    w.byte(79);
    w.byte(1);
    w.byte(this.kind);
    w.text(this.id);
    w.text(this.base);
    w.varint(this.depth);
    w.varint(this.data.byteLength);
    w.all(this.data);
    return w.toBuffer();
  };
}
RdStored.decode = function(b) {
  let none;
  const rd = new RdReader(b);
  if ( rd.byte() != 82 ) {
    return none;
  }
  if ( rd.byte() != 79 ) {
    return none;
  }
  if ( rd.byte() != 1 ) {
    return none;
  }
  const s = new RdStored();
  s.kind = rd.byte();
  s.id = rd.text();
  s.base = rd.text();
  s.depth = rd.varint();
  const n = rd.varint();
  s.data = rd.bytes(n);
  if ( rd.failed ) {
    return none;
  }
  const out = s;
  return out;
};
export class RdFileChange  {
  constructor() {
    this.path = "";
    this.kind = "";
    this.oldBlob = "";
    this.newBlob = "";
    this.oldSize = 0;
    this.newSize = 0;
    this.oldRecipe = "";
    this.newRecipe = "";
    this.added = 0;
    this.removed = 0;
  }
}
export class RdFileMerge  {
  constructor() {
    this.path = "";
    this.result = "";
    this.text = false;
    this.merge = undefined;
    this.entry = undefined;
    this.mine = undefined;
    this.theirs = undefined;
  }
}
export class RdRepoMerge  {
  constructor() {
    this.base = "";
    this.mine = "";
    this.theirs = "";
    this.files = [];
    this.conflicts = 0;
  }
}
export class RdRepo  {
  constructor() {
    this.objects = {};
    this.dirty = [];
    this.maxChain = 16;
  }
  has (id) {
    return ( typeof(this.objects[id] ) != "undefined" && Object.prototype.hasOwnProperty.call(this.objects, id) );
  };
  put (s) {
    this.objects[s.id] = s;
    this.dirty.push(s.id);
  };
  load (bytes) {
    const s = RdStored.decode(bytes);
    if ( typeof(s) === "undefined" ) {
      return false;
    }
    const st = s;
    this.objects[st.id] = st;
    return true;
  };
  stored (id) {
    if ( ( typeof(this.objects[id] ) != "undefined" && Object.prototype.hasOwnProperty.call(this.objects, id) ) ) {
      const s = ( Object.prototype.hasOwnProperty.call(this.objects, id) ? this.objects[id] : undefined );
      return s.encode();
    }
    return (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
  };
  takeDirty () {
    let out = [];
    let seen = {};
    // Loop start
    for ( const id of this.dirty) {
      if ( ( typeof(seen[id] ) != "undefined" && Object.prototype.hasOwnProperty.call(seen, id) ) == false ) {
        seen[id] = true;
        out.push(id);
      }
    }
    let empty = [];
    this.dirty = empty;
    return out;
  };
  read (id) {
    return this.readAt(id, 0);
  };
  readAt (id, depth) {
    if ( ( typeof(this.objects[id] ) != "undefined" && Object.prototype.hasOwnProperty.call(this.objects, id) ) == false || depth > 64 ) {
      return (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    }
    const s = ( Object.prototype.hasOwnProperty.call(this.objects, id) ? this.objects[id] : undefined );
    if ( s.kind == 0 ) {
      return s.data;
    }
    const baseBytes = this.readAt(s.base, (depth + 1));
    const r = RdSmart.apply(baseBytes, s.data);
    return r.data;
  };
  readText (id) {
    return RdBytes.toText(this.read(id));
  };
  putBlob (data) {
    const id = RdSha256.hash(data);
    if ( ( typeof(this.objects[id] ) != "undefined" && Object.prototype.hasOwnProperty.call(this.objects, id) ) == false ) {
      const s = new RdStored();
      s.id = id;
      s.data = data;
      this.put(s);
    }
    return id;
  };
  putBlobId (id, data) {
    if ( ( typeof(this.objects[id] ) != "undefined" && Object.prototype.hasOwnProperty.call(this.objects, id) ) == false ) {
      const s = new RdStored();
      s.id = id;
      s.data = data;
      this.put(s);
    }
    return id;
  };
  putText (s) {
    return this.putBlob(RdBytes.fromText(s));
  };
  deltify (oldId, newId) {
    if ( oldId == newId || (( typeof(this.objects[oldId] ) != "undefined" && Object.prototype.hasOwnProperty.call(this.objects, oldId) ) == false || ( typeof(this.objects[newId] ) != "undefined" && Object.prototype.hasOwnProperty.call(this.objects, newId) ) == false) ) {
      return;
    }
    const old = ( Object.prototype.hasOwnProperty.call(this.objects, oldId) ? this.objects[oldId] : undefined );
    const nw = ( Object.prototype.hasOwnProperty.call(this.objects, newId) ? this.objects[newId] : undefined );
    if ( old.kind != 0 ) {
      return;
    }
    if ( nw.depth >= this.maxChain ) {
      return;
    }
    let cur = nw;
    let steps = 0;
    while (cur.kind == 1 && steps <= this.maxChain) {
      if ( cur.base == oldId ) {
        return;
      }
      if ( ( typeof(this.objects[cur.base] ) != "undefined" && Object.prototype.hasOwnProperty.call(this.objects, cur.base) ) == false ) {
        return;
      }
      cur = ( Object.prototype.hasOwnProperty.call(this.objects, cur.base) ? this.objects[cur.base] : undefined );
      steps = steps + 1;
    };
    const oldBytes = old.data;
    const newBytes = this.read(newId);
    let d = RdSmart.diff(newBytes, oldBytes);
    if ( RdSmart.exact(d) == false ) {
      const r = RdSmart.apply(newBytes, d);
      if ( RdBytes.equal(r.data, oldBytes) == false ) {
        d = RdDelta.diff(newBytes, oldBytes);
      }
    }
    if ( d.byteLength * 5 >= oldBytes.byteLength * 4 ) {
      return;
    }
    const s = new RdStored();
    s.id = oldId;
    s.kind = 1;
    s.base = newId;
    s.depth = nw.depth + 1;
    s.data = d;
    this.put(s);
  };
  tree (id) {
    return RdTree.parse(this.readText(id));
  };
  commit (id) {
    let none;
    if ( ( typeof(this.objects[id] ) != "undefined" && Object.prototype.hasOwnProperty.call(this.objects, id) ) == false ) {
      return none;
    }
    const c = RdCommit.parse(id, this.readText(id));
    return c;
  };
  commitTree (t, parents, author, device, time, message) {
    const sorted = new RdTree();
    let paths = [];
    // Loop start
    for ( const e of t.entries) {
      paths.push(e.path);
    }
    const sortedPaths = RdRepo.sortStrings(paths);
    // Loop start
    for ( const p of sortedPaths) {
      const e2 = t.find(p);
      if ( (typeof(e2) !== "undefined" && e2 != null )  ) {
        sorted.entries.push(e2);
      }
    }
    const treeId = this.putText(sorted.text());
    const c = new RdCommit();
    c.tree = treeId;
    c.parents = parents;
    c.author = author;
    c.device = device;
    c.time = time;
    c.message = message;
    const id = this.putText(c.text());
    // Loop start
    for ( const pid of parents) {
      const pc = this.commit(pid);
      if ( (typeof(pc) !== "undefined" && pc != null )  ) {
        const pcv = pc;
        const pt = this.tree(pcv.tree);
        // Loop start
        for ( const ne of sorted.entries) {
          const oe = pt.find(ne.path);
          if ( (typeof(oe) !== "undefined" && oe != null )  ) {
            const o = oe;
            if ( o.blob != ne.blob ) {
              this.deltify(o.blob, ne.blob);
            }
          }
        }
      }
    }
    return id;
  };
  entryOf (path, data, recipe) {
    const e = new RdEntry();
    e.path = path;
    e.blob = this.putBlob(data);
    e.size = data.byteLength;
    e.recipe = recipe;
    return e;
  };
  log (head, limit) {
    let out = [];
    let seen = {};
    let queue = [];
    queue.push(head);
    while (queue.length > 0 && out.length < limit) {
      let bestI = 0;
      let bestC;
      let qi = 0;
      let bestTime = "";
      while (qi < queue.length) {
        const cid = queue[qi];
        const cc = this.commit(cid);
        if ( (typeof(cc) !== "undefined" && cc != null )  ) {
          const ccv = cc;
          if ( (typeof(bestC) === "undefined") || RdRepo.cmp(ccv.time, bestTime) > 0 ) {
            bestC = ccv;
            bestTime = ccv.time;
            bestI = qi;
          }
        }
        qi = qi + 1;
      };
      if ( typeof(bestC) === "undefined" ) {
        break;
      }
      const c = bestC;
      queue.splice(bestI, 1).pop();
      if ( ( typeof(seen[c.id] ) != "undefined" && Object.prototype.hasOwnProperty.call(seen, c.id) ) == false ) {
        seen[c.id] = true;
        out.push(c);
        // Loop start
        for ( const p of c.parents) {
          if ( ( typeof(seen[p] ) != "undefined" && Object.prototype.hasOwnProperty.call(seen, p) ) == false ) {
            queue.push(p);
          }
        }
      }
    };
    return out;
  };
  ancestors (head) {
    let seen = {};
    let stack = [];
    stack.push(head);
    while (stack.length > 0) {
      const id = stack[(stack.length - 1)];
      stack.splice(stack.length - 1, 1).pop();
      if ( ( typeof(seen[id] ) != "undefined" && Object.prototype.hasOwnProperty.call(seen, id) ) == false ) {
        seen[id] = true;
        const c = this.commit(id);
        if ( (typeof(c) !== "undefined" && c != null )  ) {
          const cpv = c;
          // Loop start
          for ( const p of cpv.parents) {
            stack.push(p);
          }
        }
      }
    };
    return seen;
  };
  isAncestor (a, b) {
    const anc = this.ancestors(b);
    return ( typeof(anc[a] ) != "undefined" && Object.prototype.hasOwnProperty.call(anc, a) );
  };
  mergeBase (a, b) {
    const anc = this.ancestors(a);
    let best = "";
    let bestTime = "";
    let seen = {};
    let stack = [];
    stack.push(b);
    while (stack.length > 0) {
      const id = stack[(stack.length - 1)];
      stack.splice(stack.length - 1, 1).pop();
      if ( ( typeof(seen[id] ) != "undefined" && Object.prototype.hasOwnProperty.call(seen, id) ) == false ) {
        seen[id] = true;
        const c = this.commit(id);
        if ( (typeof(c) !== "undefined" && c != null )  ) {
          const cv = c;
          if ( ( typeof(anc[id] ) != "undefined" && Object.prototype.hasOwnProperty.call(anc, id) ) ) {
            if ( best.length == 0 || RdRepo.cmp(cv.time, bestTime) > 0 ) {
              best = id;
              bestTime = cv.time;
            }
          } else {
            // Loop start
            for ( const p of cv.parents) {
              stack.push(p);
            }
          }
        }
      }
    };
    return best;
  };
  diffTrees (aId, bId) {
    const a = this.tree(aId);
    const b = this.tree(bId);
    let out = [];
    // Loop start
    for ( const nb of b.entries) {
      const oa = a.find(nb.path);
      if ( typeof(oa) === "undefined" ) {
        const c = new RdFileChange();
        c.path = nb.path;
        c.kind = "added";
        c.newBlob = nb.blob;
        c.newSize = nb.size;
        c.newRecipe = nb.recipe;
        out.push(c);
      } else {
        const o = oa;
        if ( o.blob != nb.blob || o.recipe != nb.recipe ) {
          const c2 = new RdFileChange();
          c2.path = nb.path;
          c2.kind = "changed";
          if ( o.blob == nb.blob ) {
            c2.kind = "recipe";
          }
          c2.oldBlob = o.blob;
          c2.newBlob = nb.blob;
          c2.oldSize = o.size;
          c2.newSize = nb.size;
          c2.oldRecipe = o.recipe;
          c2.newRecipe = nb.recipe;
          if ( o.blob != nb.blob && RdRepo.isTextPath(nb.path) ) {
            const ld = RdText.diff(this.readText(o.blob), this.readText(nb.blob));
            c2.added = ld.added;
            c2.removed = ld.removed;
          }
          out.push(c2);
        }
      }
    }
    // Loop start
    for ( const oe of a.entries) {
      const nbe = b.find(oe.path);
      if ( typeof(nbe) === "undefined" ) {
        const c3 = new RdFileChange();
        c3.path = oe.path;
        c3.kind = "removed";
        c3.oldBlob = oe.blob;
        c3.oldSize = oe.size;
        c3.oldRecipe = oe.recipe;
        out.push(c3);
      }
    }
    return out;
  };
  diffCommits (a, b) {
    const ca = this.commit(a);
    const cb = this.commit(b);
    let empty = [];
    if ( (typeof(ca) === "undefined") || (typeof(cb) === "undefined") ) {
      return empty;
    }
    const cav = ca;
    const cbv = cb;
    return this.diffTrees(cav.tree, cbv.tree);
  };
  diffText (a, b, path, context) {
    const oldText = this.fileText(a, path);
    const newText = this.fileText(b, path);
    return RdText.unified(RdText.diff(oldText, newText), context);
  };
  fileText (commitId, path) {
    const c = this.commit(commitId);
    if ( typeof(c) === "undefined" ) {
      return "";
    }
    const cv = c;
    const t = this.tree(cv.tree);
    const e = t.find(path);
    if ( typeof(e) === "undefined" ) {
      return "";
    }
    return this.readText(RdRepo.blobOf(e));
  };
  fileBytes (commitId, path) {
    const c = this.commit(commitId);
    if ( typeof(c) === "undefined" ) {
      return (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    }
    const cv = c;
    const t = this.tree(cv.tree);
    const e = t.find(path);
    if ( typeof(e) === "undefined" ) {
      return (function(b){ return Object.assign(b, { _view: new DataView(b) }); })(new ArrayBuffer(0));
    }
    return this.read(RdRepo.blobOf(e));
  };
  merge (mine, theirs) {
    const res = new RdRepoMerge();
    res.mine = mine;
    res.theirs = theirs;
    res.base = this.mergeBase(mine, theirs);
    let bt = new RdTree();
    if ( res.base.length > 0 ) {
      const bc = this.commit(res.base);
      if ( (typeof(bc) !== "undefined" && bc != null )  ) {
        const bcv = bc;
        bt = this.tree(bcv.tree);
      }
    }
    const mt = this.treeOf(mine);
    const tt = this.treeOf(theirs);
    let paths = [];
    let seen = {};
    // Loop start
    for ( const e1 of mt.entries) {
      if ( ( typeof(seen[e1.path] ) != "undefined" && Object.prototype.hasOwnProperty.call(seen, e1.path) ) == false ) {
        seen[e1.path] = true;
        paths.push(e1.path);
      }
    }
    // Loop start
    for ( const e2 of tt.entries) {
      if ( ( typeof(seen[e2.path] ) != "undefined" && Object.prototype.hasOwnProperty.call(seen, e2.path) ) == false ) {
        seen[e2.path] = true;
        paths.push(e2.path);
      }
    }
    // Loop start
    for ( const e3 of bt.entries) {
      if ( ( typeof(seen[e3.path] ) != "undefined" && Object.prototype.hasOwnProperty.call(seen, e3.path) ) == false ) {
        seen[e3.path] = true;
        paths.push(e3.path);
      }
    }
    const sortedPaths = RdRepo.sortStrings(paths);
    // Loop start
    for ( const p of sortedPaths) {
      const b = bt.find(p);
      const m = mt.find(p);
      const t = tt.find(p);
      const f = new RdFileMerge();
      f.path = p;
      f.mine = m;
      f.theirs = t;
      if ( RdRepo.sameEntry(m, t) ) {
        f.result = "same";
        f.entry = m;
      } else {
        if ( RdRepo.sameEntry(b, t) ) {
          f.result = "mine";
          f.entry = m;
        } else {
          if ( RdRepo.sameEntry(b, m) ) {
            f.result = "theirs";
            f.entry = t;
          } else {
            f.result = "conflict";
            if ( ((((typeof(m) !== "undefined" && m != null ) ) && ((typeof(t) !== "undefined" && t != null ) )) && RdRepo.isTextPath(p)) && RdRepo.recipeOf(m) == RdRepo.recipeOf(t) ) {
              let baseText = "";
              if ( (typeof(b) !== "undefined" && b != null )  ) {
                baseText = this.readText(RdRepo.blobOf(b));
              }
              const mm = RdText.merge3(
                baseText,
                this.readText(RdRepo.blobOf(m)),
                this.readText(RdRepo.blobOf(t))
              );
              f.text = true;
              f.merge = mm;
              if ( mm.clean() ) {
                f.result = "merged";
                const ne = this.entryOf(
                  p,
                  RdBytes.fromText(mm.text("markers")),
                  RdRepo.recipeOf(m)
                );
                f.entry = ne;
              }
            }
          }
        }
      }
      if ( f.result == "conflict" ) {
        res.conflicts = res.conflicts + 1;
      }
      res.files.push(f);
    }
    return res;
  };
  mergedTree (res, picks) {
    const t = new RdTree();
    let k = 0;
    // Loop start
    for ( const f of res.files) {
      if ( f.result != "conflict" ) {
        if ( (typeof(f.entry) !== "undefined" && f.entry != null )  ) {
          t.entries.push(f.entry);
        }
      } else {
        let pick = "mine";
        if ( k < picks.length ) {
          pick = picks[k];
        }
        k = k + 1;
        if ( pick == "theirs" ) {
          if ( (typeof(f.theirs) !== "undefined" && f.theirs != null )  ) {
            t.entries.push(f.theirs);
          }
        } else {
          if ( pick == "mine" || f.text == false ) {
            if ( (typeof(f.mine) !== "undefined" && f.mine != null )  ) {
              t.entries.push(f.mine);
            }
          } else {
            const mm = f.merge;
            const regionPicks = pick.split(",");
            const txt = mm.resolve(regionPicks);
            t.entries.push(this.entryOf(
              f.path,
              RdBytes.fromText(txt),
              RdRepo.recipeOf(f.mine)
            ));
          }
        }
      }
    }
    return t;
  };
  storedBytes () {
    let total = 0;
    const keys = Object.keys(this.objects);
    // Loop start
    for ( const id of keys) {
      const s = ( Object.prototype.hasOwnProperty.call(this.objects, id) ? this.objects[id] : undefined );
      total = total + s.data.byteLength;
    }
    return total;
  };
  treeOf (commitId) {
    const c = this.commit(commitId);
    if ( typeof(c) === "undefined" ) {
      return new RdTree();
    }
    const cv = c;
    return this.tree(cv.tree);
  };
}
RdRepo.isTextPath = function(path) {
  const exts = [".md", ".markdown", ".txt", ".css", ".json", ".csv", ".tsv", ".svg", ".html", ".xml", ".yaml", ".yml", ".js", ".rgr"];
  const lower = path.toLowerCase();
  // Loop start
  for ( const e of exts) {
    const n = lower.length;
    const m = e.length;
    if ( n >= m ) {
      if ( lower.substring(n - m, n ) == e ) {
        return true;
      }
    }
  }
  return false;
};
RdRepo.sameEntry = function(a, b) {
  if ( (typeof(a) === "undefined") && (typeof(b) === "undefined") ) {
    return true;
  }
  if ( (typeof(a) === "undefined") || (typeof(b) === "undefined") ) {
    return false;
  }
  const x = a;
  const y = b;
  return x.blob == y.blob && x.recipe == y.recipe;
};
RdRepo.blobOf = function(e) {
  if ( typeof(e) === "undefined" ) {
    return "";
  }
  const v = e;
  return v.blob;
};
RdRepo.recipeOf = function(e) {
  if ( typeof(e) === "undefined" ) {
    return "";
  }
  const v = e;
  return v.recipe;
};
RdRepo.toInt = function(s) {
  let v = 0;
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s.charCodeAt(i );
    if ( c >= 48 && c <= 57 ) {
      v = v * 10 + (c - 48);
    }
    i = i + 1;
  };
  return v;
};
RdRepo.cmp = function(a, b) {
  const na = a.length;
  const nb = b.length;
  let i = 0;
  while (i < na && i < nb) {
    const ca = a.charCodeAt(i );
    const cb = b.charCodeAt(i );
    if ( ca != cb ) {
      return ca - cb;
    }
    i = i + 1;
  };
  return na - nb;
};
RdRepo.sortStrings = function(list) {
  let out = [];
  // Loop start
  for ( const s of list) {
    out.push(s);
  }
  const n = out.length;
  let k = 1;
  while (k < n) {
    const cur = out[k];
    let j = k - 1;
    while (j >= 0 && RdRepo.cmp(out[j], cur) > 0) {
      out[j + 1] = out[j];
      j = j - 1;
    };
    out[j + 1] = cur;
    k = k + 1;
  };
  return out;
};
export class RdOtOp  {
  constructor() {
    this.kind = 0;
    this.n = 0;
    this.text = "";
  }
  len () {
    if ( this.kind == 2 ) {
      return this.text.length;
    }
    return this.n;
  };
}
RdOtOp.make = function(kind, n, text) {
  const o = new RdOtOp();
  o.kind = kind;
  o.n = n;
  o.text = text;
  return o;
};
export class RdOtPair  {
  constructor() {
    this.a = new RdOtDelta();
    this.b = new RdOtDelta();
  }
}
export class RdOtDelta  {
  constructor() {
    this.ops = [];
    this.baseLength = 0;
    this.targetLength = 0;
  }
  retain (n) {
    if ( n <= 0 ) {
      return this;
    }
    this.baseLength = this.baseLength + n;
    this.targetLength = this.targetLength + n;
    const c = this.ops.length;
    if ( c > 0 ) {
      const last = this.ops[(c - 1)];
      if ( last.kind == 1 ) {
        last.n = last.n + n;
        return this;
      }
    }
    this.ops.push(RdOtOp.make(1, n, ""));
    return this;
  };
  insert (s) {
    if ( s.length == 0 ) {
      return this;
    }
    this.targetLength = this.targetLength + s.length;
    const c = this.ops.length;
    if ( c > 0 ) {
      const last = this.ops[(c - 1)];
      if ( last.kind == 2 ) {
        last.text = last.text + s;
        return this;
      }
      if ( last.kind == 3 ) {
        if ( c > 1 ) {
          const prev = this.ops[(c - 2)];
          if ( prev.kind == 2 ) {
            prev.text = prev.text + s;
            return this;
          }
        }
        const del = this.ops[(c - 1)];
        this.ops.splice(c - 1, 1).pop();
        this.ops.push(RdOtOp.make(2, 0, s));
        this.ops.push(del);
        return this;
      }
    }
    this.ops.push(RdOtOp.make(2, 0, s));
    return this;
  };
  delete (n) {
    if ( n <= 0 ) {
      return this;
    }
    this.baseLength = this.baseLength + n;
    const c = this.ops.length;
    if ( c > 0 ) {
      const last = this.ops[(c - 1)];
      if ( last.kind == 3 ) {
        last.n = last.n + n;
        return this;
      }
    }
    this.ops.push(RdOtOp.make(3, n, ""));
    return this;
  };
  add (o) {
    if ( o.kind == 1 ) {
      this.retain(o.n);
    }
    if ( o.kind == 2 ) {
      this.insert(o.text);
    }
    if ( o.kind == 3 ) {
      this.delete(o.n);
    }
  };
  padTo (__len) {
    if ( this.baseLength < __len ) {
      this.retain(__len - this.baseLength);
    }
    return this;
  };
  isNoop () {
    // Loop start
    for ( const o of this.ops) {
      if ( o.kind != 1 ) {
        return false;
      }
    }
    return true;
  };
  copy () {
    const d = new RdOtDelta();
    // Loop start
    for ( const o of this.ops) {
      d.add(o);
    }
    return d;
  };
  equals (other) {
    const a = this.copy();
    const b = other.copy();
    a.trimRetain();
    b.trimRetain();
    if ( a.ops.length != b.ops.length ) {
      return false;
    }
    let i = 0;
    while (i < a.ops.length) {
      const x = a.ops[i];
      const y = b.ops[i];
      if ( (x.kind != y.kind || x.n != y.n) || x.text != y.text ) {
        return false;
      }
      i = i + 1;
    };
    return true;
  };
  trimRetain () {
    const c = this.ops.length;
    if ( c > 0 ) {
      const last = this.ops[(c - 1)];
      if ( last.kind == 1 ) {
        this.baseLength = this.baseLength - last.n;
        this.targetLength = this.targetLength - last.n;
        this.ops.splice(c - 1, 1).pop();
      }
    }
  };
  apply (s) {
    const r = this.tryApply(s);
    return r.text;
  };
  tryApply (s) {
    const r = new RdOtApplied();
    const n = s.length;
    if ( this.baseLength > n ) {
      r.ok = false;
      r.error = "the delta is for a longer text";
      return r;
    }
    let parts = [];
    let pos = 0;
    // Loop start
    for ( const o of this.ops) {
      if ( o.kind == 1 ) {
        parts.push(s.substring(pos, pos + o.n ));
        pos = pos + o.n;
      }
      if ( o.kind == 2 ) {
        parts.push(o.text);
      }
      if ( o.kind == 3 ) {
        pos = pos + o.n;
      }
    }
    parts.push(s.substring(pos, n ));
    r.text = parts.join("");
    return r;
  };
  invert (base) {
    const d = new RdOtDelta();
    let pos = 0;
    // Loop start
    for ( const o of this.ops) {
      if ( o.kind == 1 ) {
        d.retain(o.n);
        pos = pos + o.n;
      }
      if ( o.kind == 2 ) {
        d.delete(o.text.length);
      }
      if ( o.kind == 3 ) {
        d.insert(base.substring(pos, pos + o.n ));
        pos = pos + o.n;
      }
    }
    return d;
  };
  compose (b) {
    const a = this.copy();
    const bb = b.copy();
    if ( a.targetLength < bb.baseLength ) {
      a.retain(bb.baseLength - a.targetLength);
    }
    bb.padTo(a.targetLength);
    const out = new RdOtDelta();
    const ra = new RdOtReader(a);
    const rb = new RdOtReader(bb);
    while (ra.more() || rb.more()) {
      if ( ra.kind() == 3 ) {
        const da = ra.take(ra.left());
        out.delete(da.n);
        continue;
      }
      if ( rb.kind() == 2 ) {
        const ib = rb.take(rb.left());
        out.insert(ib.text);
        continue;
      }
      if ( ra.more() == false || rb.more() == false ) {
        return out;
      }
      let n = ra.left();
      if ( rb.left() < n ) {
        n = rb.left();
      }
      const x = ra.take(n);
      const y = rb.take(n);
      if ( x.kind == 1 ) {
        if ( y.kind == 1 ) {
          out.retain(n);
        } else {
          out.delete(n);
        }
      } else {
        if ( y.kind == 1 ) {
          out.insert(x.text);
        }
      }
    };
    return out;
  };
  transformIndex (at, after) {
    let pos = 0;
    let out = at;
    // Loop start
    for ( const o of this.ops) {
      if ( pos > at ) {
        return out;
      }
      if ( o.kind == 1 ) {
        pos = pos + o.n;
      }
      if ( o.kind == 2 ) {
        if ( pos < at || pos == at && after ) {
          out = out + o.text.length;
        }
      }
      if ( o.kind == 3 ) {
        if ( pos < at ) {
          let gone = o.n;
          if ( at - pos < gone ) {
            gone = at - pos;
          }
          out = out - gone;
        }
        pos = pos + o.n;
      }
    }
    return out;
  };
  toJson () {
    let parts = [];
    const c = this.ops.length;
    let i = 0;
    while (i < c) {
      const o = this.ops[i];
      if ( o.kind == 1 ) {
        if ( i < c - 1 ) {
          parts.push(("{\"retain\":" + ((o.n).toString())) + "}");
        }
      }
      if ( o.kind == 2 ) {
        parts.push(("{\"insert\":" + RdOtDelta.quote(o.text)) + "}");
      }
      if ( o.kind == 3 ) {
        parts.push(("{\"delete\":" + ((o.n).toString())) + "}");
      }
      i = i + 1;
    };
    return ("[" + parts.join(",")) + "]";
  };
}
RdOtDelta.transform = function(a0, b0) {
  const a = a0.copy();
  const b = b0.copy();
  let __len = a.baseLength;
  if ( b.baseLength > __len ) {
    __len = b.baseLength;
  }
  a.padTo(__len);
  b.padTo(__len);
  const p = new RdOtPair();
  const ra = new RdOtReader(a);
  const rb = new RdOtReader(b);
  while (ra.more() || rb.more()) {
    if ( ra.kind() == 2 ) {
      const ia = ra.take(ra.left());
      const s = ia.text;
      p.a.insert(s);
      p.b.retain(s.length);
      continue;
    }
    if ( rb.kind() == 2 ) {
      const ib2 = rb.take(rb.left());
      const s2 = ib2.text;
      p.a.retain(s2.length);
      p.b.insert(s2);
      continue;
    }
    if ( ra.more() == false || rb.more() == false ) {
      return p;
    }
    let n = ra.left();
    if ( rb.left() < n ) {
      n = rb.left();
    }
    const x = ra.take(n);
    const y = rb.take(n);
    if ( x.kind == 1 && y.kind == 1 ) {
      p.a.retain(n);
      p.b.retain(n);
    }
    if ( x.kind == 3 && y.kind == 1 ) {
      p.a.delete(n);
    }
    if ( x.kind == 1 && y.kind == 3 ) {
      p.b.delete(n);
    }
  };
  return p;
};
RdOtDelta.diff = function(a, b, caret) {
  const la = a.length;
  const lb = b.length;
  let most = la;
  if ( lb < most ) {
    most = lb;
  }
  let p = 0;
  while (p < most && a.charCodeAt(p ) == b.charCodeAt(p )) {
    p = p + 1;
  };
  if ( caret >= 0 ) {
    let grow = lb - la;
    if ( grow < 0 ) {
      grow = 0;
    }
    let lim = caret - grow;
    if ( lim < 0 ) {
      lim = 0;
    }
    if ( p > lim ) {
      p = lim;
    }
  }
  if ( (p > 0 && p < la) && RdOtDelta.isLow(a.charCodeAt(p )) ) {
    p = p - 1;
  }
  if ( (p > 0 && p < lb) && RdOtDelta.isLow(b.charCodeAt(p )) ) {
    p = p - 1;
  }
  let s = 0;
  while ((s < la - p && s < lb - p) && a.charCodeAt((la - 1) - s ) == b.charCodeAt((lb - 1) - s )) {
    s = s + 1;
  };
  while (s > 0 && RdOtDelta.isLow(a.charCodeAt(la - s ))) {
    s = s - 1;
  };
  const d = new RdOtDelta();
  d.retain(p);
  d.insert(b.substring(p, lb - s ));
  d.delete((la - p) - s);
  d.retain(s);
  return d;
};
RdOtDelta.isLow = function(c) {
  return c >= 56320 && c <= 57343;
};
RdOtDelta.hex4 = function(c) {
  const digits = "0123456789abcdef";
  let out = "";
  let k = 3;
  while (k >= 0) {
    let shift = 1;
    let m = 0;
    while (m < k) {
      shift = shift * 16;
      m = m + 1;
    };
    const d = ((c / shift) | 0) % 16;
    out = out + digits.substring(d, d + 1 );
    k = k - 1;
  };
  return out;
};
RdOtDelta.quote = function(s) {
  let parts = [];
  const n = s.length;
  let start = 0;
  let i = 0;
  while (i < n) {
    const c = s.charCodeAt(i );
    let esc = "";
    if ( c == 34 ) {
      esc = "\\\"";
    }
    if ( c == 92 ) {
      esc = "\\\\";
    }
    if ( c == 10 ) {
      esc = "\\n";
    }
    if ( c == 13 ) {
      esc = "\\r";
    }
    if ( c == 9 ) {
      esc = "\\t";
    }
    if ( (c < 32 && c != 10) && (c != 13 && c != 9) ) {
      esc = "\\u" + RdOtDelta.hex4(c);
    }
    if ( esc.length > 0 ) {
      parts.push(s.substring(start, i ));
      parts.push(esc);
      start = i + 1;
    }
    i = i + 1;
  };
  parts.push(s.substring(start, n ));
  return ("\"" + parts.join("")) + "\"";
};
RdOtDelta.fromJson = function(s) {
  const p = new RdOtJson(s);
  return p.delta();
};
export class RdOtApplied  {
  constructor() {
    this.ok = true;
    this.error = "";
    this.text = "";
  }
}
export class RdOtReader  {
  constructor(delta) {
    this.d = undefined;
    this.i = 0;
    this.off = 0;
    this.d = delta;
  }
  more () {
    return this.i < this.d.ops.length;
  };
  kind () {
    if ( this.i >= this.d.ops.length ) {
      return 0;
    }
    const o = this.d.ops[this.i];
    return o.kind;
  };
  left () {
    if ( this.i >= this.d.ops.length ) {
      return 0;
    }
    const o = this.d.ops[this.i];
    return o.len() - this.off;
  };
  take (n) {
    const o = this.d.ops[this.i];
    const __len = o.len();
    let k = n;
    if ( k > __len - this.off ) {
      k = __len - this.off;
    }
    const piece = RdOtOp.make(o.kind, k, "");
    if ( o.kind == 2 ) {
      piece.text = o.text.substring(this.off, this.off + k );
      piece.n = 0;
    }
    this.off = this.off + k;
    if ( this.off >= __len ) {
      this.i = this.i + 1;
      this.off = 0;
    }
    return piece;
  };
}
export class RdOtJson  {
  constructor(text) {
    this.s = "";
    this.pos = 0;
    this.ok = true;
    this.s = text;
  }
  ws () {
    const n = this.s.length;
    while (this.pos < n) {
      const c = this.s.charCodeAt(this.pos );
      if ( ((c == 32 || c == 10) || c == 13) || c == 9 ) {
        this.pos = this.pos + 1;
      } else {
        return;
      }
    };
  };
  eat (c) {
    this.ws();
    if ( this.pos < this.s.length && this.s.charCodeAt(this.pos ) == c ) {
      this.pos = this.pos + 1;
      return true;
    }
    return false;
  };
  number () {
    this.ws();
    const n = this.s.length;
    let v = 0;
    let seen = false;
    while (this.pos < n) {
      const c = this.s.charCodeAt(this.pos );
      if ( c >= 48 && c <= 57 ) {
        v = v * 10 + (c - 48);
        seen = true;
        this.pos = this.pos + 1;
      } else {
        break;
      }
    };
    if ( seen == false ) {
      this.ok = false;
    }
    return v;
  };
  str () {
    if ( this.eat(34) == false ) {
      this.ok = false;
      return "";
    }
    let parts = [];
    const n = this.s.length;
    let start = this.pos;
    while (this.pos < n) {
      const c = this.s.charCodeAt(this.pos );
      if ( c == 34 ) {
        parts.push(this.s.substring(start, this.pos ));
        this.pos = this.pos + 1;
        return parts.join("");
      }
      if ( c == 92 ) {
        parts.push(this.s.substring(start, this.pos ));
        if ( this.pos + 1 >= n ) {
          this.ok = false;
          return "";
        }
        const e = this.s.charCodeAt(this.pos + 1 );
        this.pos = this.pos + 2;
        if ( e == 110 ) {
          parts.push("\n");
        }
        if ( e == 114 ) {
          parts.push("\r");
        }
        if ( e == 116 ) {
          parts.push("\t");
        }
        if ( e == 98 ) {
          parts.push(String.fromCharCode(8));
        }
        if ( e == 102 ) {
          parts.push(String.fromCharCode(12));
        }
        if ( (e == 34 || e == 92) || e == 47 ) {
          parts.push(this.s.substring(this.pos - 1, this.pos ));
        }
        if ( e == 117 ) {
          if ( this.pos + 4 > n ) {
            this.ok = false;
            return "";
          }
          let v = 0;
          let k = 0;
          while (k < 4) {
            const h = RdOtJson.hexVal(this.s.charCodeAt(this.pos + k ));
            if ( h < 0 ) {
              this.ok = false;
              return "";
            }
            v = v * 16 + h;
            k = k + 1;
          };
          this.pos = this.pos + 4;
          parts.push(String.fromCharCode(v));
        }
        start = this.pos;
        continue;
      }
      this.pos = this.pos + 1;
    };
    this.ok = false;
    return "";
  };
  delta () {
    const d = new RdOtDelta();
    if ( this.eat(91) == false ) {
      this.ok = false;
      return d;
    }
    if ( this.eat(93) ) {
      return d;
    }
    while (this.ok) {
      if ( this.eat(123) == false ) {
        this.ok = false;
        return d;
      }
      const key = this.str();
      if ( this.eat(58) == false ) {
        this.ok = false;
        return d;
      }
      if ( key == "retain" ) {
        d.retain(this.number());
      } else {
        if ( key == "delete" ) {
          d.delete(this.number());
        } else {
          if ( key == "insert" ) {
            d.insert(this.str());
          } else {
            this.ok = false;
            return d;
          }
        }
      }
      if ( this.eat(125) == false ) {
        this.ok = false;
        return d;
      }
      if ( this.eat(93) ) {
        return d;
      }
      if ( this.eat(44) == false ) {
        this.ok = false;
        return d;
      }
    };
    return d;
  };
}
RdOtJson.hexVal = function(c) {
  if ( c >= 48 && c <= 57 ) {
    return c - 48;
  }
  if ( c >= 97 && c <= 102 ) {
    return c - 87;
  }
  if ( c >= 65 && c <= 70 ) {
    return c - 55;
  }
  return -1;
};
export class RdOtClient  {
  constructor(startRev) {
    this.rev = 0;
    this.outstanding = undefined;
    this.buffer = undefined;
    this.toSend = undefined;
    this.rev = startRev;
  }
  waiting () {
    return (typeof(this.outstanding) !== "undefined" && this.outstanding != null ) ;
  };
  local (d) {
    if ( d.isNoop() ) {
      return;
    }
    if ( typeof(this.outstanding) === "undefined" ) {
      this.outstanding = d;
      this.toSend = d;
      return;
    }
    if ( typeof(this.buffer) === "undefined" ) {
      this.buffer = d;
      return;
    }
    const b = this.buffer;
    this.buffer = b.compose(d);
  };
  takeSend () {
    if ( typeof(this.toSend) === "undefined" ) {
      return this.nothing();
    }
    this.toSend = this.nothing();
    return this.outstanding;
  };
  nothing () {
    let none;
    return none;
  };
  ack () {
    this.rev = this.rev + 1;
    if ( typeof(this.buffer) === "undefined" ) {
      this.outstanding = this.nothing();
      return;
    }
    this.outstanding = this.buffer;
    this.buffer = this.nothing();
    this.toSend = this.outstanding;
  };
  resend () {
    if ( (typeof(this.outstanding) !== "undefined" && this.outstanding != null )  ) {
      this.toSend = this.outstanding;
    }
  };
  receive (d) {
    this.rev = this.rev + 1;
    let server = d;
    if ( (typeof(this.outstanding) !== "undefined" && this.outstanding != null )  ) {
      const o = this.outstanding;
      const p1 = RdOtDelta.transform(o, server);
      this.outstanding = p1.a;
      server = p1.b;
      if ( (typeof(this.buffer) !== "undefined" && this.buffer != null )  ) {
        const bf = this.buffer;
        const p2 = RdOtDelta.transform(bf, server);
        this.buffer = p2.a;
        server = p2.b;
      }
    }
    return server;
  };
  toLocal (at) {
    let out = at;
    if ( (typeof(this.outstanding) !== "undefined" && this.outstanding != null )  ) {
      const o = this.outstanding;
      out = o.transformIndex(out, false);
      if ( (typeof(this.buffer) !== "undefined" && this.buffer != null )  ) {
        const bf = this.buffer;
        out = bf.transformIndex(out, false);
      }
    }
    return out;
  };
}
export class RdOtLogged  {
  constructor() {
    this.rev = 0;
    this.client = "";
    this.delta = new RdOtDelta();
  }
}
export class RdOtHub  {
  constructor(start) {
    this.text = "";
    this.rev = 0;
    this.log = [];
    this.text = start;
  }
  submit (at, d, client) {
    if ( at < 0 || at > this.rev ) {
      return false;
    }
    let full = d.copy();
    let i = at;
    while (i < this.rev) {
      const e = this.log[i];
      const pr = RdOtDelta.transform(full, e.delta);
      full = pr.a;
      i = i + 1;
    };
    full.padTo(this.text.length);
    const r = full.tryApply(this.text);
    if ( r.ok == false || full.baseLength != this.text.length ) {
      return false;
    }
    this.text = r.text;
    this.rev = this.rev + 1;
    const e_1 = new RdOtLogged();
    e_1.rev = this.rev;
    e_1.client = client;
    e_1.delta = full;
    this.log.push(e_1);
    return true;
  };
  since (at) {
    let out = [];
    // Loop start
    for ( const e of this.log) {
      if ( e.rev > at ) {
        out.push(e);
      }
    }
    return out;
  };
}
