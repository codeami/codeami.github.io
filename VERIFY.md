# How to verify this site

**When a bug escapes** (it reaches `main` or the live site and none of the checks below caught it): in the same PR as the fix, name the check that should have caught it and edit this file so it does next time (a new flow, a new width, a new browser). A fix with no edit here is half done.

This file is for an agent that has changed the site and has to show it works. It follows three parts: Setup, Drive, Check. The README's Tests section covers the automated suite; this file covers looking at the real pages.

## Setup

Plain static files, no build step and nothing to install to look at pages.

    node tests/server.mjs        # serves the repo root on port 4173 of this machine (the port the tests use)
    # or: python3 -m http.server 4173

Run it in the background and fetch the root path on port 4173 with `curl -s -o /dev/null -w '%{http_code}'` and check it prints `200`. Use the repo's own server: it returns a real 404 for missing files.

Browser: `chrome-devtools-axi` (Chromium). It has no coordinate click, so it clicks by `@uid` from `snapshot` output. For a phone, use `chrome-devtools-axi emulate --viewport 390x844x3,mobile,touch`; `resize 390 844` is not enough (Chrome holds the width at 500).

Automated suite, for the checks that need no eyes: `npm ci`, then `npm run test:host` (Chromium, no Docker). On a Mac its screenshot checks always fail, because the baselines are Linux ones; the load, console, link and sideways-scroll checks stay valid. `npm test` (Docker) matches CI.

Browser matrix: Chromium always. WebKit for motion- or layout-heavy pages (the map, the pipeline clip) only when `~/Library/Caches/ms-playwright` holds a `webkit-*` folder; on 2026-11-23 it held only Chromium, so WebKit was not run. If it is missing, say "WebKit not run" in your report. Do not claim it.

## Drive

Do each flow at desktop (1280x800) and phone (390x844). Real clicks and typing through the browser tool only.

1. **Home** `/`: open it, then click each of the five top-bar items (Meta-Factory, Case studies, Blog, About, Work with me) in turn.
2. **Broman OS** `/broman-os/`: open it from the bar. Open the Menu (the ▾ button by the name), click Legend, click Search and type a word. Also open `/broman-os/blog/` and one post, and `/broman-os/course/`.
3. **Pipeline page** `/broman-os/pipeline/`: click the "▶ Replay" button. Wait about 2.5 s.
4. **Giants room** (Shoulders of giants, on the map at `/broman-os/`): open Menu, click Legend, and read the room list. Then compare its count and folders with the data file. Open Menu > Widgets for the left tree: click "Shoulders of giants" (its card opens, its row is marked, the trail reads "Map › Shoulders of giants"), click the folder Builders (only its 13 files light on the map), then click a room's dot on the map and check the tree moved with it.
5. **Phone width**: repeat 1 to 4 under the phone emulation. Check the top bar, the card as a bottom sheet, and that nothing scrolls sideways.

## Check

Passing looks like this, for each flow:

1. Home: each bar click lands on a page with the same top bar and the name "Ashish Raina"; no console errors (`chrome-devtools-axi console` says no messages); no failed request other than a `favicon.ico` 404 on a page opened directly.
2. Broman OS: the map draws with the six rooms in the legend; Menu opens and closes; Search takes the typed text; the blog list and the post load; the course opens.
3. Pipeline: the page plays on its own at load, so the heading already reads `● live` before any click. Wait until it reads `● done` (about 35 s), note the log line count (14), then click Replay: the heading goes back to `● live` and the log restarts with 1 line. A click that does nothing leaves `● done` and 14 lines. (The page has a known `favicon.ico` 404 when opened on its own; it is not a failure.)
4. Giants room: the legend reads `Shoulders of giants · 55` (the count moves when the room's notes change; compare with `broman-os/brain/brain-data.json`, where the room has five folders: Builders, Startup ecosystem, Marketing, Blogs and newsletters, OG thinkers). Folder names are not drawn on the map by default, so do not look for them there.
5. Phone: `document.documentElement.scrollWidth` equals `innerWidth` (390 / 390), and the screenshot shows the bar and sheet intact.

Evidence: put the commands you ran and a screenshot path per flow in your final message, and say which flows you did not run.

**Did not cheat.** Every state above must come from a real click, key press or typed text on the page. Do not use `eval` to call page functions, set `localStorage`, add classes or click for you, and do not edit the page to make it pass. `eval` is allowed only to read a measurement (the width check above). If a click would not work and you reached the state some other way, that flow has failed: report it as failed.
