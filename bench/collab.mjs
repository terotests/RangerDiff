// Real-time editing: RdOt (dist/rangerdiff.mjs) next to Yjs, and RdDelta
// (the byte delta) as the third column. Writes COLLAB.md.
//
//   npm run bench:collab           measure and write COLLAB.md
//   npm run bench:collab -- --check  only check that both converge (CI)
//
// The same edits go to both: one person typing into a deck, then 2-32
// people editing at once with their messages delivered late and out of
// step. Ours goes through RdOtHub (the folder server's rules); Yjs's
// updates are passed between the documents directly, the way a relay
// server would.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as Y from "yjs";
import { RdOtDelta, RdOtClient, RdOtHub, RdDelta } from "../dist/rangerdiff.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const enc = new TextEncoder();
const bytes = (s) => enc.encode(s).length;
const buf = (u8) => {
  const ab = u8.slice().buffer;
  ab._view = new DataView(ab);
  return ab;
};

// a seeded random, so a run can be repeated
function rng(seed) {
  let s = seed >>> 0 || 1;
  return (n) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return Math.floor((s / 4294967296) * n);
  };
}

const deck = ["esittely.md", "raportti.md", "talous.en.md"].map((f) => fs.readFileSync(path.join(root, "testdata", "md", f), "utf8")).join("\n\n");
const words = "the quick brown fox jumps over a lazy dog revenue grew 12 % in Q3 ## Summary - item 😀 ä".split(" ");

// --- 1. one person typing ----------------------------------------------------
// The edits as an editor makes them: a text after each keystroke and the
// caret after it.
function typingScript(seed) {
  const r = rng(seed);
  const edits = [];
  let text = deck;
  let caret = Math.floor(text.length / 2);
  const put = (next, c) => {
    edits.push({ before: text, after: next, caret: c });
    text = next;
    caret = c;
  };
  for (let w = 0; w < 400; w++) {
    const word = words[r(words.length)] + " ";
    for (const ch of word) put(text.slice(0, caret) + ch + text.slice(caret), caret + ch.length);
    if (r(10) === 0) {
      // a typo taken back
      let cut = Math.min(2, caret);
      if (/[\udc00-\udfff]/.test(text[caret - cut] || "")) cut++;
      put(text.slice(0, caret - cut) + text.slice(caret), caret - cut);
    }
    if (r(40) === 0) caret = r(text.length + 1);
    while (caret > 0 && /[\udc00-\udfff]/.test(text[caret] || "")) caret--;
  }
  // a block deleted, a block pasted
  const a = Math.floor(text.length / 4);
  put(text.slice(0, a) + text.slice(a + 500), a);
  const paste = deck.slice(0, 3000);
  put(text.slice(0, a) + paste + text.slice(a), a + paste.length);
  return edits;
}

function typing() {
  const edits = typingScript(7);
  const out = { edits: edits.length };
  // ours: diff in the editor, through the client and the hub, applied by
  // another editor
  {
    const hub = new RdOtHub(deck);
    const a = new RdOtClient(0);
    const b = new RdOtClient(0);
    let other = deck;
    let wire = 0;
    const t0 = performance.now();
    for (const e of edits) {
      const d = RdOtDelta.diff(e.before, e.after, e.caret);
      a.local(d);
      const send = a.takeSend();
      const json = send.toJson();
      wire += bytes(json);
      if (!hub.submit(a.rev, RdOtDelta.fromJson(json), "a")) throw new Error("refused");
      a.ack();
      const logged = hub.log[hub.log.length - 1];
      const got = b.receive(RdOtDelta.fromJson(logged.delta.toJson()));
      other = got.apply(other);
    }
    out.ours = { ms: performance.now() - t0, wire, same: other === edits[edits.length - 1].after && hub.text === other, state: bytes(hub.text) };
  }
  // Yjs: the same insert/delete on a Y.Text, the update applied to a second
  // document
  {
    const da = new Y.Doc();
    const db = new Y.Doc();
    da.getText("md").insert(0, deck);
    Y.applyUpdate(db, Y.encodeStateAsUpdate(da));
    let wire = 0;
    da.on("update", (u) => {
      wire += u.length;
      Y.applyUpdate(db, u);
    });
    const ta = da.getText("md");
    const t0 = performance.now();
    for (const e of edits) {
      const d = RdOtDelta.diff(e.before, e.after, e.caret);
      // the delta as Yjs's own calls
      let pos = 0;
      for (const o of d.ops) {
        if (o.kind === 1) pos += o.n;
        if (o.kind === 2) {
          ta.insert(pos, o.text);
          pos += o.text.length;
        }
        if (o.kind === 3) ta.delete(pos, o.n);
      }
    }
    const ms = performance.now() - t0;
    out.yjs = { ms, wire, same: db.getText("md").toString() === edits[edits.length - 1].after, state: Y.encodeStateAsUpdate(da).length };
  }
  // RdDelta: the whole text each time, as a byte delta
  {
    let wire = 0;
    const t0 = performance.now();
    for (const e of edits) wire += RdDelta.diff(buf(enc.encode(e.before)), buf(enc.encode(e.after))).byteLength;
    out.bytes = { ms: performance.now() - t0, wire };
  }
  return out;
}

