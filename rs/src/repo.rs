//! Versions as commits, like git, over a store the host keeps, as
//! ../src/RdRepo.rgr.
//!
//!   blob    a file's bytes; id = SHA-256 of the bytes
//!   tree    the files of one version: path → blob id (+ an optional recipe,
//!           e.g. the edits of a picture kept as the original + "bright=20")
//!   commit  tree, parents (0 first, 1 normal, 2 a merge), author, device,
//!           time, message; id = SHA-256 of its text
//!
//! A blob is stored whole or as a delta against another blob. When a commit
//! changes a file, the previous version of that file becomes a reverse delta
//! against the new one (when that is clearly smaller): the newest version
//! stays whole, history costs only its changes. A chain is cut at
//! `max_chain` deltas by keeping a version whole.
//!
//! The host persists `stored(id)` for each id `take_dirty()` returns, and
//! gives them back with `load(bytes)`.
use crate::bytes;
use crate::bytes::{Reader, Writer};
use crate::delta;
use crate::sha256;
use crate::smart;
use crate::text;
use crate::text::Merge;
use std::collections::HashMap;

/// One file of a tree (zip::Entry is a part of an archive).
#[derive(Clone)]
pub struct TreeEntry {
    pub path: String,
    pub blob: String,
    pub size: i64,
    /// "" or the edits of a derived file (JSON, the host's own format)
    pub recipe: String,
}

/// The files of one version.
pub struct Tree {
    pub entries: Vec<TreeEntry>,
}

impl Tree {
    pub fn new() -> Tree {
        Tree { entries: Vec::new() }
    }

    pub fn find(&self, path: &str) -> Option<TreeEntry> {
        for e in self.entries.iter() {
            if e.path == path {
                return Some(e.clone());
            }
        }
        None
    }

    pub fn text(&self) -> String {
        let mut lines: Vec<String> = Vec::new();
        for e in self.entries.iter() {
            let mut l = format!("{}\t{}\t{}", e.path, e.blob, e.size);
            if !e.recipe.is_empty() {
                l = format!("{}\t{}", l, e.recipe);
            }
            lines.push(l);
        }
        lines.join("\n")
    }

    pub fn parse(s: &str) -> Tree {
        let mut t = Tree::new();
        if s.is_empty() {
            return t;
        }
        for l in s.split('\n') {
            let mut f: Vec<String> = Vec::new();
            for part in l.split('\t') {
                f.push(String::from(part));
            }
            if f.len() >= 3 {
                let mut recipe = String::new();
                if f.len() >= 4 {
                    // a recipe may hold tabs of its own
                    recipe = text::slice(&f, 3, f.len() as i64).join("\t");
                }
                t.entries.push(TreeEntry { path: f[0].clone(), blob: f[1].clone(), size: to_int(&f[2]), recipe: recipe });
            }
        }
        t
    }
}

/// One version.
#[derive(Clone)]
pub struct Commit {
    pub id: String,
    pub tree: String,
    pub parents: Vec<String>,
    pub author: String,
    pub device: String,
    pub time: String,
    pub message: String,
}

impl Commit {
    pub fn text(&self) -> String {
        let mut lines: Vec<String> = Vec::new();
        lines.push(format!("tree {}", self.tree));
        for p in self.parents.iter() {
            lines.push(format!("parent {}", p));
        }
        lines.push(format!("author {}", self.author));
        lines.push(format!("device {}", self.device));
        lines.push(format!("time {}", self.time));
        lines.push(String::new());
        lines.push(self.message.clone());
        lines.join("\n")
    }

    pub fn parse(id: &str, s: &str) -> Commit {
        let mut c = Commit {
            id: id.to_string(),
            tree: String::new(),
            parents: Vec::new(),
            author: String::new(),
            device: String::new(),
            time: String::new(),
            message: String::new(),
        };
        let lines = text::lines(s);
        let n = lines.len() as i64;
        let mut i: i64 = 0;
        while i < n {
            let l = lines[i as usize].clone();
            if l.is_empty() {
                c.message = text::slice(&lines, i + 1, n).join("\n");
                break;
            }
            let mut key = String::new();
            let mut val = String::new();
            match l.find(' ') {
                Some(sp) => {
                    key = l[0..sp].to_string();
                    val = l[sp + 1..].to_string();
                }
                None => {}
            }
            if key == "tree" {
                c.tree = val;
            } else if key == "parent" {
                c.parents.push(val);
            } else if key == "author" {
                c.author = val;
            } else if key == "device" {
                c.device = val;
            } else if key == "time" {
                c.time = val;
            }
            i += 1;
        }
        c
    }
}

