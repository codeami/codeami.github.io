# codeami.github.io

Personal site of Ashish Raina: a whoami landing (CV and front door to the tutorials) at the root and the AI-Life-OS demo (FirstMate, the agent crew) at /ai-life-os/.

Plain static files, served by GitHub Pages from the root of `main` (`.nojekyll` turns Jekyll off). To read it locally: `python3 -m http.server`, then open `/`.

- `index.html`: the whoami landing: a guided walk in eight steps (intent first, with a fork for evaluators) over the chart. Its scripted chats are in `ai-life-os/tour/tour.json` (`landing` block), drawn by `ai-life-os/chat.js`. It uses the demo's kit and HUD skin from `ai-life-os/`.
- `share.json`: one entry for every published page (`public`, `link-only` or `retired`); a test fails when a page has none. Pages that are not public are hidden from the nav and the chart but not deleted. `nav.js`, `hud.js` and `brain/build_data.py` read it (the build also writes `robots.txt`, listing retired pages only). A link-only page stays reachable and the build writes a static noindex meta into it; it is not in `robots.txt`. A retired page shows a one-line notice and links to it go to its `into` page. Set a page to `public` to republish it.
- `blog/index.html`: a redirect. Posts have one home, `ai-life-os/blog/`.
- `ai-life-os/`: the demo, once The Chart Room at codeami.github.io/firstmate-showcase. Its old section pages (s02 to s10, overview, harness, skills, cast, tasks, testing, vendors) were folded into the Chart Room chat, core logic, safety and about pages and are not carried here.

The layout is Chart & Cards. The chart is the second brain, a live ring map (`ai-life-os/brain/graph.js`, the AIO prototype's page fed only public data), and it is the base layer of every page. Each page is a card over it: a right-hand panel on wide screens, a bottom sheet on phones, with minimise and close. `ai-life-os/hud.js` mounts the chart and turns the page into the card. A link to another page swaps the card in place when that page has no inline script, otherwise the browser loads it; either way each page keeps its own URL. `hud.js` also adds the version tag (`VERSION`), the Second Brain tab, the whoami link and the GitHub link to the header. HUD and Matrix are the two colour sets.

`ai-life-os/course/index.html` is Ashish's AI introductory course: EA-bot reads seven lessons in a fixed order from `ai-life-os/course/course.json`. Progress stays in the reader's localStorage (`ai-course:v1`); `graph.js` reads it to light each finished lesson in the Course room, and `build_data.py` builds that room from the same file.

`ai-life-os/brain/index.html` shows the chart alone. Its data, `brain/brain-data.json`, is built from public files only (the approved notes in `notes.js`, `brain/src/extra.json`, `brain/src/site.json`, the skill map and the Field Notes list): `python3 -I ai-life-os/brain/build_data.py`.

The two maps, `ai-life-os/maps/skills.html` and `flow.html`, are built files. Edit `ai-life-os/maps/src/*/map.json` or the shell in `ai-life-os/maps/_shared/` (from [super-board](https://github.com/EricTechPro/super-board) by EricTechPro, MIT; see its NOTICE), then rebuild:

    python3 -I ai-life-os/maps/_shared/build.py ai-life-os/maps/src/skills/map.json ai-life-os/maps/skills.html
    python3 -I ai-life-os/maps/_shared/build.py ai-life-os/maps/src/flow/map.json ai-life-os/maps/flow.html

The Field Notes posts, `ai-life-os/blog/index.html` and `ai-life-os/arena.html` are built from the owner's private drafts by a script kept outside this repo. Their links to the retired pages were repointed here by hand, so the next rebuild needs the same mapping (for example `overview.html` becomes `index.html#pages`).

## Tests

End-to-end tests (Playwright, in `tests/`) walk the repo for every HTML page, so new pages are covered without a list. Each page is opened at 390px and 1280px and must: load with no console errors, failed requests or broken internal links; not scroll sideways; and match its committed screenshot in `tests/__screenshots__/` (1 in 1000 pixels may differ; the live chart canvas is masked). One more test checks that no published file holds a loopback, tailnet or home-directory address (the patterns are in `tests/site.spec.js`). Build templates (files with `%%PLACEHOLDER%%`, such as `maps/_shared/shell.html`) are not pages and are skipped.

    npm ci
    npm test              # run everything (needs Docker)
    npm run test:update   # on purpose: rewrite the baseline screenshots, then commit them

The tests run inside the Playwright Docker image, the same one CI uses, because fonts render differently on each OS and the baselines are Linux ones. `npm run test:host` runs without Docker; screenshot checks will fail on a Mac, the other checks stay valid. After a look change, run `npm run test:update` and review the changed PNGs in the diff. CI (`.github/workflows/e2e.yml`) runs on every PR and push to `main` and uploads the diff images as the `playwright-diffs` artifact when a check fails. Known issue: `ai-life-os/kit/index.html` scrolls 2px sideways at 390px; it is listed in `tests/site.spec.js` until the page is fixed.

The supervisor and most crew mechanics are upstream [Firstmate](https://github.com/kunchenguid/firstmate) by Kun Chen and contributors. See `ai-life-os/LICENSE`.
