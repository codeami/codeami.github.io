# Vision

codeami.github.io exists so that a prospective customer or hiring reader can see, in a few minutes, what the Software Meta-Factory and Troupe Consulting do, and trust Ashish Raina enough to write to him.
It serves two readers: someone deciding whether to hire him for a software factory of AI helpers, and someone reading his CV (evidence: README, "Work with me" page, #24).
It owns exactly one thing: the public, high-level showing of the work.
The building of the work happens elsewhere, in private.
Troupe Consulting is named here from the captain's brief; the site does not use the name yet (guess: it appears on the Work with me page later).

## The site shows the what, never the how

Public pages stay in shadow mode.
They show the concept, the shape of the pipeline, the services and dated results.
They never show skill files, prompts, routing rules, worker instructions, rule text or model-cost tricks.
Evidence: #21 deleted the core logic, skill map, flow map, changelog and tour pages; #24 removed internal tool names (backpass, worktree, no-mistakes) from the factory page; the pipeline clip is "scrubbed of private names, paths and fetches" (README).
Git history keeps what was cut, and that is acceptable.
Blog posts are built from private drafts by a script outside this repo; a post is a problem and its fix, never a playbook (#17, #22, README).

## Every page earns its place against the one job

The job is to show the Meta-Factory, support the CV and win paying customers.
The site went from 27 pages to 12 under one five-item bar: Meta-Factory, Case studies, Blog, About, Work with me (#21, #24).
A page that does not serve that job is cut, hidden as link-only, or retired in `share.json`, not left to drift.
The default answer to a new page is no (guess: inferred from the repeated cuts in #21 and #24).

## Claims are dated, sourced and confident

Numbers carry a source and a date (#24, Home).
Public wording does not undersell the work: a test bans hedging phrases such as "not checked" and "still rough" (tests/site.spec.js).
Wording is plain and short; AIO and AI-Life-OS leave titles and text, the public name is The Software Meta-Factory (#24).
Doubts about reliability live in the owner's private notes.

## One contact path, no pricing

Contact is a mailto and LinkedIn on Home, About and Work with me, and not on the CV (#24).
The CV names the employer only as "a global sportswear brand", omits phone and email, and links no file (README).
No pricing page, price list or rate exists (guess: not evidenced either way).
No tracking, sign-in or form that sends data off the page exists; the course Hello form keeps its answers in the reader's own browser (#25, README).
The only third-party script is the pinned 3D library, loaded on request (README).

## The site stays static, checked and private-free

Plain static files on GitHub Pages; no build step is needed to read it (README).
Every page is covered by end-to-end tests at 390px and 1280px, with committed screenshots (README, #25).
No published file holds a loopback, tailnet or home-directory address (tests/site.spec.js).
A new page needs a `share.json` entry.
The chart is fed only public data (README).

## Non-goals

It is not a blog platform, a docs site, a product, a store or a place to publish internal operating files.
It is not a place for client names, client data or employer-confidential detail.
It does not claim results the work has not produced.
It does not teach how to rebuild the factory.

## A change aligns when

- It fixes a broken link, typo, test or screenshot baseline and changes no meaning.
- It makes an existing page clearer for a customer or CV reader without adding a new claim.
- It keeps the five-item bar, the saved skin and the tests intact.

Merge without asking: copy fixes, link fixes, baseline regenerations, test fixes, README or DESIGN corrections that match the code, dependency pins already in use.

## A change should be resisted when

Always escalate to the captain:

- It adds or changes anything that reveals how the factory works: prompts, skill or worker files, routing or gate rules, cost tricks, or a screenshot of any of them.
- It adds a page, a bar item, a pricing or rate statement, a client or employer name, or a new claim about results.
- It adds a form that sends data, analytics, tracking, a new third-party script or a new contact route.
- It restores anything deleted from the public repo in #21 or #24.
- It changes the public name, the purpose line, the contact details or the CV text.
- It touches `share.json` visibility, weakens a test, or deletes a baseline to make CI pass.
- It puts a private path, hostname, address, key or private-draft text into any published file.