/// One stored object: whole, or a delta against another object.
#[derive(Clone)]
pub struct Stored {
    pub id: String,
    /// 0 whole, 1 delta
    pub kind: i64,
    pub base: String,
    pub data: Vec<u8>,
    /// deltas between this and a whole object
    pub depth: i64,
}

impl Stored {
    pub fn whole(id: &str, data: &Vec<u8>) -> Stored {
        Stored { id: id.to_string(), kind: 0, base: String::new(), data: data.clone(), depth: 0 }
    }

    pub fn encode(&self) -> Vec<u8> {
        let mut w = Writer::new();
        w.byte(82);
        w.byte(79);
        w.byte(1);
        w.byte(self.kind);
        w.text(&self.id);
        w.text(&self.base);
        w.varint(self.depth);
        w.varint(self.data.len() as i64);
        w.all(&self.data);
        w.to_bytes()
    }

    pub fn decode(b: &Vec<u8>) -> Option<Stored> {
        let mut rd = Reader::new(b);
        if rd.byte() != 82 || rd.byte() != 79 || rd.byte() != 1 {
            return None;
        }
        let kind = rd.byte();
        let id = rd.text();
        let base = rd.text();
        let depth = rd.varint();
        let n = rd.varint();
        let data = rd.bytes(n);
        if rd.failed {
            return None;
        }
        Some(Stored { id: id, kind: kind, base: base, data: data, depth: depth })
    }
}

/// One file of a diff between two trees.
pub struct FileChange {
    pub path: String,
    /// "added", "removed", "changed", "recipe" (only the recipe changed)
    pub kind: String,
    pub old_blob: String,
    pub new_blob: String,
    pub old_size: i64,
    pub new_size: i64,
    pub old_recipe: String,
    pub new_recipe: String,
    /// text files: lines
    pub added: i64,
    pub removed: i64,
}

impl FileChange {
    pub fn new(path: &str, kind: &str) -> FileChange {
        FileChange {
            path: path.to_string(),
            kind: kind.to_string(),
            old_blob: String::new(),
            new_blob: String::new(),
            old_size: 0,
            new_size: 0,
            old_recipe: String::new(),
            new_recipe: String::new(),
            added: 0,
            removed: 0,
        }
    }
}

/// One file of a three-way merge.
pub struct FileMerge {
    pub path: String,
    /// "same", "mine", "theirs", "merged", "conflict"
    pub result: String,
    pub text: bool,
    pub merge: Option<Merge>,
    /// the entry that is used when this is not a conflict
    pub entry: Option<TreeEntry>,
    pub mine: Option<TreeEntry>,
    pub theirs: Option<TreeEntry>,
}

/// A three-way merge of two commits.
pub struct RepoMerge {
    pub base: String,
    pub mine: String,
    pub theirs: String,
    pub files: Vec<FileMerge>,
    pub conflicts: i64,
}

/// The object store and what is done with it.
pub struct Repo {
    pub objects: HashMap<String, Stored>,
    pub dirty: Vec<String>,
    pub max_chain: i64,
}

impl Repo {
    pub fn new() -> Repo {
        Repo { objects: HashMap::new(), dirty: Vec::new(), max_chain: 16 }
    }

    // ------------------------------------------------------------ storage

    pub fn has(&self, id: &str) -> bool {
        self.objects.contains_key(id)
    }

    pub fn put(&mut self, s: Stored) {
        self.dirty.push(s.id.clone());
        self.objects.insert(s.id.clone(), s);
    }

    pub fn load(&mut self, b: &Vec<u8>) -> bool {
        match Stored::decode(b) {
            Some(s) => {
                self.objects.insert(s.id.clone(), s);
                true
            }
            None => false,
        }
    }

    pub fn stored(&self, id: &str) -> Vec<u8> {
        match self.objects.get(id) {
            Some(s) => s.encode(),
            None => Vec::new(),
        }
    }

    /// The ids stored or changed since the last call.
    pub fn take_dirty(&mut self) -> Vec<String> {
        let mut out: Vec<String> = Vec::new();
        let mut seen: HashMap<String, bool> = HashMap::new();
        for id in self.dirty.iter() {
            if !seen.contains_key(id) {
                seen.insert(id.clone(), true);
                out.push(id.clone());
            }
        }
        self.dirty = Vec::new();
        out
    }

