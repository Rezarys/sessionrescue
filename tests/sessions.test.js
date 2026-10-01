const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const s = require("../sessions.js");

const ROOT = path.join(__dirname, "..");

// An example export in the shape the extension writes, with made-up tabs.
const EXPORT = [
  {
    windows: {
      12: {
        40: { id: 40, index: 1, windowId: 12, url: "https://example.org/b", title: "Page B" },
        41: { id: 41, index: 0, windowId: 12, url: "https://example.com/", title: "Example Domain" },
      },
      13: { 50: { id: 50, index: 0, windowId: 13, url: "about:config", title: "Advanced Preferences" } },
    },
    windowsNumber: 2,
    windowsInfo: { 12: { id: 12, width: 1200 }, 13: { id: 13 } },
    tabsNumber: 3,
    name: "Work",
    date: 1759190400000,
    lastEditedTime: 1759190400000,
    tag: ["research"],
    sessionStartTime: 1759180000000,
    id: "9593221a-3626-49fc-9f80-ab5c417507d3",
    tabGroups: [{ id: 7, title: "kept" }],
  },
  {
    windows: { 1: { 2: { id: 2, index: 0, windowId: 1, url: "https://example.net/", title: "" } } },
    windowsNumber: 1,
    windowsInfo: {},
    tabsNumber: 1,
    name: "",
    date: 1759276800000,
    lastEditedTime: 1759276800000,
    tag: [],
    sessionStartTime: 1759276000000,
    id: "11111111-2222-4333-8444-555555555555",
  },
];

const README_SAMPLE = [
  "Work #research (2025-09-30), 3 tabs",
  "Window 1",
  "- Example Domain",
  "  https://example.com/",
  "- Page B",
  "  https://example.org/b",
  "Window 2",
  "- Advanced Preferences",
  "  about:config",
  "",
  "Unnamed session (2025-10-01), 1 tab",
  "Window 1",
  "- https://example.net/",
  "  https://example.net/",
  "",
].join("\n");

const text = (o) => JSON.stringify(o, null, "  ");

test("reads an export and keeps tab order inside each window", () => {
  const views = s.summarize(s.parseExport(text(EXPORT)));
  assert.strictEqual(views.length, 2);
  assert.deepStrictEqual(views[0].windows[0].map((t) => t.title), ["Example Domain", "Page B"]);
  assert.strictEqual(views[0].tabCount, 3);
  assert.strictEqual(views[1].name, "Unnamed session");
  assert.strictEqual(views[1].windows[0][0].title, "https://example.net/");
});

test("text list matches the sample in the README", () => {
  const out = s.textList(s.summarize(s.parseExport(text(EXPORT))));
  assert.strictEqual(out, README_SAMPLE);
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  assert.ok(readme.includes("```\n" + README_SAMPLE + "```"), "README sample is out of date");
});

test("ignores a byte order mark", () => {
  assert.strictEqual(s.parseExport("﻿" + text(EXPORT)).length, 2);
});

test("accepts a single session object", () => {
  assert.strictEqual(s.parseExport(text(EXPORT[0])).length, 1);
});

test("refuses files that are not an export", () => {
  assert.throws(() => s.parseExport("not json"), s.ExportError);
  assert.throws(() => s.parseExport("[]"), s.ExportError);
  assert.throws(() => s.parseExport('{"sessions": []}'), s.ExportError);
  assert.throws(() => s.parseExport('[{"name": "x"}]'), s.ExportError);
});

test("fresh copy changes only id and last edited time", () => {
  let n = 0;
  const out = JSON.parse(s.freshCopy(EXPORT, 1760000000000, () => "new-" + ++n));
  assert.deepStrictEqual(out.map((x) => x.id), ["new-1", "new-2"]);
  for (let i = 0; i < out.length; i++) {
    assert.strictEqual(out[i].lastEditedTime, 1760000000000);
    const a = { ...out[i] };
    const b = { ...EXPORT[i] };
    delete a.id; delete a.lastEditedTime; delete b.id; delete b.lastEditedTime;
    assert.deepStrictEqual(a, JSON.parse(JSON.stringify(b)));
  }
  assert.strictEqual(EXPORT[0].id, "9593221a-3626-49fc-9f80-ab5c417507d3", "input must not be modified");
});

test("fresh copy has every key the extension checks for on import", () => {
  const old = [{ windows: { 1: { 1: { url: "https://a.example/" }, 2: { url: "https://b.example/" } } }, date: 5 }];
  const out = JSON.parse(s.freshCopy(old, 99, () => "x"));
  for (const k of ["windows", "tabsNumber", "name", "date", "tag", "sessionStartTime"]) {
    assert.ok(Object.keys(out[0]).includes(k), "missing " + k);
  }
  assert.strictEqual(out[0].tabsNumber, 2);
  assert.strictEqual(out[0].sessionStartTime, 5);
  assert.deepStrictEqual(out[0].tag, []);
});

test("old string tags are shown as a list", () => {
  const old = [{ windows: { 1: { 1: { url: "https://a.example/", title: "A" } } }, tag: "one two", date: "2019-05-01" }];
  const v = s.summarize(old)[0];
  assert.deepStrictEqual(v.tags, ["one", "two"]);
  assert.strictEqual(v.date, "2019-05-01");
});

test("bookmarks file has folders per session and window and skips unsafe links", () => {
  const html = s.bookmarksHtml(s.summarize(EXPORT));
  assert.ok(html.startsWith("<!DOCTYPE NETSCAPE-Bookmark-file-1>"));
  assert.ok(html.includes("<DT><H3>Work #research (2025-09-30)</H3>"));
  assert.ok(html.includes("<DT><H3>Window 2</H3>"));
  assert.ok(html.includes('<DT><A HREF="https://example.com/">Example Domain</A>'));
  assert.ok(!html.includes("about:config"));
  assert.strictEqual((html.match(/<DL><p>/g) || []).length, (html.match(/<\/DL><p>/g) || []).length);
});

test("bookmarks file escapes titles and addresses", () => {
  const evil = [{ windows: { 1: { 1: { url: 'https://a.example/?q="><script>', title: "<b>&</b>" } } }, name: "x", date: 0 }];
  const html = s.bookmarksHtml(s.summarize(evil));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<b>"));
  assert.ok(html.includes("&lt;b&gt;&amp;&lt;/b&gt;"));
  assert.ok(html.includes("&quot;&gt;&lt;script&gt;"));
});

test("only web and file links are treated as safe", () => {
  for (const u of ["https://a.example/", "http://a.example/", "HTTPS://A.EXAMPLE/", "ftp://a.example/", "file:///tmp/x"]) {
    assert.ok(s.isSafeUrl(u), u);
  }
  for (const u of ["javascript:alert(1)", " javascript:alert(1)", "data:text/html,x", "about:config", "chrome://settings", "", null]) {
    assert.ok(!s.isSafeUrl(u), String(u));
  }
});

test("public files have no long dash", () => {
  const dash = String.fromCharCode(0x2014);
  for (const f of ["README.md", "index.html", "app.js", "sessions.js", "style.css"]) {
    assert.ok(!fs.readFileSync(path.join(ROOT, f), "utf8").includes(dash), f);
  }
});
