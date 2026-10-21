//! ../../tests/RepoTests.rgr: commits, history as reverse deltas, diff
//! between versions, merge of two devices' edits, persistence.
use crate::harness::Test;
use rangerdiff::bytes;
use rangerdiff::repo::{Repo, Tree};
use rangerdiff::sha256;
use std::fs;

fn deck(n: i64, extra: &str) -> String {
    let mut l: Vec<String> = Vec::new();
    l.push("---".to_string());
    l.push("title: Board meeting".to_string());
    l.push("---".to_string());
    let mut i: i64 = 1;
    while i <= n {
        l.push(String::new());
        l.push(format!("## Slide {}", i));
        l.push(String::new());
        l.push(format!("- point one of slide {}", i));
        l.push(format!("- point two of slide {}", i));
        i += 1;
    }
    l.push(extra.to_string());
    l.join("\n")
}

fn files(r: &mut Repo, md: &str, css: &str, pic: &Vec<u8>, recipe: &str) -> Tree {
    let mut t = Tree::new();
    t.entries.push(r.entry_of("deck.md", &bytes::from_text(md), ""));
    t.entries.push(r.entry_of("theme.css", &bytes::from_text(css), ""));
    t.entries.push(r.entry_of("media/photo.png", pic, recipe));
    t
}

fn none() -> Vec<String> {
    Vec::new()
}

fn one(a: &str) -> Vec<String> {
    vec![a.to_string()]
}

fn two(a: &str, b: &str) -> Vec<String> {
    vec![a.to_string(), b.to_string()]
}

fn image(name: &str) -> Vec<u8> {
    fs::read(format!("testdata/images/{}", name)).unwrap_or_default()
}

fn commit(r: &mut Repo, md: &str, css: &str, pic: &Vec<u8>, recipe: &str, parents: &Vec<String>, device: &str, time: &str, msg: &str) -> String {
    let t = files(r, md, css, pic, recipe);
    r.commit_tree(&t, parents, "tero", device, time, msg)
}

fn history(t: &mut Test) {
    t.start("history");
    let mut r = Repo::new();
    let pic = image("shot.png");
    let css = "h2 { color: navy; }";
    let c1 = commit(&mut r, &deck(40, ""), css, &pic, "", &none(), "laptop", "2026-10-03T10:00:00Z", "First version");
    let size1 = r.stored_bytes();
    // 20 small edits
    let mut head = c1.clone();
    let mut k: i64 = 1;
    while k <= 20 {
        let md = deck(40, &format!("Edit number {}", k));
        let tm = format!("2026-10-03T10:{}:00Z", 10 + k);
        head = commit(&mut r, &md, css, &pic, "", &one(&head), "laptop", &tm, &format!("Edit {}", k));
        k += 1;
    }
    let grown = r.stored_bytes() - size1;
    t.ok(grown < 12000, &format!("20 edits cost {} bytes", grown));
    // every version reads back
    let lg = r.log(&head, 100);
    t.eq_int(lg.len() as i64, 21, "21 commits in the log");
    t.eq_str(&lg[0].message, "Edit 20", "newest first");
    t.eq_str(&r.file_text(&c1, "deck.md"), &deck(40, ""), "the first version restores exactly");
    t.eq_str(&r.file_text(&lg[15].id, "deck.md"), &deck(40, "Edit number 5"), "a middle version restores");
    // what changed
    let ch = r.diff_commits(&c1, &head);
    t.eq_int(ch.len() as i64, 1, "one file changed");
    t.eq_str(&ch[0].path, "deck.md", "it is the deck");
    t.eq_int(ch[0].added, 1, "one line added");
    let u = r.diff_text(&c1, &head, "deck.md", 0);
    t.ok(u.contains("+Edit number 20"), "unified diff shows the line");
    // a picture edited as original + recipe: no new blob
    let before = r.stored_bytes();
    let with_recipe = commit(
        &mut r,
        &deck(40, "Edit number 20"),
        css,
        &pic,
        "{\"bright\":20}",
        &one(&head),
        "laptop",
        "2026-10-03T11:00:00Z",
        "Brighter photo",
    );
    let ch2 = r.diff_commits(&head, &with_recipe);
    t.eq_int(ch2.len() as i64, 1, "one change");
    t.eq_str(&ch2[0].kind, "recipe", "only the recipe changed");
    t.ok(r.stored_bytes() - before < 1000, "a recipe edit stores no picture");
    // persistence: every stored object into a new repo
    let mut r2 = Repo::new();
    let ids = r.take_dirty();
    for id in ids.iter() {
        r2.load(&r.stored(id));
    }
    t.eq_str(&r2.file_text(&c1, "deck.md"), &deck(40, ""), "reloaded repo restores the first version");
    t.ok(bytes::equal(&r2.file_bytes(&with_recipe, "media/photo.png"), &pic), "reloaded picture");
    t.eq_int(r.take_dirty().len() as i64, 0, "nothing dirty after taking");
}