    pub fn read(&self, id: &str) -> Vec<u8> {
        self.read_at(id, 0)
    }

    /// Empty when the object or a base is missing, or a chain runs past 64.
    pub fn read_at(&self, id: &str, depth: i64) -> Vec<u8> {
        if depth > 64 {
            return Vec::new();
        }
        match self.objects.get(id) {
            Some(s) => {
                if s.kind == 0 {
                    return s.data.clone();
                }
                let base_bytes = self.read_at(&s.base, depth + 1);
                smart::apply(&base_bytes, &s.data).data
            }
            None => Vec::new(),
        }
    }

    pub fn read_text(&self, id: &str) -> String {
        bytes::to_text(&self.read(id))
    }

    pub fn put_blob(&mut self, data: &Vec<u8>) -> String {
        let id = sha256::hash(data);
        if !self.has(&id) {
            self.put(Stored::whole(&id, data));
        }
        id
    }

    /// A blob whose SHA-256 the host computed already; the id is trusted.
    pub fn put_blob_id(&mut self, id: &str, data: &Vec<u8>) -> String {
        if !self.has(id) {
            self.put(Stored::whole(id, data));
        }
        id.to_string()
    }

    pub fn put_text(&mut self, s: &str) -> String {
        self.put_blob(&bytes::from_text(s))
    }

    /// Stores `old_id` as a delta against `new_id` when that is clearly
    /// smaller.
    pub fn deltify(&mut self, old_id: &str, new_id: &str) {
        if old_id == new_id || !self.has(old_id) || !self.has(new_id) {
            return;
        }
        let old = self.objects[old_id].clone();
        let new_depth = self.objects[new_id].depth;
        if old.kind != 0 {
            return;
        }
        // the new one must not depend on the old one (anywhere down its
        // chain: a version restored and changed again would make a loop),
        // and the chain stays short
        if new_depth >= self.max_chain {
            return;
        }
        let mut cur = new_id.to_string();
        let mut steps: i64 = 0;
        while self.objects[&cur].kind == 1 && steps <= self.max_chain {
            let next = self.objects[&cur].base.clone();
            if next == old_id || !self.has(&next) {
                return;
            }
            cur = next;
            steps += 1;
        }
        let old_bytes = old.data;
        let new_bytes = self.read(new_id);
        let mut d = smart::diff(&new_bytes, &old_bytes);
        // the delta must rebuild the old bytes exactly
        if !smart::exact(&d) {
            let r = smart::apply(&new_bytes, &d);
            if !bytes::equal(&r.data, &old_bytes) {
                d = delta::diff(&new_bytes, &old_bytes);
            }
        }
        if d.len() * 5 >= old_bytes.len() * 4 {
            return;
        }
        self.put(Stored { id: old_id.to_string(), kind: 1, base: new_id.to_string(), data: d, depth: new_depth + 1 });
    }

    // ------------------------------------------------------------- commits

    pub fn tree(&self, id: &str) -> Tree {
        Tree::parse(&self.read_text(id))
    }

    pub fn commit(&self, id: &str) -> Option<Commit> {
        if !self.has(id) {
            return None;
        }
        Some(Commit::parse(id, &self.read_text(id)))
    }

    /// A new version.
    pub fn commit_tree(&mut self, t: &Tree, parents: &Vec<String>, author: &str, device: &str, time: &str, message: &str) -> String {
        // sorted by path, so the same files make the same tree
        let mut paths: Vec<String> = Vec::new();
        for e in t.entries.iter() {
            paths.push(e.path.clone());
        }
        let mut sorted = Tree::new();
        for p in sort_strings(&paths).iter() {
            match t.find(p) {
                Some(e) => sorted.entries.push(e),
                None => {}
            }
        }
        let tree_id = self.put_text(&sorted.text());
        let c = Commit {
            id: String::new(),
            tree: tree_id,
            parents: parents.clone(),
            author: author.to_string(),
            device: device.to_string(),
            time: time.to_string(),
            message: message.to_string(),
        };
        let id = self.put_text(&c.text());
        // history as reverse deltas: each parent's version of a changed file
        for pid in parents.iter() {
            match self.commit(pid) {
                Some(pc) => {
                    let pt = self.tree(&pc.tree);
                    for ne in sorted.entries.iter() {
                        match pt.find(&ne.path) {
                            Some(o) => {
                                if o.blob != ne.blob {
                                    self.deltify(&o.blob, &ne.blob);
                                }
                            }
                            None => {}
                        }
                    }
                }
                None => {}
            }
        }
        id
    }

