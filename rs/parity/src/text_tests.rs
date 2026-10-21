//! ../../tests/TextTests.rgr: line diff, unified view, three-way merge.
use crate::harness::{Random, Test};
use rangerdiff::text;
use rangerdiff::text::LineDiff;

/// apply the hunks of d to d.a; must give d.b
fn rebuild(d: &LineDiff) -> String {
    let mut out: Vec<String> = Vec::new();
    let mut pos: i64 = 0;
    for h in &d.hunks {
        while pos < h.a_start {
            out.push(d.a[pos as usize].clone());
            pos += 1;
        }
        let mut q = 0;
        while q < h.b_len {
            out.push(d.b[(h.b_start + q) as usize].clone());
            q += 1;
        }
        pos = h.a_start + h.a_len;
    }
    while pos < d.a.len() as i64 {
        out.push(d.a[pos as usize].clone());
        pos += 1;
    }
    out.join("\n")
}

fn deck() -> String {
    let l = vec![
        "---", "title: Q3 report", "---", "", "## Revenue", "", "- Up 12 %", "- New markets: Sweden", "", "## Costs", "",
        "- Flat", "- Hiring paused", "", "## Next", "", "Questions?", "",
    ];
    l.join("\n")
}

/// `s` contains `sub` past its first character (the .rgr tests' `indexOf > 0`)
fn has_after_start(s: &str, sub: &str) -> bool {
    match s.find(sub) {
        Some(i) => i > 0,
        None => false,
    }
}

fn basics(t: &mut Test) {
    t.start("line diff");
    let a = deck();
    let b = a.replace("- Up 12 %", "- Up 14 %");
    let d = text::diff(&a, &b);
    t.eq_int(d.hunks.len() as i64, 1, "one hunk");
    t.eq_int(d.added, 1, "one added");
    t.eq_int(d.removed, 1, "one removed");
    t.eq_str(&rebuild(&d), &b, "rebuilds");
    let u = text::unified(&d, 1);
    t.eq_str(&u, "@@ -6,3 +6,3 @@\n \n-- Up 12 %\n+- Up 14 %\n - New markets: Sweden", "unified view");
    let same = text::diff(&a, &a);
    t.eq_int(same.hunks.len() as i64, 0, "no change, no hunks");
    let e = text::diff("", &a);
    t.eq_str(&rebuild(&e), &a, "from empty");
    let f = text::diff(&a, "");
    t.eq_str(&rebuild(&f), "", "to empty");
}

/// random line edits
fn edit_lines(r: &mut Random, txt: &str) -> String {
    let l = text::lines(txt);
    let mut out: Vec<String> = Vec::new();
    for s in &l {
        let k = r.below(20);
        if k == 0 {
            // dropped
        } else if k == 1 {
            out.push(format!("{} (edited)", s));
        } else if k == 2 {
            out.push(s.clone());
            let n = r.below(1000);
            out.push(format!("new line {}", n));
        } else {
            out.push(s.clone());
        }
    }
    out.join("\n")
}

fn random_text(r: &mut Random, n: i64) -> String {
    let mut out: Vec<String> = Vec::new();
    let mut i = 0;
    while i < n {
        let v = r.below(50);
        out.push(format!("line {}", v));
        i += 1;
    }
    out.join("\n")
}

fn random(t: &mut Test) {
    t.start("random line diffs");
    let mut r = Random::new(321);
    let mut round = 0;
    while round < 200 {
        let n = r.below(300);
        let a = random_text(&mut r, n);
        let b = edit_lines(&mut r, &a);
        let d = text::diff(&a, &b);
        t.ok(rebuild(&d) == b, &format!("rebuild round {}", round));
        round += 1;
    }
}