fn merging(t: &mut Test) {
    t.start("merge");
    let mut r = Repo::new();
    let pic = image("shot.png");
    let pic2 = image("shot-annotated.png");
    let base = deck(10, "");
    let css = "h2 { color: navy; }";
    let c0 = commit(&mut r, &base, css, &pic, "", &none(), "laptop", "2026-10-03T10:00:00Z", "Base");
    // laptop edits slide 2, phone edits slide 9 and the css
    let mine_md = base.replace("- point one of slide 2", "- point one of slide 2, revised");
    let theirs_md = base.replace("- point two of slide 9", "- point two of slide 9, from the phone");
    let m1 = commit(&mut r, &mine_md, css, &pic, "", &one(&c0), "laptop", "2026-10-03T10:05:00Z", "Laptop edit");
    let t1 = commit(&mut r, &theirs_md, "h2 { color: teal; }", &pic, "", &one(&c0), "phone", "2026-10-03T10:06:00Z", "Phone edit");
    t.eq_str(&r.merge_base(&m1, &t1), &c0, "merge base");
    t.ok(r.is_ancestor(&c0, &m1), "base is an ancestor");
    t.ok(!r.is_ancestor(&m1, &t1), "siblings are not ancestors");
    let mr = r.merge(&m1, &t1);
    t.eq_int(mr.conflicts, 0, "no conflicts");
    let tree = r.merged_tree(&mr, &none());
    let mc = r.commit_tree(&tree, &two(&m1, &t1), "tero", "laptop", "2026-10-03T10:07:00Z", "Merge");
    let merged = r.file_text(&mc, "deck.md");
    t.ok(merged.contains("slide 2, revised"), "laptop edit kept");
    t.ok(merged.contains("from the phone"), "phone edit kept");
    t.eq_str(&r.file_text(&mc, "theme.css"), "h2 { color: teal; }", "css from the phone");
    // the same line on both: a conflict, resolved per region
    let m2 = commit(&mut r, &base.replace("## Slide 3", "## Slide 3: Budget"), css, &pic, "", &one(&c0), "tab1", "2026-10-03T10:10:00Z", "Tab 1");
    let t2 = commit(&mut r, &base.replace("## Slide 3", "## Slide 3: Costs"), css, &pic2, "", &one(&c0), "tab2", "2026-10-03T10:11:00Z", "Tab 2");
    let mr2 = r.merge(&m2, &t2);
    t.eq_int(mr2.conflicts, 1, "one conflicting file");
    t.eq_str(&mr2.files[0].path, "deck.md", "the deck conflicts");
    t.ok(mr2.files[0].text, "a text conflict");
    let mut regions: i64 = -1;
    match &mr2.files[0].merge {
        Some(mm) => regions = mm.conflicts,
        None => {}
    }
    t.eq_int(regions, 1, "one region");
    t.eq_str(&mr2.files[1].result, "theirs", "the picture only changed in tab 2");
    let tr = r.merged_tree(&mr2, &one("both"));
    let mc2 = r.commit_tree(&tr, &two(&m2, &t2), "tero", "tab1", "2026-10-03T10:12:00Z", "Merge tabs");
    let txt = r.file_text(&mc2, "deck.md");
    t.ok(txt.contains("## Slide 3: Budget\n## Slide 3: Costs"), "both kept in order");
    t.ok(bytes::equal(&r.file_bytes(&mc2, "media/photo.png"), &pic2), "picture from tab 2");
    // a picture changed on both sides is a whole-file choice
    let m3 = commit(&mut r, &base, css, &pic, "{\"crop\":[0,0,100,100]}", &one(&c0), "a", "2026-10-03T10:20:00Z", "Crop");
    let t3 = commit(&mut r, &base, css, &pic2, "", &one(&c0), "b", "2026-10-03T10:21:00Z", "Annotate");
    let mr3 = r.merge(&m3, &t3);
    t.eq_int(mr3.conflicts, 1, "picture conflict");
    let tr3 = r.merged_tree(&mr3, &one("theirs"));
    let mut recipe = String::from("?");
    match tr3.find("media/photo.png") {
        Some(pe) => recipe = pe.recipe,
        None => {}
    }
    t.eq_str(&recipe, "", "theirs picked");
    // fast-forward: one side is an ancestor of the other
    let mr4 = r.merge(&c0, &m1);
    t.eq_int(mr4.conflicts, 0, "fast-forward has no conflicts");
    t.eq_str(&mr4.base, &c0, "fast-forward base");
}

/// A version restored and changed again must not make a delta loop.
fn restore(t: &mut Test) {
    t.start("restore");
    let mut r = Repo::new();
    let pic = image("shot.png");
    let v1 = deck(30, "");
    let v2 = deck(30, "second");
    let v3 = deck(30, "third");
    let css = "h2 { color: navy; }";
    let a = commit(&mut r, &v1, css, &pic, "", &none(), "d", "2026-10-03T10:00:00Z", "1");
    let b = commit(&mut r, &v2, css, &pic, "", &one(&a), "d", "2026-10-03T10:01:00Z", "2");
    let c = commit(&mut r, &v3, css, &pic, "", &one(&b), "d", "2026-10-03T10:02:00Z", "3");
    let d = commit(&mut r, &v1, css, &pic, "", &one(&c), "d", "2026-10-03T10:03:00Z", "restore 1");
    let e = commit(&mut r, &v2, css, &pic, "", &one(&d), "d", "2026-10-03T10:04:00Z", "restore 2");
    let f = commit(&mut r, &v3, css, &pic, "", &one(&e), "d", "2026-10-03T10:05:00Z", "restore 3");
    t.eq_str(&r.file_text(&a, "deck.md"), &v1, "v1");
    t.eq_str(&r.file_text(&b, "deck.md"), &v2, "v2");
    t.eq_str(&r.file_text(&c, "deck.md"), &v3, "v3");
    t.eq_str(&r.file_text(&d, "deck.md"), &v1, "v1 restored");
    t.eq_str(&r.file_text(&e, "deck.md"), &v2, "v2 restored");
    t.eq_str(&r.file_text(&f, "deck.md"), &v3, "v3 restored");
    // a blob stored under the id the host computed
    let mut r3 = Repo::new();
    let known = sha256::hash(&pic);
    t.eq_str(&r3.put_blob_id(&known, &pic), &r.put_blob(&pic), "put_blob_id keeps the id");
    t.ok(bytes::equal(&r3.read(&known), &pic), "and the bytes");
}

pub fn run(t: &mut Test) {
    restore(t);
    history(t);
    merging(t);
}
