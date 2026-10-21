//! Line diff (Myers), unified view, three-way merge (diff3).
//!
//! Text is split on "\n" and joined back with "\n", so a file round-trips
//! exactly (a trailing newline is an empty last line).
//!
//! A hunk says: base lines [a_start, a_start+a_len) became new lines
//! [b_start, b_start+b_len). a_len 0 is an insertion, b_len 0 a deletion.
//!
//! merge3(base, mine, theirs): both sides' hunks are laid on the base. A
//! change only one side made is taken. Changes of both sides that overlap in
//! the base (or insert at the same line) are one region: equal results are
//! taken once, different ones are a conflict that keeps base, mine and
//! theirs.
use std::collections::HashMap;

/// One changed region.
#[derive(Clone)]
pub struct Hunk {
    pub a_start: i64,
    pub a_len: i64,
    pub b_start: i64,
    pub b_len: i64,
}

/// The lines of both versions and the hunks between them.
pub struct LineDiff {
    pub a: Vec<String>,
    pub b: Vec<String>,
    pub hunks: Vec<Hunk>,
    pub added: i64,
    pub removed: i64,
}

/// Clean lines, or a conflict with all three versions of a region.
#[derive(Clone)]
pub struct MergeChunk {
    pub conflict: bool,
    pub lines: Vec<String>,
    pub base: Vec<String>,
    pub mine: Vec<String>,
    pub theirs: Vec<String>,
}

/// The result of a three-way merge.
pub struct Merge {
    pub chunks: Vec<MergeChunk>,
    pub conflicts: i64,
    /// changes taken from each side without a conflict
    pub from_mine: i64,
    pub from_theirs: i64,
}

fn append_markers(out: &mut Vec<String>, c: &MergeChunk) {
    out.push(String::from("<<<<<<< mine"));
    append_all(out, &c.mine);
    out.push(String::from("======="));
    append_all(out, &c.theirs);
    out.push(String::from(">>>>>>> theirs"));
}

impl Merge {
    /// Whether no region conflicted.
    pub fn clean(&self) -> bool {
        self.conflicts == 0
    }

    /// The merged text; each conflict as `pick`: "mine", "theirs", "both"
    /// (mine then theirs) or "markers" (git-style conflict markers).
    pub fn text(&self, pick: &str) -> String {
        let mut out: Vec<String> = Vec::new();
        for c in &self.chunks {
            if !c.conflict {
                append_all(&mut out, &c.lines);
            } else if pick == "mine" || pick == "both" {
                append_all(&mut out, &c.mine);
                if pick == "both" {
                    append_all(&mut out, &c.theirs);
                }
            } else if pick == "theirs" {
                append_all(&mut out, &c.theirs);
            } else {
                append_markers(&mut out, c);
            }
        }
        out.join("\n")
    }

    /// The text with each conflict resolved as `picks` says, one entry per
    /// conflict in order ("mine", "theirs", "both", "base", "markers").
    pub fn resolve(&self, picks: &Vec<String>) -> String {
        let mut out: Vec<String> = Vec::new();
        let mut k = 0;
        for c in &self.chunks {
            if !c.conflict {
                append_all(&mut out, &c.lines);
                continue;
            }
            let mut pick = String::from("markers");
            if k < picks.len() {
                pick = picks[k].clone();
            }
            k += 1;
            if pick == "mine" || pick == "both" {
                append_all(&mut out, &c.mine);
            }
            if pick == "theirs" || pick == "both" {
                append_all(&mut out, &c.theirs);
            }
            if pick == "base" {
                append_all(&mut out, &c.base);
            }
            if pick == "markers" {
                append_markers(&mut out, c);
            }
        }
        out.join("\n")
    }
}

/// The lines of a text.
pub fn lines(s: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for l in s.split('\n') {
        out.push(String::from(l));
    }
    out
}

/// Push every line of `src`.
pub fn append_all(out: &mut Vec<String>, src: &Vec<String>) {
    for l in src {
        out.push(l.clone());
    }
}