fn merges(t: &mut Test) {
    t.start("three-way merge");
    let base = deck();
    // laptop edits revenue, phone edits costs: both kept
    let mine = base.replace("- Up 12 %", "- Up 14 %");
    let theirs = base.replace("- Hiring paused", "- Hiring resumes in Q4");
    let m1 = text::merge3(&base, &mine, &theirs);
    t.ok(m1.clean(), "separate edits merge cleanly");
    let want1 = mine.replace("- Hiring paused", "- Hiring resumes in Q4");
    t.eq_str(&m1.text("markers"), &want1, "both edits in the result");
    // adjacent lines edited on each side
    let mine2 = base.replace("- Up 12 %", "- Up 13 %");
    let theirs2 = base.replace("- New markets: Sweden", "- New markets: Sweden, Norway");
    let m2 = text::merge3(&base, &mine2, &theirs2);
    t.ok(m2.clean(), "adjacent lines merge cleanly");
    t.ok(has_after_start(&m2.text("markers"), "Up 13"), "adjacent: mine kept");
    t.ok(has_after_start(&m2.text("markers"), "Norway"), "adjacent: theirs kept");
    // the same edit on both sides
    let m3 = text::merge3(&base, &mine, &mine);
    t.ok(m3.clean(), "identical edits are not a conflict");
    t.eq_str(&m3.text("markers"), &mine, "identical edits taken once");
    // the same line edited differently: a conflict
    let theirs4 = base.replace("- Up 12 %", "- Up 15 %");
    let m4 = text::merge3(&base, &mine, &theirs4);
    t.eq_int(m4.conflicts, 1, "one conflict");
    t.eq_str(&m4.text("mine"), &mine, "conflict resolved as mine");
    t.eq_str(&m4.text("theirs"), &theirs4, "conflict resolved as theirs");
    let marked = m4.text("markers");
    t.ok(has_after_start(&marked, "<<<<<<< mine\n- Up 14 %\n=======\n- Up 15 %\n>>>>>>> theirs"), "markers");
    let picks = vec![String::from("both")];
    t.ok(has_after_start(&m4.resolve(&picks), "- Up 14 %\n- Up 15 %"), "resolve both");
    // both add a slide at the end: a conflict (order unknown)
    let mine5 = format!("{}\n## Mine\n", base);
    let theirs5 = format!("{}\n## Theirs\n", base);
    let m5 = text::merge3(&base, &mine5, &theirs5);
    t.eq_int(m5.conflicts, 1, "insert at the same place conflicts");
    t.ok(has_after_start(&m5.text("both"), "## Mine"), "both: mine");
    t.ok(has_after_start(&m5.text("both"), "## Theirs"), "both: theirs");
    // one side deletes a slide, the other edits a different one
    let mine6 = base.replace("## Next\n\nQuestions?\n", "");
    let m6 = text::merge3(&base, &mine6, &theirs);
    t.ok(m6.clean(), "delete + edit elsewhere merges");
    t.eq_str(&m6.text("markers"), &mine6.replace("- Hiring paused", "- Hiring resumes in Q4"), "delete + edit result");
    // one side deletes what the other edits: conflict
    let theirs7 = base.replace("Questions?", "Questions? Ask now.");
    let m7 = text::merge3(&base, &mine6, &theirs7);
    t.eq_int(m7.conflicts, 1, "delete vs edit conflicts");
}

fn merge_properties(t: &mut Test) {
    t.start("merge properties");
    let mut r = Random::new(77);
    let mut round = 0;
    while round < 150 {
        let n = 5 + r.below(200);
        let base = random_text(&mut r, n);
        let mine = edit_lines(&mut r, &base);
        let theirs = edit_lines(&mut r, &base);
        let a = text::merge3(&base, &mine, &base);
        t.ok(a.clean() && a.text("markers") == mine, "theirs unchanged gives mine");
        let b = text::merge3(&base, &base, &theirs);
        t.ok(b.clean() && b.text("markers") == theirs, "mine unchanged gives theirs");
        let c = text::merge3(&base, &mine, &mine);
        t.ok(c.clean() && c.text("markers") == mine, "equal sides give that side");
        let m = text::merge3(&base, &mine, &theirs);
        let mt = text::merge3(&base, &theirs, &mine);
        t.eq_int(m.conflicts, mt.conflicts, "conflict count is symmetric");
        t.ok(m.text("mine") == mt.text("theirs"), "mine/theirs swap symmetrically");
        round += 1;
    }
}

pub fn run(t: &mut Test) {
    basics(t);
    random(t);
    merges(t);
    merge_properties(t);
}