    /// A tree entry for `data` at `path`.
    pub fn entry_of(&mut self, path: &str, data: &Vec<u8>, recipe: &str) -> TreeEntry {
        let blob = self.put_blob(data);
        TreeEntry { path: path.to_string(), blob: blob, size: data.len() as i64, recipe: recipe.to_string() }
    }

    /// Newest first, every commit reachable from `head` once.
    pub fn log(&self, head: &str, limit: i64) -> Vec<Commit> {
        let mut out: Vec<Commit> = Vec::new();
        let mut seen: HashMap<String, bool> = HashMap::new();
        let mut queue: Vec<String> = Vec::new();
        queue.push(head.to_string());
        while !queue.is_empty() && (out.len() as i64) < limit {
            // take the newest by time
            let mut best_i: usize = 0;
            let mut best: Option<Commit> = None;
            let mut best_time = String::new();
            let mut qi: usize = 0;
            while qi < queue.len() {
                match self.commit(&queue[qi]) {
                    Some(cc) => {
                        if best.is_none() || cmp(&cc.time, &best_time) > 0 {
                            best_time = cc.time.clone();
                            best = Some(cc);
                            best_i = qi;
                        }
                    }
                    None => {}
                }
                qi += 1;
            }
            match best {
                Some(c) => {
                    queue.remove(best_i);
                    if !seen.contains_key(&c.id) {
                        seen.insert(c.id.clone(), true);
                        for p in c.parents.iter() {
                            if !seen.contains_key(p) {
                                queue.push(p.clone());
                            }
                        }
                        out.push(c);
                    }
                }
                None => break,
            }
        }
        out
    }

    pub fn ancestors(&self, head: &str) -> HashMap<String, bool> {
        let mut seen: HashMap<String, bool> = HashMap::new();
        let mut stack: Vec<String> = Vec::new();
        stack.push(head.to_string());
        while !stack.is_empty() {
            let id = stack.remove(stack.len() - 1);
            if !seen.contains_key(&id) {
                seen.insert(id.clone(), true);
                match self.commit(&id) {
                    Some(c) => {
                        for p in c.parents.iter() {
                            stack.push(p.clone());
                        }
                    }
                    None => {}
                }
            }
        }
        seen
    }

    pub fn is_ancestor(&self, a: &str, b: &str) -> bool {
        self.ancestors(b).contains_key(a)
    }

    /// The newest common ancestor of a and b ("" when none).
    pub fn merge_base(&self, a: &str, b: &str) -> String {
        let anc = self.ancestors(a);
        let mut best = String::new();
        let mut best_time = String::new();
        let mut seen: HashMap<String, bool> = HashMap::new();
        let mut stack: Vec<String> = Vec::new();
        stack.push(b.to_string());
        while !stack.is_empty() {
            let id = stack.remove(stack.len() - 1);
            if !seen.contains_key(&id) {
                seen.insert(id.clone(), true);
                match self.commit(&id) {
                    Some(c) => {
                        if anc.contains_key(&id) {
                            if best.is_empty() || cmp(&c.time, &best_time) > 0 {
                                best = id.clone();
                                best_time = c.time.clone();
                            }
                        } else {
                            for p in c.parents.iter() {
                                stack.push(p.clone());
                            }
                        }
                    }
                    None => {}
                }
            }
        }
        best
    }

    // ---------------------------------------------------------------- diff

    pub fn diff_trees(&self, a_id: &str, b_id: &str) -> Vec<FileChange> {
        let a = self.tree(a_id);
        let b = self.tree(b_id);
        let mut out: Vec<FileChange> = Vec::new();
        for nb in b.entries.iter() {
            match a.find(&nb.path) {
                None => {
                    let mut c = FileChange::new(&nb.path, "added");
                    c.new_blob = nb.blob.clone();
                    c.new_size = nb.size;
                    c.new_recipe = nb.recipe.clone();
                    out.push(c);
                }
                Some(o) => {
                    if o.blob != nb.blob || o.recipe != nb.recipe {
                        let mut c = FileChange::new(&nb.path, "changed");
                        if o.blob == nb.blob {
                            c.kind = "recipe".to_string();
                        }
                        c.old_blob = o.blob.clone();
                        c.new_blob = nb.blob.clone();
                        c.old_size = o.size;
                        c.new_size = nb.size;
                        c.old_recipe = o.recipe.clone();
                        c.new_recipe = nb.recipe.clone();
                        if o.blob != nb.blob && is_text_path(&nb.path) {
                            let ld = text::diff(&self.read_text(&o.blob), &self.read_text(&nb.blob));
                            c.added = ld.added;
                            c.removed = ld.removed;
                        }
                        out.push(c);
                    }
                }
            }
        }
        for oe in a.entries.iter() {
            if b.find(&oe.path).is_none() {
                let mut c = FileChange::new(&oe.path, "removed");
                c.old_blob = oe.blob.clone();
                c.old_size = oe.size;
                c.old_recipe = oe.recipe.clone();
                out.push(c);
            }
        }
        out
    }