// --- 2. many people at once ---------------------------------------------------
function randomEdit(r, text) {
  let at = r(text.length + 1);
  while (at > 0 && /[\udc00-\udfff]/.test(text[at] || "")) at--;
  if (r(4) === 0 && text.length > 0) {
    let n = Math.min(1 + r(6), text.length - at);
    while (n > 0 && /[\udc00-\udfff]/.test(text[at + n] || "")) n--;
    return { at, del: n, ins: "" };
  }
  return { at, del: 0, ins: words[r(words.length)] + " " };
}

function together(people, editsEach, seed) {
  const res = { people, editsEach };
  // ours
  {
    const r = rng(seed);
    const hub = new RdOtHub(deck);
    const cs = Array.from({ length: people }, (_, i) => ({ id: "c" + i, text: deck, ot: new RdOtClient(0), inbox: [], flight: false, left: editsEach }));
    let wire = 0;
    let refused = 0;
    let messages = 0;
    const t0 = performance.now();
    for (;;) {
      const busy = cs.some((c) => c.left > 0 || c.inbox.length || c.ot.waiting());
      if (!busy) break;
      const c = cs[r(people)];
      const what = r(10);
      if (what < 3 && c.left > 0) {
        const e = randomEdit(r, c.text);
        const next = c.text.slice(0, e.at) + e.ins + c.text.slice(e.at + e.del);
        c.ot.local(RdOtDelta.diff(c.text, next, e.at + e.ins.length));
        c.text = next;
        c.left--;
      } else if (what < 7) {
        if (c.inbox.length) {
          const m = c.inbox.shift();
          if (m.client === c.id && c.flight) {
            c.flight = false;
            c.ot.ack();
          } else {
            c.text = c.ot.receive(RdOtDelta.fromJson(m.json)).apply(c.text);
          }
        }
      } else {
        if (!c.flight && c.ot.waiting()) c.ot.resend();
        const s = c.ot.takeSend();
        if (s) {
          const json = s.toJson();
          wire += bytes(json);
          messages++;
          if (hub.submit(c.ot.rev, RdOtDelta.fromJson(json), c.id)) {
            c.flight = true;
            const m = { client: c.id, json: hub.log[hub.log.length - 1].delta.toJson() };
            for (const o of cs) {
              o.inbox.push(m);
              if (o !== c) {
                wire += bytes(m.json);
                messages++;
              }
            }
          } else {
            refused++;
          }
        }
      }
    }
    res.ours = { ms: performance.now() - t0, wire, messages, refused, revs: hub.rev, same: cs.every((c) => c.text === hub.text), state: bytes(hub.text) };
  }
  // Yjs: each update to everyone else, in order, at random later times
  {
    const r = rng(seed);
    const docs = Array.from({ length: people }, (_, i) => {
      const d = new Y.Doc();
      d.clientID = i + 1;
      return { d, inbox: [], left: editsEach };
    });
    docs[0].d.getText("md").insert(0, deck);
    const init = Y.encodeStateAsUpdate(docs[0].d);
    for (const x of docs.slice(1)) Y.applyUpdate(x.d, init);
    let wire = 0;
    let messages = 0;
    for (const x of docs) {
      x.d.on("update", (u, origin) => {
        if (origin === "remote") return;
        for (const o of docs) {
          if (o === x) continue;
          o.inbox.push(u);
          wire += u.length;
          messages++;
        }
      });
    }
    const t0 = performance.now();
    for (;;) {
      const busy = docs.some((x) => x.left > 0 || x.inbox.length);
      if (!busy) break;
      const x = docs[r(people)];
      const what = r(10);
      if (what < 3 && x.left > 0) {
        const t = x.d.getText("md");
        const e = randomEdit(r, t.toString());
        if (e.del) t.delete(e.at, e.del);
        if (e.ins) t.insert(e.at, e.ins);
        x.left--;
      } else if (x.inbox.length) {
        // in the order sent, as a relay server (y-websocket) passes them
        Y.applyUpdate(x.d, x.inbox.shift(), "remote");
      }
    }
    const texts = docs.map((x) => x.d.getText("md").toString());
    res.yjs = { ms: performance.now() - t0, wire, messages, same: texts.every((t) => t === texts[0]), state: Y.encodeStateAsUpdate(docs[0].d).length };
  }
  return res;
}

