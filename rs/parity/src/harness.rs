//! The test harness of ../../tests/RdTest.rgr: a portable random source and
//! pass/fail counting.

/// Park-Miller with Schrage's method: no product leaves 32 bits.
pub struct Random {
    pub seed: i64,
}

impl Random {
    pub fn new(s: i64) -> Random {
        let mut seed = s;
        if seed <= 0 {
            seed = 1;
        }
        Random { seed }
    }

    pub fn next(&mut self) -> i64 {
        let hi = self.seed / 127773;
        let lo = self.seed % 127773;
        let mut t = 16807 * lo - 2836 * hi;
        if t <= 0 {
            t = t + 2147483647;
        }
        self.seed = t;
        t
    }

    /// 0 <= value < n
    pub fn below(&mut self, n: i64) -> i64 {
        if n <= 0 {
            return 0;
        }
        self.next() % n
    }

    pub fn bytes(&mut self, n: i64) -> Vec<u8> {
        let mut b: Vec<u8> = Vec::new();
        let mut i = 0;
        while i < n {
            let v = self.below(256);
            b.push(v as u8);
            i += 1;
        }
        b
    }

    /// text-like bytes: words from a small alphabet, spaces and newlines
    pub fn text_bytes(&mut self, n: i64) -> Vec<u8> {
        let mut b: Vec<u8> = Vec::new();
        let mut i = 0;
        while i < n {
            let r = self.below(100);
            let mut v = 97 + self.below(26);
            if r < 15 {
                v = 32;
            }
            if r == 99 {
                v = 10;
            }
            b.push(v as u8);
            i += 1;
        }
        b
    }
}

pub struct Test {
    pub passed: i64,
    pub failed: i64,
    pub group: String,
}

impl Test {
    pub fn new() -> Test {
        Test { passed: 0, failed: 0, group: String::new() }
    }

    pub fn start(&mut self, name: &str) {
        self.group = String::from(name);
    }

    pub fn ok(&mut self, cond: bool, what: &str) {
        if cond {
            self.passed += 1;
        } else {
            self.failed += 1;
            println!("FAIL {}: {}", self.group, what);
        }
    }

    pub fn eq_int(&mut self, got: i64, want: i64, what: &str) {
        if got == want {
            self.passed += 1;
        } else {
            self.failed += 1;
            println!("FAIL {}: {} got {} want {}", self.group, what, got, want);
        }
    }

    pub fn eq_str(&mut self, got: &str, want: &str, what: &str) {
        if got == want {
            self.passed += 1;
        } else {
            self.failed += 1;
            println!("FAIL {}: {}\n  got:  {}\n  want: {}", self.group, what, got, want);
        }
    }

    pub fn done(&self) -> i64 {
        println!("passed {}, failed {}", self.passed, self.failed);
        if self.failed > 0 {
            println!("TESTS FAILED");
            return 1;
        }
        println!("ALL TESTS PASSED");
        0
    }
}

/// b[from..to) as a new Vec
pub fn part(b: &Vec<u8>, from: i64, to: i64) -> Vec<u8> {
    b[from as usize..to as usize].to_vec()
}