    /// What commit b changed against commit a.
    pub fn diff_commits(&self, a: &str, b: &str) -> Vec<FileChange> {
        let ca = self.commit(a);
        let cb = self.commit(b);
        if ca.is_none() || cb.is_none() {
            return Vec::new();
        }
        self.diff_trees(&ca.unwrap().tree, &cb.unwrap().tree)
    }

    /// The unified text diff of one file between two commits.
    pub fn diff_text(&self, a: &str, b: &str, path: &str, context: i64) -> String {
        let old_text = self.file_text(a, path);
        let new_text = self.file_text(b, path);
        text::unified(&text::diff(&old_text, &new_text), context)
    }

    fn file_entry(&self, commit_id: &str, path: &str) -> Option<TreeEntry> {
        match self.commit(commit_id) {
            Some(c) => self.tree(&c.tree).find(path),
            None => None,
        }
    }

    pub fn file_text(&self, commit_id: &str, path: &str) -> String {
        match self.file_entry(commit_id, path) {
            Some(e) => self.read_text(&e.blob),
            None => String::new(),
        }
    }

    pub fn file_bytes(&self, commit_id: &str, path: &str) -> Vec<u8> {
        match self.file_entry(commit_id, path) {
            Some(e) => self.read(&e.blob),
            None => Vec::new(),
        }
    }

    // --------------------------------------------------------------- merge

    /// Three-way merge of two commits. Files only one side changed are taken
    /// from it; text files both changed are merged by lines; anything else
    /// both changed differently is a conflict for the user.
    pub fn merge(&mut self, mine: &str, theirs: &str) -> RepoMerge {
        let base = self.merge_base(mine, theirs);
        let mut bt = Tree::new();
        if !base.is_empty() {
            match self.commit(&base) {
                Some(bc) => bt = self.tree(&bc.tree),
                None => {}
            }
        }
        let mt = self.tree_of(mine);
        let tt = self.tree_of(theirs);
        // every path of the three trees, once
        let mut paths: Vec<String> = Vec::new();
        let mut seen: HashMap<String, bool> = HashMap::new();
        for t in [&mt, &tt, &bt].iter() {
            for e in t.entries.iter() {
                if !seen.contains_key(&e.path) {
                    seen.insert(e.path.clone(), true);
                    paths.push(e.path.clone());
                }
            }
        }
        let mut res = RepoMerge { base: base, mine: mine.to_string(), theirs: theirs.to_string(), files: Vec::new(), conflicts: 0 };
        for p in sort_strings(&paths).iter() {
            let b = bt.find(p);
            let m = mt.find(p);
            let t = tt.find(p);
            let mut f = FileMerge {
                path: p.clone(),
                result: String::new(),
                text: false,
                merge: None,
                entry: None,
                mine: m.clone(),
                theirs: t.clone(),
            };
            if same_entry(&m, &t) {
                f.result = "same".to_string();
                f.entry = m.clone();
            } else if same_entry(&b, &t) {
                f.result = "mine".to_string();
                f.entry = m.clone();
            } else if same_entry(&b, &m) {
                f.result = "theirs".to_string();
                f.entry = t.clone();
            } else {
                f.result = "conflict".to_string();
                // both changed: lines can be merged when it is text on both
                // sides and the recipe is the same
                if m.is_some() && t.is_some() && is_text_path(p) && recipe_of(&m) == recipe_of(&t) {
                    let mut base_text = String::new();
                    if b.is_some() {
                        base_text = self.read_text(&blob_of(&b));
                    }
                    let mm = text::merge3(&base_text, &self.read_text(&blob_of(&m)), &self.read_text(&blob_of(&t)));
                    f.text = true;
                    if mm.clean() {
                        f.result = "merged".to_string();
                        let merged = bytes::from_text(&mm.text("markers"));
                        f.entry = Some(self.entry_of(p, &merged, &recipe_of(&m)));
                    }
                    f.merge = Some(mm);
                }
            }
            if f.result == "conflict" {
                res.conflicts += 1;
            }
            res.files.push(f);
        }
        res
    }