/// src[start..end) as a new list.
pub fn slice(src: &Vec<String>, start: i64, end: i64) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut i = start;
    while i < end {
        out.push(src[i as usize].clone());
        i += 1;
    }
    out
}

/// Lines as ints: equal lines get equal numbers.
fn intern(src: &Vec<String>, table: &mut HashMap<String, i64>, out: &mut Vec<i64>, first: i64) -> i64 {
    let mut next_id = first;
    for l in src {
        match table.get(l) {
            Some(id) => out.push(*id),
            None => {
                table.insert(l.clone(), next_id);
                out.push(next_id);
                next_id += 1;
            }
        }
    }
    next_id
}

/// The line diff of two texts.
pub fn diff(a_text: &str, b_text: &str) -> LineDiff {
    diff_lines(&lines(a_text), &lines(b_text))
}

/// The line diff of two lists of lines.
pub fn diff_lines(a: &Vec<String>, b: &Vec<String>) -> LineDiff {
    let mut res = LineDiff { a: a.clone(), b: b.clone(), hunks: Vec::new(), added: 0, removed: 0 };
    let n = a.len() as i64;
    let m = b.len() as i64;
    let mut table: HashMap<String, i64> = HashMap::new();
    let mut ia: Vec<i64> = Vec::new();
    let mut ib: Vec<i64> = Vec::new();
    let ids = intern(a, &mut table, &mut ia, 0);
    intern(b, &mut table, &mut ib, ids);
    // common prefix / suffix
    let mut p: i64 = 0;
    while p < n && p < m && ia[p as usize] == ib[p as usize] {
        p += 1;
    }
    let mut s: i64 = 0;
    while s + p < n && s + p < m && ia[(n - 1 - s) as usize] == ib[(m - 1 - s) as usize] {
        s += 1;
    }
    myers(&mut res, &ia, &ib, p, n - s, p, m - s);
    let mut added = 0;
    let mut removed = 0;
    for h in &res.hunks {
        added += h.b_len;
        removed += h.a_len;
    }
    res.added = added;
    res.removed = removed;
    res
}

/// Myers' O(ND) diff of A[a0,a1) and B[b0,b1); hunks appended in order. Past
/// 4000 edits the rest of the region is one replace hunk.
fn myers(res: &mut LineDiff, va: &Vec<i64>, vb: &Vec<i64>, a0: i64, a1: i64, b0: i64, b1: i64) {
    let n = a1 - a0;
    let m = b1 - b0;
    if n == 0 && m == 0 {
        return;
    }
    if n == 0 || m == 0 {
        add_hunk(res, a0, n, b0, m);
        return;
    }
    let mut max_d = n + m;
    if max_d > 4000 {
        max_d = 4000;
    }
    let off = max_d + 1;
    let width = 2 * max_d + 3;
    let mut v: Vec<i64> = vec![0; width as usize];
    // V after each d
    let mut trace: Vec<Vec<i64>> = Vec::new();
    let mut found: i64 = -1;
    let mut d: i64 = 0;
    while d <= max_d {
        trace.push(v.clone());
        let mut k = 0 - d;
        while k <= d {
            let mut x: i64;
            if k == 0 - d || (k != d && v[(k - 1 + off) as usize] < v[(k + 1 + off) as usize]) {
                x = v[(k + 1 + off) as usize];
            } else {
                x = v[(k - 1 + off) as usize] + 1;
            }
            let mut y = x - k;
            while x < n && y < m && va[(a0 + x) as usize] == vb[(b0 + y) as usize] {
                x += 1;
                y += 1;
            }
            v[(k + off) as usize] = x;
            if x >= n && y >= m {
                found = d;
                break;
            }
            k += 2;
        }
        if found >= 0 {
            break;
        }
        d += 1;
    }
    if found < 0 {
        add_hunk(res, a0, n, b0, m);
        return;
    }
    // walk back: collect (x, y) of each edit, newest first
    let mut xs: Vec<i64> = Vec::new();
    let mut ys: Vec<i64> = Vec::new();
    let mut kinds: Vec<i64> = Vec::new();
    let mut x2 = n;
    let mut y2 = m;
    let mut dd = found;
    while dd > 0 {
        let vd = &trace[dd as usize];
        let k2 = x2 - y2;
        let prev_k: i64;
        if k2 == 0 - dd || (k2 != dd && vd[(k2 - 1 + off) as usize] < vd[(k2 + 1 + off) as usize]) {
            prev_k = k2 + 1;
        } else {
            prev_k = k2 - 1;
        }
        let prev_x = vd[(prev_k + off) as usize];
        let prev_y = prev_x - prev_k;
        while x2 > prev_x && y2 > prev_y {
            x2 -= 1;
            y2 -= 1;
        }
        // 1: insertion of B[prev_y], 0: deletion of A[prev_x]
        if prev_k == k2 + 1 {
            kinds.push(1);
        } else {
            kinds.push(0);
        }
        xs.push(prev_x);
        ys.push(prev_y);
        x2 = prev_x;
        y2 = prev_y;
        dd -= 1;
    }
    // edits oldest first, joined into hunks
    let mut i = kinds.len() as i64 - 1;
    while i >= 0 {
        let ex = xs[i as usize];
        let ey = ys[i as usize];
        if kinds[i as usize] == 1 {
            add_hunk(res, a0 + ex, 0, b0 + ey, 1);
        } else {
            add_hunk(res, a0 + ex, 1, b0 + ey, 0);
        }
        i -= 1;
    }
}

