# sessionrescue

Open in a recent browser, nothing to install: https://rezarys.github.io/sessionrescue/

A one-page tool that opens Tab Session Manager export files (.json) in your browser, shows every session, window and tab as a link, and gives you three files: a copy of the export with a fresh id on each session, a bookmarks file any browser can import, and a plain text list.

Not affiliated with Tab Session Manager or its author. The name is used here only to say which file this page reads.

## Why

Several people report that re-importing their own exports does not work: "I discovered that the JSON files exported by your own application cannot be imported back" (https://github.com/sienori/Tab-Session-Manager/issues/1552). In another thread the extension shows "Sessions imported" and the session never appears, and one user found that "The import was successful _only after I modified the id of the session_ at the bottom of the exported json" (https://github.com/sienori/Tab-Session-Manager/issues/1502). This page makes that edit for you. It is not known to be the cause in every report: some were made on a clean profile, where no id can already be known, so the copy may not help there. If it does not, the bookmarks file and the text list do not depend on the extension.

## How to use it

1. Open https://rezarys.github.io/sessionrescue/ and choose one or more .json files exported by Tab Session Manager.
2. Click any tab to open it, or download one of the three files:
   - **Copy with fresh ids (.json)**: the same sessions with a new id and a new last-edited time on each one. If a field the import checks for is missing (name, tag, tab count, date, session start time), it is filled in; nothing else changes. Import it from the extension's settings, under Import Sessions.
   - **Bookmarks (.html)**: one folder per session, one subfolder per window. Import it from your browser's bookmarks manager.
   - **Text list (.txt)**: every tab title and address, to keep or paste anywhere.

## What the text list looks like

For an example export with two sessions, one of them unnamed:

```
Work #research (2025-09-30), 3 tabs
Window 1
- Example Domain
  https://example.com/
- Page B
  https://example.org/b
Window 2
- Advanced Preferences
  about:config

Unnamed session (2025-10-01), 1 tab
Window 1
- https://example.net/
  https://example.net/
```

Addresses that are not web or file links (such as `about:config`) are listed in the text file but are not clickable on the page and are left out of the bookmarks file.

## Privacy

The files are read in your browser, and nothing in this page's code sends them anywhere. The page also sets a Content-Security-Policy (default-src 'none', connect-src 'none', form-action 'none') so that its scripts cannot make network requests, load code from elsewhere or submit a form. It is delivered with the page itself, so it only guards the code you were served. The page uses no cookies, no browser storage, no analytics and no third-party code.

## Status and limits

- It is tested against example exports written for the test suite, in the shape the extension writes. It has not been tried on a real export yet, and the copy with fresh ids has not been tried in the extension itself: that it imports rests on one user's report and on how the extension's import code skips a session whose id it already knows. Please open an issue if it does not work for you.
- A session that the extension saved but does not list is a different problem; this page cannot see inside the extension.
- Tab groups, pinned state and window sizes are kept in the copy with fresh ids but are not shown on the page, the bookmarks file or the text list.

## Merge and clean up: 3 USD, not built yet

Merging several exports into one session, dropping duplicate tabs and empty new tabs, and giving one clean file to import. Nothing is charged now and no date is promised. If you want it, say so on https://github.com/Rezarys/sessionrescue/issues/1 (free GitHub account needed). Not part of this repository and not covered by its license.

## Development

Plain HTML, CSS and JavaScript, no build step. Tests use Node's built-in test runner (Node 20 or later): `node --test tests/*.test.js`.

Built with AI assistance, reviewed and tested by me.

## License

MIT, Younes Z.
