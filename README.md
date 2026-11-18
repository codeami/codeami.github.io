# codeami.github.io

Personal site of Ashish Raina: a whoami landing (the one-line mission, a CV and the three things to do) at the root, and the software factory demo (FirstMate, the agent crew) at /ai-life-os/. The folder keeps its old name so no link breaks.

Plain static files, served by GitHub Pages from the root of `main` (`.nojekyll` turns Jekyll off). To read it locally: `python3 -m http.server`, then open `/`.

Eleven public pages and one redirect stub, under one top bar:

    Me       index.html          who I am, the mission line, read one post / try the demo / take the course / follow on GitHub
             cv.html             the CV (child of Me)
    Blog     ai-life-os/blog/    the post list and four posts; ai-life-os/arena.html is the harness arena
    Intent   intent/             what I do, four doors, how I work with agents, what the crew may do
             ai-life-os/index.html   the demo, opened from Intent: a chat and the second brain as a chart
    Course   ai-life-os/course/  the free course
    GitHub   github.com/codeami

- `share.json`: one entry for every published page (`public`, `link-only` or `retired`); a test fails when a page has none. Pages that are not public are hidden from the chart but not deleted. A page that has left the repo has no entry. `hud.js` and `brain/build_data.py` read it (the build also writes `robots.txt`, listing retired pages only). A link-only page stays reachable and the build writes a static noindex meta into it; it is not in `robots.txt`. A retired page shows a one-line notice and links to it go to its `into` page. Set a page to `public` to republish it.
- `cv.html`, `cv.css`: the plain web CV, built from the v5 CV text. It leaves out the phone number and email, names the employer as "a global sportswear brand" like the rest of the site, and links no file (the .docx and PDF are not published).
- The top bar is one list on every page: the logo and name "Ashish Raina", then Me, Blog, Intent, Course and a GitHub icon (`ai-life-os/topbar.css` for the layout, `kit/icons.svg` for the icon). There is no Menu button: the five items fit a 390px phone, where the site name is spoken but not drawn. The markup is repeated in each page's header, and a test checks that every public page carries the same bar (there is no skip list) and that clicking each item lands on a page with the same bar and site name. The arena still carries the old hidden Menu button and `topbar.js` (an empty file) until its own pull request is rebased. Each of Me, Blog, Intent and Course ends with a last-line link to the next page in the bar order (the last one goes to GitHub).
- `intent/index.html`, `intent/intent.css`: the Intent page (the software factory and its front agent): the core line, four doors in the owner's words, the loop, the problem-to-offer table, the harness paragraph, how I work with agents (the old About page), what the crew may do, what waits for me and what it never does (the old Safety page), credits and a link to the demo.
- `index.html`: the landing, which is also Me. A first visit opens the page card on the hook (`#trip`: the mission line and a sample star-map for Sam, who is made up, with a dashed outline marked "yours"); Next and Skip lead to Me. Leaving the hook sets `trip:v1` in `localStorage`; after that `/` lands on Me and "Replay the trip" brings the hook back. Four views show one at a time: the hook, Me (`#me`, with `#whoami` as an alias: the mission line, the three things to do, the profile, the selected outcomes, a "Full CV" link to `cv.html`, Next to the Blog and a Skip), the journey (`#explain`, from the "Explain this" button) and the walk (`#step-1` to `#step-8`). The chart lights only the node of the page the reader is on (whoami), with a ring and "you are here"; a click on that node, on the logo, or on any link to the page you are on opens the Me view and never reloads the page (`hud.js` sends a `samepage` event; it also opens the card on a first visit). The journey is a short conversation in plain prose (why the site exists, what goes wrong, the fix, what I stand for, who it is for) and hands over to a guided walk in eight steps (intent first, with a fork for evaluators). Its scripted chats are in `ai-life-os/tour/tour.json` (`landing` block), drawn by `ai-life-os/chat.js`. It uses the demo's kit and HUD skin from `ai-life-os/`.
- `blog/index.html`: a redirect. Posts have one home, `ai-life-os/blog/`.
- `ai-life-os/`: the demo, once The Chart Room at codeami.github.io/firstmate-showcase. Its old section pages were folded into the demo chat and the Intent page; the pages that showed skill names, rule text and the pipeline (core logic, the skill map, the flow map, the changelog, the tour and three posts) were deleted from the public repo. Git history keeps them.

The layout is Chart & Cards. The chart is the second brain, a live ring map (`ai-life-os/brain/graph.js`, the AIO prototype's page fed only public data), and it is the base layer of every page. Each page is a card over it: a right-hand panel on wide screens, a bottom sheet on phones, with minimise and close. `ai-life-os/hud.js` mounts the chart and turns the page into the card. A link to another page swaps the card in place when that page has no inline script, otherwise the browser loads it; either way each page keeps its own URL. A link such as `ai-life-os/index.html#first-mate` opens that node's card on the chart. `hud.js` also adds the version tag (`VERSION`), the whoami link and the GitHub link to a header that is not the one top bar (that bar carries its own links). HUD and Matrix are the two colour sets.

`ai-life-os/course/index.html` is Ashish's AI introductory course: a guided chat reads seven lessons in a fixed order from `ai-life-os/course/course.json`. Progress stays in the reader's localStorage (`ai-course:v1`); `graph.js` reads it to light each finished lesson in the Course room, and `build_data.py` builds that room from the same file.

The chart's data, `ai-life-os/brain/brain-data.json`, is built from public files only (the approved notes in `notes.js`, `brain/src/extra.json`, `brain/src/site.json`, the course lessons and the Blog list): `python3 -I ai-life-os/brain/build_data.py`. A link to a page that is not in the repo is dropped from the data.

The Blog posts and `ai-life-os/arena.html` are built from the owner's private drafts by a script kept outside this repo. `ai-life-os/blog/index.html` and the four public posts (`everything-is-a-file`, `second-brain-page`, `one-harness-for-every-agent`, `when-the-notes-are-wrong`) are the exception: they use the calm panel post layout (`ai-life-os/panel.css`, described in `DESIGN.md`), and the index groups them by series. A post is a problem and its fix: the problem, the solution with its evidence, then the gaps that are still open.

## Tests

End-to-end tests (Playwright, in `tests/`) walk the repo for every HTML page, so new pages are covered without a list. Each page is opened at 390px and 1280px and must: load with no console errors, failed requests or broken internal links; not scroll sideways; and match its committed screenshot in `tests/__screenshots__/` (1 in 1000 pixels may differ; the live chart canvas is masked). One more test checks that no published file holds a loopback, tailnet or home-directory address (the patterns are in `tests/site.spec.js`). Another fails when a page or brain data file uses wording that undersells the work (the phrase list is in the same file). Build templates (files with `%%PLACEHOLDER%%`) are not pages and are skipped.

    npm ci
    npm test              # run everything (needs Docker)
    npm run test:update   # on purpose: rewrite the baseline screenshots, then commit them

The tests run inside the Playwright Docker image, the same one CI uses, because fonts render differently on each OS and the baselines are Linux ones. `npm run test:host` runs without Docker; screenshot checks will fail on a Mac, the other checks stay valid. After a look change, run `npm run test:update` and review the changed PNGs in the diff. CI (`.github/workflows/e2e.yml`) runs on every PR and push to `main` and uploads the diff images as the `playwright-diffs` artifact when a check fails.
The supervisor and most crew mechanics are upstream [Firstmate](https://github.com/kunchenguid/firstmate) by Kun Chen and contributors. See `ai-life-os/LICENSE`.