    /// The merge result as a tree. `picks`: for each conflict in order,
    /// "mine", "theirs" (whole file) or, for a text conflict, a pick per
    /// conflicting region joined with "," ("mine,theirs,both").
    pub fn merged_tree(&mut self, res: &RepoMerge, picks: &Vec<String>) -> Tree {
        let mut t = Tree::new();
        let mut k: usize = 0;
        for f in res.files.iter() {
            if f.result != "conflict" {
                match &f.entry {
                    Some(e) => t.entries.push(e.clone()),
                    None => {}
                }
                continue;
            }
            let mut pick = String::from("mine");
            if k < picks.len() {
                pick = picks[k].clone();
            }
            k += 1;
            if pick == "theirs" {
                match &f.theirs {
                    Some(e) => t.entries.push(e.clone()),
                    None => {}
                }
            } else if pick == "mine" || !f.text {
                match &f.mine {
                    Some(e) => t.entries.push(e.clone()),
                    None => {}
                }
            } else {
                let mut region_picks: Vec<String> = Vec::new();
                for r in pick.split(',') {
                    region_picks.push(String::from(r));
                }
                let mut txt = String::new();
                match &f.merge {
                    Some(mm) => txt = mm.resolve(&region_picks),
                    None => {}
                }
                let e = self.entry_of(&f.path, &bytes::from_text(&txt), &recipe_of(&f.mine));
                t.entries.push(e);
            }
        }
        t
    }

    /// Bytes stored for all objects (whole + deltas).
    pub fn stored_bytes(&self) -> i64 {
        let mut total: i64 = 0;
        for s in self.objects.values() {
            total += s.data.len() as i64;
        }
        total
    }

    pub fn tree_of(&self, commit_id: &str) -> Tree {
        match self.commit(commit_id) {
            Some(c) => self.tree(&c.tree),
            None => Tree::new(),
        }
    }
}

pub fn is_text_path(path: &str) -> bool {
    let exts = [".md", ".markdown", ".txt", ".css", ".json", ".csv", ".tsv", ".svg", ".html", ".xml", ".yaml", ".yml", ".js", ".rgr"];
    let lower = path.to_lowercase();
    for e in exts.iter() {
        if lower.ends_with(e) {
            return true;
        }
    }
    false
}

pub fn same_entry(a: &Option<TreeEntry>, b: &Option<TreeEntry>) -> bool {
    match (a, b) {
        (None, None) => true,
        (Some(x), Some(y)) => x.blob == y.blob && x.recipe == y.recipe,
        _ => false,
    }
}

pub fn blob_of(e: &Option<TreeEntry>) -> String {
    match e {
        Some(v) => v.blob.clone(),
        None => String::new(),
    }
}

pub fn recipe_of(e: &Option<TreeEntry>) -> String {
    match e {
        Some(v) => v.recipe.clone(),
        None => String::new(),
    }
}

/// The digits of `s` as an int; other characters are skipped.
pub fn to_int(s: &str) -> i64 {
    let mut v: i64 = 0;
    for c in s.chars() {
        if c >= '0' && c <= '9' {
            v = v * 10 + (c as i64 - 48);
        }
    }
    v
}

/// Compares by characters (ISO times and ASCII paths sort right).
pub fn cmp(a: &str, b: &str) -> i64 {
    let ac: Vec<char> = a.chars().collect();
    let bc: Vec<char> = b.chars().collect();
    let mut i: usize = 0;
    while i < ac.len() && i < bc.len() {
        if ac[i] != bc[i] {
            return ac[i] as i64 - bc[i] as i64;
        }
        i += 1;
    }
    ac.len() as i64 - bc.len() as i64
}

/// Insertion sort: trees are small.
pub fn sort_strings(list: &Vec<String>) -> Vec<String> {
    let mut out: Vec<String> = list.clone();
    let n = out.len() as i64;
    let mut k: i64 = 1;
    while k < n {
        let cur = out[k as usize].clone();
        let mut j = k - 1;
        while j >= 0 && cmp(&out[j as usize], &cur) > 0 {
            out[(j + 1) as usize] = out[j as usize].clone();
            j -= 1;
        }
        out[(j + 1) as usize] = cur;
        k += 1;
    }
    out
}