const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} kB`);
const ms = (v) => (v < 10 ? v.toFixed(2) : v.toFixed(0));

// --- run ----------------------------------------------------------------------
let T0 = performance.now();
const t = typing();
if (!check) console.error(`typing ${ms(performance.now() - T0)} ms`);
const groups = [[2, 300], [8, 150], [32, 60]].map(([p, e], i) => {
  T0 = performance.now();
  const g = together(p, e, 100 + i);
  if (!check) console.error(`${p} people ${ms(performance.now() - T0)} ms`);
  return g;
});
const fails = [];
if (!t.ours.same) fails.push("typing: ours did not converge");
if (!t.yjs.same) fails.push("typing: yjs did not converge");
for (const g of groups) {
  if (!g.ours.same) fails.push(`${g.people} people: ours did not converge`);
  if (!g.yjs.same) fails.push(`${g.people} people: yjs did not converge`);
}
if (fails.length) {
  console.error(fails.join("\n"));
  process.exit(1);
}
if (check) {
  console.log(`ok typing: ${t.edits} edits, ours ${ms(t.ours.ms)} ms, yjs ${ms(t.yjs.ms)} ms`);
  for (const g of groups) console.log(`ok ${g.people} people: ours ${ms(g.ours.ms)} ms (${g.ours.refused} refused), yjs ${ms(g.yjs.ms)} ms`);
  process.exit(0);
}

const L = [];
L.push("# Real-time editing: RdOt next to Yjs");
L.push("");
L.push(`Node ${process.version}, ${os.cpus()[0]?.model || os.arch()}, ${new Date().toISOString().slice(0, 10)}, Yjs ${JSON.parse(fs.readFileSync(path.join(root, "node_modules", "yjs", "package.json"), "utf8")).version}. ` +
  "`npm run bench:collab` writes this file; `-- --check` (CI) only checks that both converge.");
L.push("");
L.push("RdOt is operational transformation with one server putting the edits in order (`RdOtHub`, the folder server's rules); " +
  "an edit is the Quill Delta JSON (`[{\"retain\":5},{\"insert\":\"x\"}]`). Yjs is a CRDT: its updates are binary; here they reach each document in the order sent, as through y-websocket. " +
  "\"wire\" is every message sent (client to server and server to the others for RdOt; to every other document for Yjs). " +
  "\"state\" is what a newcomer loads: the text for RdOt, `Y.encodeStateAsUpdate` for Yjs (which keeps ids and deleted text).");
L.push("");
L.push(`## One person typing (${t.edits} edits on a ${kb(bytes(deck))} deck)`);
L.push("");
L.push("Words typed in the middle with typos taken back, the caret moved now and then, 500 characters deleted and 3 kB pasted; each edit goes to a second editor.");
L.push("");
L.push("| | time | per edit | wire | per edit | state |");
L.push("| --- | ---: | ---: | ---: | ---: | ---: |");
const per = (v) => (v / t.edits);
L.push(`| RdOt | ${ms(t.ours.ms)} ms | ${(1000 * per(t.ours.ms)).toFixed(1)} µs | ${kb(t.ours.wire)} | ${per(t.ours.wire).toFixed(1)} B | ${kb(t.ours.state)} |`);
L.push(`| Yjs | ${ms(t.yjs.ms)} ms | ${(1000 * per(t.yjs.ms)).toFixed(1)} µs | ${kb(t.yjs.wire)} | ${per(t.yjs.wire).toFixed(1)} B | ${kb(t.yjs.state)} |`);
L.push(`| RdDelta of the whole text | ${ms(t.bytes.ms)} ms | ${(1000 * per(t.bytes.ms)).toFixed(1)} µs | ${kb(t.bytes.wire)} | ${per(t.bytes.wire).toFixed(1)} B | – |`);
L.push("");
L.push("RdOt's time includes making the delta from the editor's text (the diff), JSON both ways, the hub and the second editor applying it; Yjs's is its own insert/delete and applying the update.");
L.push("");
L.push("## Many people at once");
L.push("");
L.push("Each person types words or deletes a few characters at random places; messages wait and arrive late in a random schedule. All copies must end the same.");
L.push("");
L.push("| people | edits | | time | wire | messages | stale sends | state |");
L.push("| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |");
for (const g of groups) {
  const n = g.people * g.editsEach;
  L.push(`| ${g.people} | ${n} | RdOt | ${ms(g.ours.ms)} ms | ${kb(g.ours.wire)} | ${g.ours.messages} | ${g.ours.refused} | ${kb(g.ours.state)} |`);
  L.push(`| | | Yjs | ${ms(g.yjs.ms)} ms | ${kb(g.yjs.wire)} | ${g.yjs.messages} | – | ${kb(g.yjs.state)} |`);
}
L.push("");
L.push("\"Stale sends\": an edit sent while the person's copy was behind is refused and sent again after the missed edits (Firepad's way, which keeps the transform in the client only). " +
  "The schedule here delays messages far more than a local network does, so this is the worst case; on the folder server the missed edits come back in the refusal itself.");
L.push("");
fs.writeFileSync(path.join(root, "COLLAB.md"), L.join("\n"));
console.log(L.join("\n"));
