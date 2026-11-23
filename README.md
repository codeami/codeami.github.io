# codeami.github.io

Personal site of Ashish Raina. It has one job: to show the Software Meta-Factory in the open, which is a software factory made of AI helpers. The home page says what it does, how it is checked and how to ask for one. The demo (FirstMate, the agent crew, and the second brain as a map) is at /broman-os/. The folder keeps its old name so no link breaks.

What the site is for and what gets escalated: see [vision.md](vision.md).

Plain static files, served by GitHub Pages from the root of `main` (`.nojekyll` turns Jekyll off). To read it locally: `python3 -m http.server`, then open `/`.

The public pages, under one top bar of five items (Meta-Factory, Case studies, Blog, About, Work with me):

    Home            index.html                    the purpose line, the pipeline clip, three dated numbers, See it work / Talk to me, a short "Ashish Raina" block
    Meta-Factory    broman-os/index.html         what we build, the demo (a chat and the second brain as a map), and how it works: how I work with agents, what the crew may do, who it is for, credits
    Case studies    case-studies/index.html       the worked cases
    Blog            broman-os/blog/              the post list, four posts and the harness arena post (broman-os/arena.html)
    About           about/index.html              who I am; cv.html is its child, the CV
    Work with me    work-with-me/index.html       how to ask for a factory; the contact is a mailto and LinkedIn

Link-only pages (reachable, not in the bar or the map): the course (`broman-os/course/`) and the pipeline clip (`broman-os/pipeline/`, a scrubbed animated page that Home embeds). Redirect stubs, kept so old links work: `blog/index.html` goes to the post list; `intent/index.html` goes to the Meta-Factory page and keeps the `#how` and `#safety` anchors.

- `share.json`: one entry for every published page (`public`, `link-only` or `retired`); a test fails when a page has none. Pages that are not public are hidden from the chart but not deleted. A page that has left the repo has no entry. `hud.js` and `brain/build_data.py` read it (the build also writes `robots.txt`, listing retired pages only). A link-only page stays reachable and the build writes a static noindex meta into it; it is not in `robots.txt`. A retired page shows a one-line notice and links to it go to its `into` page. Set a page to `public` to republish it.
- `cv.html`, `cv.css`: the plain web CV, built from the v5 CV text. It leaves out the phone number and email, names the employer as "a global sportswear brand" like the rest of the site, and links no file (the .docx and PDF are not published).
- The top bar is one list on every page: the logo and name "Broman OS", then Meta-Factory, Case studies, Blog, About and Work with me (`broman-os/topbar.css` for the layout). There is no Menu button: the five items fit a 390px phone, where the site name is spoken but not drawn and the skin button sits top right. The markup is repeated in each page's header, and a test checks that every public page carries the same bar and that clicking each item lands on a page with the same bar and site name. The GitHub link and the course are in the footers.
- `index.html`: Home. No script of its own, no first-visit trip and no walk. It holds the purpose line, the pipeline clip (an iframe of `broman-os/pipeline/index.html`), three numbers each with a source and a date, two buttons, "What we build" in short form, and the Me block (About, Full CV, a `mailto` and LinkedIn). The map is the base layer; it lights only the node of the page you are on, and a click on that node, on the logo, or on a link to the page you are on never reloads the page.
- `broman-os/index.html`: the Meta-Factory page. "What we build" and "Our way in", then the demo chat, then the how-it-works half (`#how`, `#safety`, who it is for, credits). The scripted chats are in `broman-os/tour/tour.json`.
- `broman-os/pipeline/`: a standalone animated page of the pipeline (`flow-anim.js`, `flow-style.css`), copied from a private build and scrubbed of private names, paths and fetches. It follows the saved skin.
- `blog/index.html` and `intent/index.html`: redirects. Posts have one home, `broman-os/blog/`; Intent moved into the Meta-Factory page.
- `broman-os/`: the demo, once The Chart Room at codeami.github.io/firstmate-showcase. Its old section pages were folded into the demo chat and the Meta-Factory page; the pages that showed skill names, rule text and the pipeline (core logic, the skill map, the flow map, the changelog, the tour and three posts) were deleted from the public repo. Git history keeps them.
- One saved skin: `broman-os/skin.js`, loaded first in every page head, reads `localStorage skin` (`hud`, `matrix` or `calm`, default `hud`) and sets `data-skin` before first paint. The nav button (`#theme`) and the map dropdown both change it, and other tabs follow.