/// Append a hunk, merging it into the previous one when they touch.
fn add_hunk(res: &mut LineDiff, a_start: i64, a_len: i64, b_start: i64, b_len: i64) {
    let n = res.hunks.len();
    if n > 0 {
        let k = n - 1;
        if res.hunks[k].a_start + res.hunks[k].a_len == a_start && res.hunks[k].b_start + res.hunks[k].b_len == b_start {
            res.hunks[k].a_len += a_len;
            res.hunks[k].b_len += b_len;
            return;
        }
    }
    res.hunks.push(Hunk { a_start, a_len, b_start, b_len });
}

/// The classic unified view with `context` lines around each change.
pub fn unified(d: &LineDiff, context: i64) -> String {
    let mut out: Vec<String> = Vec::new();
    let n = d.hunks.len();
    let mut i = 0;
    while i < n {
        // group hunks whose context touches
        let mut j = i;
        while j + 1 < n {
            let cur_end = d.hunks[j].a_start + d.hunks[j].a_len;
            if d.hunks[j + 1].a_start - cur_end > context * 2 {
                break;
            }
            j += 1;
        }
        let first = d.hunks[i].clone();
        let last_h = d.hunks[j].clone();
        let mut a_from = first.a_start - context;
        if a_from < 0 {
            a_from = 0;
        }
        let mut a_to = last_h.a_start + last_h.a_len + context;
        if a_to > d.a.len() as i64 {
            a_to = d.a.len() as i64;
        }
        let b_from = first.b_start - (first.a_start - a_from);
        let b_to = last_h.b_start + last_h.b_len + (a_to - (last_h.a_start + last_h.a_len));
        out.push(format!("@@ -{},{} +{},{} @@", a_from + 1, a_to - a_from, b_from + 1, b_to - b_from));
        let mut pos = a_from;
        let mut k = i;
        while k <= j {
            let h = d.hunks[k].clone();
            while pos < h.a_start {
                out.push(format!(" {}", d.a[pos as usize]));
                pos += 1;
            }
            let mut q = 0;
            while q < h.a_len {
                out.push(format!("-{}", d.a[(h.a_start + q) as usize]));
                q += 1;
            }
            q = 0;
            while q < h.b_len {
                out.push(format!("+{}", d.b[(h.b_start + q) as usize]));
                q += 1;
            }
            pos = h.a_start + h.a_len;
            k += 1;
        }
        while pos < a_to {
            out.push(format!(" {}", d.a[pos as usize]));
            pos += 1;
        }
        i = j + 1;
    }
    out.join("\n")
}

// ------------------------------------------------------------------ diff3

