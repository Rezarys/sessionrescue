"use strict";
(function () {
  const $ = (id) => document.getElementById(id);
  let sessions = [];
  let views = [];

  function show(id, on) { $(id).hidden = !on; }

  function status(msg, isError) {
    const el = $("status");
    el.textContent = msg;
    el.className = isError ? "error" : "";
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function render() {
    const list = $("list");
    list.textContent = "";
    for (const v of views) {
      const sec = document.createElement("section");
      const h = document.createElement("h2");
      h.textContent = v.name + " (" + v.date + ", " + v.tabCount + (v.tabCount === 1 ? " tab)" : " tabs)");
      sec.appendChild(h);
      if (v.tags.length) {
        const p = document.createElement("p");
        p.className = "small";
        p.textContent = "Tags: " + v.tags.join(", ");
        sec.appendChild(p);
      }
      v.windows.forEach((w, i) => {
        const d = document.createElement("details");
        const s = document.createElement("summary");
        s.textContent = "Window " + (i + 1) + ", " + w.length + (w.length === 1 ? " tab" : " tabs");
        d.appendChild(s);
        const ol = document.createElement("ol");
        for (const t of w) {
          const li = document.createElement("li");
          if (isSafeUrl(t.url)) {
            const a = document.createElement("a");
            a.href = t.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = t.title;
            li.appendChild(a);
          } else {
            li.textContent = t.title + " ";
            const code = document.createElement("code");
            code.textContent = t.url;
            li.appendChild(code);
          }
          ol.appendChild(li);
        }
        d.appendChild(ol);
        sec.appendChild(d);
      });
      list.appendChild(sec);
    }
    const tabs = views.reduce((n, v) => n + v.tabCount, 0);
    const label = (views.length === 1 ? "1 session" : views.length + " sessions") + ", " + tabs + " tabs";
    status(label + " read.", false);
    show("actions", true);
  }

  $("file").addEventListener("change", async () => {
    const files = Array.from($("file").files || []);
    if (!files.length) return;
    sessions = [];
    views = [];
    show("actions", false);
    $("list").textContent = "";
    const failed = [];
    for (const f of files) {
      try {
        sessions = sessions.concat(parseExport(await f.text()));
      } catch (err) {
        failed.push(f.name + ": " + (err instanceof ExportError ? err.message : "could not be read."));
      }
    }
    views = summarize(sessions);
    if (views.length) render();
    if (failed.length) status(($("status").textContent + " " + failed.join(" ")).trim(), !views.length);
  });

  $("fresh").addEventListener("click", () => {
    const text = freshCopy(sessions, Date.now(), () => crypto.randomUUID());
    download("sessions-fresh-ids.json", text, "application/json");
  });
  $("bookmarks").addEventListener("click", () => {
    download("sessions-bookmarks.html", bookmarksHtml(views), "text/html");
  });
  $("text").addEventListener("click", () => {
    download("sessions.txt", textList(views), "text/plain");
  });
  $("clear").addEventListener("click", () => {
    sessions = [];
    views = [];
    $("file").value = "";
    $("list").textContent = "";
    show("actions", false);
    status("Cleared.", false);
  });
})();