The layout is Chart & Cards. The chart is the second brain, a live map (`broman-os/brain/graph.js`, the AIO prototype's page fed only public data; Hex layout with the Folders view by default), and it is the base layer of every page. Each page is a card over it: a right-hand panel on wide screens, a bottom sheet on phones, with minimise and close. The card and the map's controls panel float over a full-width map and never take width from it (✕ or Esc closes the controls), and in Calm the map is light like everything else. `broman-os/hud.js` mounts the chart and turns the page into the card. A link to another page swaps the card in place when that page has no inline script, otherwise the browser loads it; either way each page keeps its own URL. A link such as `broman-os/index.html#first-mate` opens that node's card on the chart. `hud.js` also adds the version tag (`VERSION`), the whoami link and the GitHub link to a header that is not the one top bar (that bar carries its own links). On a framed page one dropdown under the name (Look, Map, Layout, View, Help) holds the map controls, and the left pane has Read, Pages and FirstMate tabs; the `m` key still toggles motion, which is off by default under reduced motion. The map has a 2D and a 3D view (`3d-force-graph@1.79.0`, pinned, from jsDelivr, loaded only when 3D is picked). HUD, Matrix and Calm are the three skins. The Wiki notes card shows a cloud of 14 interest tags (`brain/src/interests.json`; `build.py --from-copies` re-reads the public notes).

`broman-os/course/index.html` is Ashish's AI introductory course: a guided chat reads 13 lessons in four parts, in a fixed order from `broman-os/course/course.json`. Progress stays in the reader's localStorage (`ai-course:v1`); `graph.js` reads it to light each finished lesson in the Course room, and `build_data.py` builds that room from the same file.

The chart's data, `broman-os/brain/brain-data.json`, is built from public files only (the approved notes in `notes.js`, `brain/src/extra.json`, `brain/src/site.json`, the course lessons and the Blog list): `python3 -I broman-os/brain/build_data.py`. A link to a page that is not in the repo is dropped from the data.

The Blog posts and `broman-os/arena.html` are built from the owner's private drafts by a script kept outside this repo. `broman-os/blog/index.html` and the four public posts (`everything-is-a-file`, `second-brain-page`, `one-harness-for-every-agent`, `when-the-notes-are-wrong`) are the exception: they use the calm panel post layout (`broman-os/panel.css`, described in `DESIGN.md`), and the index groups them by series. A post is a problem and its fix: the problem, the solution with its evidence, then the gaps that are still open.

## Tests

End-to-end tests (Playwright, in `tests/`) walk the repo for every HTML page, so new pages are covered without a list. Each page is opened at 390px and 1280px and must: load with no console errors, failed requests or broken internal links; not scroll sideways; and match its committed screenshot in `tests/__screenshots__/` (1 in 1000 pixels may differ; the live chart canvas is masked). One more test checks that no published file holds a loopback, tailnet or home-directory address (the patterns are in `tests/site.spec.js`). Another fails when a page or brain data file uses wording that undersells the work (the phrase list is in the same file). Build templates (files with `%%PLACEHOLDER%%`) are not pages and are skipped.

    npm ci
    npm test              # run everything (needs Docker)
    npm run test:update   # on purpose: rewrite the baseline screenshots, then commit them

The tests run inside the Playwright Docker image, the same one CI uses, because fonts render differently on each OS and the baselines are Linux ones. `npm run test:host` runs without Docker; screenshot checks will fail on a Mac, the other checks stay valid. After a look change, run `npm run test:update` and review the changed PNGs in the diff. CI (`.github/workflows/e2e.yml`) runs on every PR and push to `main` and uploads the diff images as the `playwright-diffs` artifact when a check fails.
The supervisor and most crew mechanics are upstream [Firstmate](https://github.com/kunchenguid/firstmate) by Kun Chen and contributors. See `broman-os/LICENSE`.