/// The three-way merge of two edits of `base_text`.
pub fn merge3(base_text: &str, mine_text: &str, theirs_text: &str) -> Merge {
    let base = lines(base_text);
    let mine = lines(mine_text);
    let theirs = lines(theirs_text);
    let dm = diff_lines(&base, &mine);
    let dt = diff_lines(&base, &theirs);
    let mut res = Merge { chunks: Vec::new(), conflicts: 0, from_mine: 0, from_theirs: 0 };
    let mut im = 0;
    let mut it = 0;
    let nm = dm.hunks.len();
    let nt = dt.hunks.len();
    // shift of each side so far (new index - base index)
    let mut shift_m: i64 = 0;
    let mut shift_t: i64 = 0;
    let mut pos: i64 = 0;
    let mut clean: Vec<String> = Vec::new();
    while im < nm || it < nt {
        // the earliest hunk starts a group
        let mut take_mine = false;
        if im < nm {
            take_mine = true;
            if it < nt && dt.hunks[it].a_start < dm.hunks[im].a_start {
                take_mine = false;
            }
        }
        let g_start: i64;
        let mut g_end: i64;
        let mut jm = im;
        let mut jt = it;
        let mut used_m = false;
        let mut used_t = false;
        if take_mine {
            g_start = dm.hunks[im].a_start;
            g_end = g_start + dm.hunks[im].a_len;
            jm += 1;
            used_m = true;
        } else {
            g_start = dt.hunks[it].a_start;
            g_end = g_start + dt.hunks[it].a_len;
            jt += 1;
            used_t = true;
        }
        // unchanged base lines before the group
        while pos < g_start {
            clean.push(base[pos as usize].clone());
            pos += 1;
        }
        let mut grow = true;
        while grow {
            grow = false;
            if jm < nm {
                let hs = dm.hunks[jm].a_start;
                let he = hs + dm.hunks[jm].a_len;
                if hs < g_end || hs == g_start {
                    if he > g_end {
                        g_end = he;
                    }
                    jm += 1;
                    used_m = true;
                    grow = true;
                }
            }
            if jt < nt {
                let hs2 = dt.hunks[jt].a_start;
                let he2 = hs2 + dt.hunks[jt].a_len;
                if hs2 < g_end || hs2 == g_start {
                    if he2 > g_end {
                        g_end = he2;
                    }
                    jt += 1;
                    used_t = true;
                    grow = true;
                }
            }
        }
        // each side's text for base [g_start, g_end)
        let m_from = g_start + shift_m;
        let t_from = g_start + shift_t;
        let mut q = im;
        while q < jm {
            shift_m += dm.hunks[q].b_len - dm.hunks[q].a_len;
            q += 1;
        }
        q = it;
        while q < jt {
            shift_t += dt.hunks[q].b_len - dt.hunks[q].a_len;
            q += 1;
        }
        let m_part = slice(&mine, m_from, g_end + shift_m);
        let t_part = slice(&theirs, t_from, g_end + shift_t);
        if used_m && !used_t {
            append_all(&mut clean, &m_part);
            res.from_mine += 1;
        } else if used_t && !used_m {
            append_all(&mut clean, &t_part);
            res.from_theirs += 1;
        } else if m_part.join("\n") == t_part.join("\n") && m_part.len() == t_part.len() {
            append_all(&mut clean, &m_part);
        } else {
            conflict_chunk(&mut res, &clean, slice(&base, g_start, g_end), m_part, t_part);
            clean = Vec::new();
        }
        pos = g_end;
        im = jm;
        it = jt;
    }
    while pos < base.len() as i64 {
        clean.push(base[pos as usize].clone());
        pos += 1;
    }
    res.chunks.push(MergeChunk { conflict: false, lines: clean, base: Vec::new(), mine: Vec::new(), theirs: Vec::new() });
    res
}

fn conflict_chunk(res: &mut Merge, clean: &Vec<String>, b: Vec<String>, m: Vec<String>, t: Vec<String>) {
    res.chunks.push(MergeChunk { conflict: false, lines: clean.clone(), base: Vec::new(), mine: Vec::new(), theirs: Vec::new() });
    res.chunks.push(MergeChunk { conflict: true, lines: Vec::new(), base: b, mine: m, theirs: t });
    res.conflicts += 1;
}
