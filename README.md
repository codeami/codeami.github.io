# codeami.github.io

Personal site of Ashish Raina: a blog landing page at the root and the AI-Life-OS demo (FirstMate, the agent crew) at /ai-life-os/.

Plain static files, served by GitHub Pages from the root of `main` (`.nojekyll` turns Jekyll off). To read it locally: `python3 -m http.server`, then open `/`.

- `index.html`: the whoami landing. It uses the demo's kit and HUD skin from `ai-life-os/`.
- `blog/index.html`: a redirect. Posts have one home, `ai-life-os/blog/`.
- `ai-life-os/`: the demo, once The Chart Room at codeami.github.io/firstmate-showcase. Its old section pages (s02 to s10, overview, harness, skills, cast, tasks, testing, vendors) were folded into the story, core logic, safety and about pages and are not carried here.

The layout is Chart & Cards. The chart is the second brain, a live ring map (`ai-life-os/brain/graph.js`, the AIO prototype's page fed only public data), and it is the base layer of every page. Each page is a card over it: a right-hand panel on wide screens, a bottom sheet on phones, with minimise and close. `ai-life-os/hud.js` mounts the chart and turns the page into the card. A link to another page swaps the card in place when that page has no inline script, otherwise the browser loads it; either way each page keeps its own URL. `hud.js` also adds the version tag (`VERSION`), the Second Brain tab, the whoami link and the GitHub link to the header. HUD and Matrix are the two colour sets.

`ai-life-os/course/index.html` is Ashish's AI introductory course: EA-bot reads seven lessons in a fixed order from `ai-life-os/course/course.json`. Progress stays in the reader's localStorage (`ai-course:v1`); `graph.js` reads it to light each finished lesson in the Course room, and `build_data.py` builds that room from the same file.

`ai-life-os/brain/index.html` shows the chart alone. Its data, `brain/brain-data.json`, is built from public files only (the approved notes in `notes.js`, `brain/src/extra.json`, `brain/src/site.json`, the skill map and the Field Notes list): `python3 -I ai-life-os/brain/build_data.py`.

The two maps, `ai-life-os/maps/skills.html` and `flow.html`, are built files. Edit `ai-life-os/maps/src/*/map.json` or the shell in `ai-life-os/maps/_shared/` (from [super-board](https://github.com/EricTechPro/super-board) by EricTechPro, MIT; see its NOTICE), then rebuild:

    python3 -I ai-life-os/maps/_shared/build.py ai-life-os/maps/src/skills/map.json ai-life-os/maps/skills.html
    python3 -I ai-life-os/maps/_shared/build.py ai-life-os/maps/src/flow/map.json ai-life-os/maps/flow.html

The Field Notes posts, `ai-life-os/blog/index.html` and `ai-life-os/arena.html` are built from the owner's private drafts by a script kept outside this repo. Their links to the retired pages were repointed here by hand, so the next rebuild needs the same mapping (for example `overview.html` becomes `index.html#pages`).

The supervisor and most crew mechanics are upstream [Firstmate](https://github.com/kunchenguid/firstmate) by Kun Chen and contributors. See `ai-life-os/LICENSE`.
