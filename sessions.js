// Reads a Tab Session Manager export (a JSON array of sessions) for the page and its three files.
// The files are: a copy with fresh ids, a bookmarks file and a plain text list.
// The file shape is the one the extension writes; no extension code is used.
"use strict";

class ExportError extends Error {}

const SAFE_SCHEMES = ["http:", "https:", "ftp:", "file:"];

function isSafeUrl(url) {
  if (typeof url !== "string") return false;
  const m = /^([a-z][a-z0-9+.-]*:)/i.exec(url.trim());
  return !!m && SAFE_SCHEMES.includes(m[1].toLowerCase());
}

function parseExport(text) {
  if (typeof text !== "string") throw new ExportError("This file could not be read.");
  text = text.replace(/^﻿/, "");
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new ExportError("This file is not valid JSON.");
  }
  if (data && !Array.isArray(data) && typeof data === "object" && data.windows) data = [data];
  if (!Array.isArray(data) || data.length === 0) {
    throw new ExportError("This file does not look like a Tab Session Manager export (no list of sessions).");
  }
  for (const s of data) {
    if (!s || typeof s !== "object" || !s.windows || typeof s.windows !== "object") {
      throw new ExportError("This file does not look like a Tab Session Manager export (a session has no windows).");
    }
  }
  return data;
}

function dateText(date) {
  const d = typeof date === "number" ? new Date(date) : new Date(String(date));
  return Number.isNaN(d.getTime()) ? "unknown date" : d.toISOString().slice(0, 10);
}

function tagList(tag) {
  if (Array.isArray(tag)) return tag.map(String).filter(Boolean);
  if (typeof tag === "string") return tag.split(" ").filter(Boolean);
  return [];
}

function tabsOf(win) {
  const tabs = Object.values(win || {}).filter((t) => t && typeof t === "object");
  const hasIndex = tabs.every((t) => typeof t.index === "number");
  if (hasIndex) tabs.sort((a, b) => a.index - b.index);
  return tabs.map((t) => ({
    url: typeof t.url === "string" ? t.url : "",
    title: typeof t.title === "string" && t.title.trim() ? t.title.trim() : (t.url || "(no title)"),
  }));
}

// One plain view per session: name, date, tags, windows in file order, tabs in their window order.
function summarize(sessions) {
  return sessions.map((s) => {
    const windows = Object.values(s.windows).map(tabsOf).filter((w) => w.length > 0);
    return {
      name: typeof s.name === "string" && s.name.trim() ? s.name.trim() : "Unnamed session",
      date: dateText(s.date),
      tags: tagList(s.tag),
      windows,
      tabCount: windows.reduce((n, w) => n + w.length, 0),
    };
  });
}

// The same sessions with a new id and a new last-edited time on each one.
// That way the extension does not skip them as already known on import.
// A missing key that the import checks for (name, tag, tabsNumber, date, sessionStartTime) is filled in.
function freshCopy(sessions, now, newId) {
  const out = JSON.parse(JSON.stringify(sessions));
  for (const s of out) {
    s.id = newId();
    s.lastEditedTime = now;
    if (typeof s.name !== "string") s.name = "Unnamed session";
    if (s.tag === undefined || s.tag === null) s.tag = [];
    if (typeof s.tabsNumber !== "number") {
      s.tabsNumber = Object.values(s.windows).reduce((n, w) => n + Object.keys(w || {}).length, 0);
    }
    if (s.date === undefined) s.date = now;
    if (s.sessionStartTime === undefined) s.sessionStartTime = typeof s.date === "number" ? s.date : now;
  }
  return JSON.stringify(out, null, "  ");
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sessionLabel(v) {
  const tags = v.tags.length ? " " + v.tags.map((t) => "#" + t).join(" ") : "";
  return v.name + tags + " (" + v.date + ")";
}

// Netscape bookmark file, the format every major browser imports.
// One folder per session, one subfolder per window; addresses that are not web or file links are left out.
function bookmarksHtml(views) {
  const lines = [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
  ];
  for (const v of views) {
    lines.push("    <DT><H3>" + escapeHtml(sessionLabel(v)) + "</H3>", "    <DL><p>");
    v.windows.forEach((w, i) => {
      lines.push("        <DT><H3>Window " + (i + 1) + "</H3>", "        <DL><p>");
      for (const t of w) {
        if (!isSafeUrl(t.url)) continue;
        lines.push('            <DT><A HREF="' + escapeHtml(t.url) + '">' + escapeHtml(t.title) + "</A>");
      }
      lines.push("        </DL><p>");
    });
    lines.push("    </DL><p>");
  }
  lines.push("</DL><p>", "");
  return lines.join("\n");
}

// Plain text, to paste anywhere: every address, safe or not, since text cannot be clicked by mistake.
function textList(views) {
  const out = [];
  for (const v of views) {
    out.push(sessionLabel(v) + ", " + (v.tabCount === 1 ? "1 tab" : v.tabCount + " tabs"));
    v.windows.forEach((w, i) => {
      out.push("Window " + (i + 1));
      for (const t of w) out.push("- " + t.title, "  " + t.url);
    });
    out.push("");
  }
  return out.join("\n");
}

if (typeof module !== "undefined") {
  module.exports = {
    ExportError, isSafeUrl, parseExport, dateText, summarize, freshCopy, bookmarksHtml, textList, escapeHtml,
  };
}
