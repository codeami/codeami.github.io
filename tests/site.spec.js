const { test, expect } = require('@playwright/test');
const { readdirSync, readFileSync, existsSync, statSync, mkdtempSync, cpSync, writeFileSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, dirname, extname, relative, sep } = require('node:path');
const { root, pages, templates } = require('./pages');

const origin = 'http://127.0.0.1:4173';
const mission = 'A software factory made of AI helpers, shown open: what it does, how it is checked, and how to ask me for one.';

// Overflow that exists today and is waiting for a page fix. Delete the entry when the page is fixed.
const knownOverflow = {};

for (const file of pages) {
  test(`${file}: loads clean, fits the width, matches the baseline`, async ({ page }) => {
    const problems = [];
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
    page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
    // The HUD moves the page body into its overlay on load, which reloads an embedded iframe and aborts its first requests; an abort is not a failure (a missing file still shows as a 4xx below).
    page.on('requestfailed', (r) => r.url().startsWith(origin) && r.failure()?.errorText !== 'net::ERR_ABORTED' && problems.push(`failed: ${r.url()}`));
    page.on('response', (r) => r.url().startsWith(origin) && r.status() >= 400 && problems.push(`${r.status()}: ${r.url()}`));

    // Only our own files are tested; external requests get an empty answer so runs do not depend on the network.
    // Redirect pages (meta refresh) are held on the page itself by dropping the refresh tag.
    await page.route('**/*', async (route) => {
      const req = route.request();
      if (!req.url().startsWith(origin)) return route.fulfill({ status: 200, body: '' });
      if (req.isNavigationRequest()) {
        const res = await route.fetch();
        return route.fulfill({ response: res, body: (await res.text()).replace(/<meta[^>]*http-equiv="refresh"[^>]*>/i, '') });
      }
      return route.continue();
    });

    await page.goto(`/${file}`, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
    }));
    if (knownOverflow[file] && test.info().project.name === 'mobile-390') {
      test.info().annotations.push({ type: 'known issue', description: knownOverflow[file] });
    } else {
      expect(scroll, 'sideways scroll').toBeLessThanOrEqual(client);
    }

    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    for (const href of hrefs) {
      const path = href.split(/[?#]/)[0];
      if (!path || /^[a-z][a-z0-9+.-]*:/i.test(path)) continue;
      const target = path.startsWith('/') ? join(root, path) : join(dirname(join(root, file)), decodeURIComponent(path));
      const ok = existsSync(target) && (!statSync(target).isDirectory() || existsSync(join(target, 'index.html')));
      if (!ok) problems.push(`broken link: ${href}`);
    }
    expect(problems, 'console errors, failed requests, broken links').toEqual([]);

    // Scroll anchoring can leave an inner scroll area at a different offset depending on load timing; start every capture from the top.
    await page.evaluate(() => document.querySelectorAll('*').forEach((e) => { e.scrollTop = 0; }));

    // The long panel post can still be settling its layout on a slow runner (two captures 68px apart); wait for fonts and the network, and allow more time for the stable pair.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    // Wait until the page height holds still for 10 animation frames, so a late reflow cannot change the capture size.
    await page.evaluate(() => new Promise((resolve) => {
      let last = -1, still = 0;
      const tick = () => {
        const h = document.documentElement.scrollHeight;
        still = h === last ? still + 1 : 0;
        last = h;
        still >= 10 ? resolve() : requestAnimationFrame(tick);
      };
      tick();
    }));

    // Chromium's full-page capture of a page taller than 16384px comes out at a different height depending on load (20520 or 20474 for the same layout); size the viewport to the page so the capture is the page.
    await page.setViewportSize({ width: page.viewportSize().width, height: await page.evaluate(() => document.documentElement.scrollHeight) });

    await expect(page).toHaveScreenshot(`${file.replace(/\//g, '__')}.png`, {
      timeout: 15000,
      fullPage: true,
      // The chart canvas is a live animation (random starts, real clock), so it is masked; the page around it is compared.
      mask: [page.locator('canvas')],
    });
  });
}

test('every HTML page in the repo is covered', () => {
  const onDisk = readdirSync(root, { recursive: true })
    .map((f) => f.split(sep).join('/'))
    .filter((f) => f.endsWith('.html') && !/(^|\/)(node_modules|test-results|playwright-report|\.[^/]+)\//.test(f));
  expect([...pages, ...templates].sort()).toEqual(onDisk.sort());
});

test('no private addresses or home paths in published files', () => {
  const text = new Set(['.html', '.js', '.css', '.json', '.svg', '.md', '.txt', '.xml']);
  const bad = /127\.0\.0\.1|localhost|\.ts\.net|\/Users\/|\/home\/[a-z]/;
  const skip = new Set(['node_modules', 'test-results', 'playwright-report', 'tests']);
  const hits = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || skip.has(e.name) || (dir === root && e.name.startsWith('playwright.config'))) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (text.has(extname(e.name))) {
        readFileSync(p, 'utf8').split('\n').forEach((l, i) => bad.test(l) && hits.push(`${relative(root, p).split(sep).join('/')}:${i + 1}`));
      }
    }
  })(root);
  expect(hits).toEqual([]);
});

// Public pages state dated facts and plans. Hedging notes about the work's reliability belong in the owner's private notes.
test('no public page uses wording that undersells the work', () => {
  const banned = /isn['’]t scheduled|ran once|guess:|not checked|still rough|honest limit|haven['’]t verified|haven['’]t tried|my guess|did not test|not tested|were tested|not tried|summari[sz]er|close readings|unverified|unsure|\bguess\b(?=<|"| column)/i;
  const hits = [];
  const dataFiles = ['broman-os/brain/brain-data.json', 'broman-os/brain/src/extra.json', 'broman-os/brain/src/site.json'];
  for (const file of [...pages, ...dataFiles]) {
    readFileSync(join(root, file), 'utf8').split('\n').forEach((l, i) => {
      const m = l.match(banned);
      if (m) hits.push(`${file}:${i + 1}: "${m[0]}"`);
    });
  }
  expect(hits).toEqual([]);
});

// ---- share.json: one entry for every page; what is not public is hidden, not deleted ----
const share = JSON.parse(readFileSync(join(root, 'share.json'), 'utf8')).pages;
const retired = share.filter((r) => r.level === 'retired');
const external = (u) => /^https?:/.test(u);

test('share.json: every published HTML page has an entry with a valid level', () => {
  const listed = new Set(share.map((r) => r.path));
  expect([...pages, ...templates].filter((f) => !listed.has(f)), 'pages with no entry').toEqual([]);
  expect(share.filter((r) => !['public', 'link-only', 'retired'].includes(r.level)).map((r) => r.path), 'bad level').toEqual([]);
  expect(share.filter((r) => !existsSync(join(root, r.path))).map((r) => r.path), 'entries with no file').toEqual([]);
  expect(listed.size, 'duplicate entries').toBe(share.length);
});

test('share.json: retired files are kept and every "into" target exists', () => {
  for (const r of retired) {
    expect(existsSync(join(root, r.path)), `kept: ${r.path}`).toBe(true);
    if (!external(r.into)) expect(existsSync(join(root, r.into)), `into: ${r.into}`).toBe(true);
  }
});

// ---- the section moved from /ai-life-os/ to /broman-os/: every old page forwards to its new page, and a #hash survives ----
const movedPages = share.filter((r) => r.path.startsWith('ai-life-os/')).map((r) => r.path);

test('old address: every page that was under /ai-life-os/ has a stub that lands on the same page under /broman-os/', async ({ page }) => {
  // Pages born after the move have no old address, so they need no stub.
  const bornAfterMove = new Set(['broman-os/try/index.html']);
  const newPages = share.filter((r) => r.path.startsWith('broman-os/') && r.level !== 'retired' && !bornAfterMove.has(r.path)).map((r) => r.path);
  expect(movedPages.map((p) => p.replace('ai-life-os/', 'broman-os/')).sort(), 'one stub per page').toEqual(newPages.sort());
  await page.route('**/*', (route) => (route.request().url().startsWith(origin) ? route.continue() : route.fulfill({ status: 200, body: '' })));
  for (const old of movedPages) {
    const now = old.replace('ai-life-os/', 'broman-os/');
    await page.goto(`/${old}`);
    await page.waitForURL(new RegExp(`/${now.replace(/[.]/g, '\\.')}$`));
    // a directory link such as /ai-life-os/blog/ reaches the same stub through index.html
    if (old.endsWith('/index.html') && old !== 'ai-life-os/index.html') {
      await page.goto(`/${old.replace('index.html', '')}`);
      await page.waitForURL(new RegExp(`/${now.replace(/[.]/g, '\\.')}$`));
    }
  }
  await page.goto('/ai-life-os/index.html#safety');
  await page.waitForURL(/\/broman-os\/index\.html#safety$/);
});

test('share.json: no chart node points at a page that is not public', () => {
  const data = readFileSync(join(root, 'broman-os/brain/brain-data.json'), 'utf8');
  const urls = [...data.matchAll(/"(?:url|href)":\s*"([^"]+)"/g)].map((m) => m[1]).filter((u) => !external(u));
  const hit = urls
    .map((u) => join('broman-os/brain', u.split('#')[0]).split(sep).join('/'))
    .filter((p) => share.some((r) => r.level !== 'public' && r.path === p));
  expect(hit).toEqual([]);
});

test('build: a link-only page gets a static noindex and no robots.txt line, a retired one keeps its Disallow', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'share-build-'));
  try {
    cpSync(join(root, 'broman-os'), join(tmp, 'broman-os'), { recursive: true });
    cpSync(join(root, 'ai-life-os'), join(tmp, 'ai-life-os'), { recursive: true }); // the old-address stubs are share.json entries too
    const fixture = share.map((r) => (r.path === 'broman-os/arena.html' ? { ...r, level: 'link-only' } : r));
    writeFileSync(join(tmp, 'share.json'), JSON.stringify({ pages: fixture }));
    execFileSync('python3', ['-I', join(tmp, 'broman-os/brain/build_data.py')], { stdio: 'pipe' });
    expect(readFileSync(join(tmp, 'broman-os/arena.html'), 'utf8')).toMatch(/<meta\s+name="robots"\s+content="noindex">/);
    const disallowed = readFileSync(join(tmp, 'robots.txt'), 'utf8').split('\n').filter((l) => l.startsWith('Disallow:'));
    expect(disallowed).not.toContain('Disallow: /broman-os/arena.html');
    expect(disallowed).toEqual(retired.map((r) => `Disallow: /${r.path}`).sort());
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ---- the blog: index cards from share.json, and the Calm panel post ----
test('blog index: lists exactly the public posts, newest first inside each group, no hidden post', async ({ page }) => {
  // The harness arena is a post too: it keeps its own address one folder up, so its card links to ../arena.html.
  const posts = share
    .filter((r) => /^broman-os\/(blog\/(?!index\.html)[^/]+|arena)\.html$/.test(r.path))
    .map((r) => ({ ...r, file: r.path.endsWith('/arena.html') ? '../arena.html' : r.path.split('/').pop() }));
  await page.goto('/broman-os/blog/index.html');
  const listed = await page.$$eval('.p-post h3 a', (as) => as.map((a) => a.getAttribute('href')));
  expect([...listed].sort()).toEqual(posts.filter((p) => p.level === 'public').map((p) => p.file).sort());
  expect(listed.filter((h) => posts.some((p) => p.level !== 'public' && p.file === h)), 'hidden posts listed').toEqual([]);
  const groups = await page.$$eval('.p-group', (gs) => gs.map((g) => [...g.querySelectorAll('.p-post time')].map((t) => t.getAttribute('datetime'))));
  for (const dates of groups) expect(dates, 'newest first').toEqual([...dates].sort().reverse());
  for (const c of await page.locator('.p-post').all()) {
    await expect(c.locator('.p-kicker')).not.toBeEmpty();
    await expect(c.locator('time')).toHaveCount(1);
    await expect(c.locator('.p-byline')).toContainText('min read');
  }
});

test('panel post: header, index, side cards, numbered panels; columns follow the width; no inline styles', async ({ page }) => {
  await page.goto('/broman-os/blog/everything-is-a-file.html');
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'hud'); // no saved choice: the default skin
  await expect(page.locator('.p-kicker')).toBeVisible();
  await expect(page.locator('.p-title .p-hl')).toHaveCount(1);
  await expect(page.locator('.p-sub')).toBeVisible();
  expect(await page.locator('.p-tags li').count()).toBeGreaterThan(0);
  const side = await page.locator('.p-side > *').count();
  expect(side).toBeGreaterThanOrEqual(1);
  expect(side).toBeLessThanOrEqual(3);
  const panels = page.locator('.p-grid > .p-panel');
  expect(await panels.count(), 'panels capped near 7').toBe(8);
  await expect(panels.locator('.p-principle')).toHaveCount(8);
  await expect(page.locator('.p-panel .p-num')).toHaveText(['01', '02', '03', '04', '05', '06', '07', '08']);
  await expect(page.locator('.p-panel h2').first()).toHaveText('The problem');
  await expect(page.locator('.p-panel h2').nth(1)).toContainText('The idea');
  await expect(page.locator('.p-panel h2').last()).toHaveText('Why it matters');
  await expect(page.locator('.p-head + .p-intro')).toContainText('Every chat with an AI starts from zero.');
  await expect(page.locator('#p2'), 'the Unix origin is one short aside').toContainText('Unix');
  await expect(page.locator('#p7')).toContainText('RAG');
  await expect(page.locator('#p1 .p-box'), 'one problem and what it costs').toHaveCount(2);
  await expect(page.locator('#p1')).toContainText('Every chat starts from zero');
  await expect(page.locator('#p3 h2'), 'the first step comes early').toHaveText('Your first five minutes');
  await expect(page.locator('#p3 .p-steps li'), 'first five minutes: four steps').toHaveCount(4);
  await expect(page.locator('#p6 .p-steps li'), 'three habits').toHaveCount(3);
  const targets = await page.$$eval('.p-index a', (as) => as.map((a) => a.getAttribute('href')));
  expect(targets.length).toBe(8);
  const mores = await page.$$eval('.p-more', (as) => as.map((a) => ({ href: a.getAttribute('href'), text: a.textContent })));
  expect(mores.length, 'one link to the full section per panel').toBe(8);
  for (const { text } of mores) expect(text, 'link text says what it opens').not.toMatch(/section \d/i);
  // each panel's link opens the full-post section that carries the panel's own subject
  for (const [i, { href }] of mores.entries()) {
    const sectionHead = (await page.locator(`${href} > h2`).textContent()).toLowerCase();
    const panelHead = (await page.locator(`#p${i + 1} h2`).first().textContent()).toLowerCase();
    expect(sectionHead.split(/\W+/).filter((w) => w.length > 3).some((w) => panelHead.includes(w)), `${href} matches panel ${i + 1}`).toBe(true);
  }
  for (const t of [...targets, ...mores.map((m) => m.href), '#p3']) {
    await expect(page.locator(t), t).toHaveCount(1);
  }
  // one analogy, the library; no self-undermining hedges; no unexplained insider words in the panels
  const panelText = (await page.locator('.p-grid').innerText()).toLowerCase();
  for (const word of ['kitchen', 'recipe', 'chef', 'tailor', 'my view, not a study', 'in my reading', 'good enough to start', 'i think']) {
    expect(panelText, `panels do not say "${word}"`).not.toMatch(new RegExp(`\\b${word}\\b`));
  }
  for (const word of ['icm', 'backpass', 'kun chen', 'firstmate', 'dotfiles']) {
    expect(panelText, `panels do not use the insider word "${word}"`).not.toMatch(new RegExp(`\\b${word}\\b`));
  }
  const bodyText = (await page.locator('main').innerText()).toLowerCase();
  for (const word of ['kitchen', 'recipe', 'chef', 'tailor', 'my view, not a study', 'in my reading', 'good enough to start', 'i think']) {
    expect(bodyText, `the post does not say "${word}"`).not.toMatch(new RegExp(`\\b${word}\\b`));
  }
  await expect(page.locator('.p-full .p-prose, .p-full.p-prose')).toHaveCount(1);
  const cols = await page.$eval('.p-grid', (g) => getComputedStyle(g).gridTemplateColumns.split(' ').length);
  if (test.info().project.name === 'mobile-390') expect(cols, 'panels stack at 390').toBe(1);
  else expect(cols, 'panels use 2 or 3 columns at 1280').toBeGreaterThanOrEqual(2);
  expect(await page.locator('[style], style').count(), 'no inline style').toBe(0);
});

test('panel post: the library scene is a labelled SVG that fits the width, names all five parts, and every panel has a marker icon', async ({ page }) => {
  await page.goto('/broman-os/blog/everything-is-a-file.html');
  const svg = page.locator('.p-fig svg');
  await expect(svg).toHaveAttribute('role', 'img');
  await expect(svg.locator('title')).not.toBeEmpty();
  await expect(svg.locator('desc')).not.toBeEmpty();
  // the five parts of the one analogy are written on the drawing
  const labels = (await svg.locator('text').allTextContents()).join(' | ');
  for (const part of ['The library', 'Filing cabinet', 'Card catalogue', 'Reading desk', 'Librarian']) expect(labels, part).toContain(part);
  await expect(svg.locator('.p-svg-dot'), 'three numbered steps').toHaveCount(3);
  const box = await svg.boundingBox();
  const vw = page.viewportSize().width;
  expect(box.x, 'inside the page').toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, 'inside the page').toBeLessThanOrEqual(vw);
  // every label stays inside the drawing: no text runs past the edge
  const out = await svg.evaluate((s) => {
    const r = s.getBoundingClientRect();
    return [...s.querySelectorAll('text')].filter((t) => { const b = t.getBoundingClientRect(); return b.left < r.left - 1 || b.right > r.right + 1 || b.top < r.top - 1 || b.bottom > r.bottom + 1; }).map((t) => t.textContent);
  });
  expect(out).toEqual([]);
  // labels stay legible on a phone: the 13px captions are drawn no smaller than 10px
  const smallest = await svg.evaluate((s) => Math.min(...[...s.querySelectorAll('text')].map((t) => parseFloat(getComputedStyle(t).fontSize) * (s.getBoundingClientRect().width / s.viewBox.baseVal.width))));
  expect(smallest, 'smallest label in screen pixels').toBeGreaterThanOrEqual(9.5);
  // one marker icon per panel, reused from the page's own sprite
  const icons = page.locator('.p-panel-h svg.p-ico');
  await expect(icons).toHaveCount(8);
  for (const ico of await icons.all()) {
    await expect(ico).toHaveAttribute('aria-hidden', 'true');
    const id = (await ico.locator('use').getAttribute('href')).slice(1);
    await expect(page.locator(`.p-sprite symbol#${id}`), id).toHaveCount(1);
  }
});

// ---- the five public posts: one panel shape, grouped by series ----
// The page loop above already takes a phone (390) and a desktop (1280) screenshot of each; these checks pin the structure.
const convertedPosts = [
  { slug: 'everything-is-a-file', series: 'Signal from noise', panels: 8 },
  { slug: 'second-brain-page', series: 'Signal from noise', panels: 7 },
  { slug: 'one-harness-for-every-agent', series: 'Customize everything, including yourself', panels: 5 },
  { slug: 'when-the-notes-are-wrong', series: 'Safe AI crews', panels: 5 },
];

test('converted posts: each one is a covered page, public in share.json and listed on the blog index under its series', async ({ page }) => {
  await page.goto('/broman-os/blog/index.html');
  const groups = await page.$$eval('.p-group', (gs) => gs.map((g) => ({ title: g.querySelector('h2').textContent, hrefs: [...g.querySelectorAll('.p-post h3 a')].map((a) => a.getAttribute('href')), kickers: [...g.querySelectorAll('.p-post .p-kicker')].map((k) => k.textContent) })));
  for (const { slug, series } of convertedPosts) {
    expect(pages, `${slug} gets a screenshot at both widths`).toContain(`broman-os/blog/${slug}.html`);
    expect(share.find((r) => r.path === `broman-os/blog/${slug}.html`)?.level, `${slug} level`).toBe('public');
    const group = groups.find((g) => g.hrefs.includes(`${slug}.html`));
    expect(group?.title, `${slug} group`).toBe(series);
    expect(group.kickers.every((k) => k === series), 'card kicker is the series').toBe(true);
  }
  expect(groups.map((g) => g.title), 'one group per series, no empty group').toEqual(['Signal from noise', 'Customize everything, including yourself', 'Safe AI crews']);
  expect(await page.locator('.p-posts a[href*="progress-three-weeks"], .p-posts a[href*="trading"]').count(), 'retired and draft posts stay off the index').toBe(0);
  for (const gone of ['how-it-fits-together', 'guides-and-sensors', 'rules-from-chat-history']) {
    expect(await page.locator(`.p-posts a[href*="${gone}"]`).count(), `${gone} left the site`).toBe(0);
  }
});

// The harness arena is a post: problem, then solution with its evidence, then gaps, then the full tier list and radar.
test('arena post: problem, solution and gaps in that order before the full table; the skip link and the blog kicker work', async ({ page }) => {
  await page.goto('/broman-os/arena.html');
  const heads = await page.$$eval('.k-article > h2', (hs) => hs.map((h) => h.textContent.trim()));
  expect(heads.slice(0, 4)).toEqual(['The problem: picking an agent harness is hard', 'The solution and the evidence', 'Gaps and tech debt', 'The full scoring table and radar']);
  await expect(page.locator('.k-kicker a'), 'kicker links to the Blog').toHaveAttribute('href', 'blog/index.html');
  await page.locator('a[href="#full-table"]').first().click();
  await expect(page).toHaveURL(/#full-table$/);
  await expect(page.locator('#full-table')).toHaveCount(1);
  for (const id of ['arena-table', 'head-to-head', 'open-vs-locked', 'grid-table']) await expect(page.locator(`#${id}`), id).toHaveCount(1);
  expect(await page.locator('.k-article').innerText(), 'no insider acronym on the page').not.toMatch(/\bICM\b/i);
});

// The trimmed posts: no file layout or routing table, and the second brain post shows a picture, not a live page.
test('trimmed posts: no routing table or file layout, second brain post uses a screenshot', async ({ page }) => {
  for (const slug of ['everything-is-a-file', 'one-harness-for-every-agent']) {
    await page.goto(`/broman-os/blog/${slug}.html`);
    const text = (await page.locator('main').innerText()).toLowerCase();
    expect(text, `${slug}: routing table`).not.toContain('routing table');
    expect(text, `${slug}: file layout`).not.toContain('how each tool finds it');
  }
  await page.goto('/broman-os/blog/second-brain-page.html');
  await expect(page.locator('#fig-screenshot img'), 'the screenshot').toHaveCount(1);
  await expect(page.locator('main iframe, main a[href*="broman-os/index.html"], main a[href$="../index.html"]'), 'no live page link or frame').toHaveCount(0);
});

for (const { slug, series, panels: expected } of convertedPosts) {
  test(`converted post ${slug}: series label, problem first, why it matters last, panels capped, one try-it box, no inline style, no private links`, async ({ page }) => {
    const file = `broman-os/blog/${slug}.html`;
    await page.goto(`/${file}`);
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'hud');
    await expect(page.locator('.p-head .p-kicker span')).toHaveText(series);
    await expect(page.locator('.p-title .p-hl')).toHaveCount(1);
    await expect(page.locator('.p-sub')).toBeVisible();
    await expect(page.locator('.p-byline time')).toHaveCount(1);
    expect(await page.locator('.p-tags li').count()).toBeGreaterThan(0);
    const side = await page.locator('.p-side > *').count();
    expect(side).toBeGreaterThanOrEqual(1);
    expect(side).toBeLessThanOrEqual(3);

    const panels = page.locator('.p-grid > .p-panel');
    expect(await panels.count(), 'numbered panels').toBe(expected);
    if (slug !== 'everything-is-a-file') expect(expected, 'at most 7 numbered panels').toBeLessThanOrEqual(7);
    await expect(panels.locator('.p-principle')).toHaveCount(expected);
    await expect(page.locator('.p-panel .p-num')).toHaveText(Array.from({ length: expected }, (_, i) => String(i + 1).padStart(2, '0')));
    await expect(page.locator('.p-panel h2').first()).toHaveText('The problem');
    await expect(page.locator('.p-panel h2').nth(1)).toContainText('The idea');
    await expect(page.locator('.p-panel h2').last()).toHaveText('Why it matters');
    // the library post names one problem and puts its first step in panel 3 (its own test above); the others keep four problems and a last-panel try-it box
    if (slug !== 'everything-is-a-file') {
      await expect(page.locator('#p1 .p-box'), 'four problems').toHaveCount(4);
      await expect(page.locator('.p-panel:last-child .p-box:has(h3:text-is("Try it yourself")) .p-steps li'), 'try it yourself: three steps').toHaveCount(3);
    }

    const targets = await page.$$eval('.p-index a', (as) => as.map((a) => a.getAttribute('href')));
    expect(targets.length).toBe(expected);
    for (const t of [...targets, ...(await page.$$eval('.p-more', (as) => as.map((a) => a.getAttribute('href'))))]) {
      await expect(page.locator(t), t).toHaveCount(1);
    }

    // the full post opens with the problem and ends with why it matters, (what is still rough,) try it yourself, credits
    const heads = await page.$$eval('.p-full > section > h2', (hs) => hs.map((h) => h.textContent.replace(/^\d+\.\s*/, '')));
    expect(heads[0]).toMatch(/^The problem/);
    const at = (prefix) => heads.findIndex((h) => h.startsWith(prefix));
    expect(at('Why it matters'), 'why it matters follows the argument').toBeGreaterThan(0);
    expect(at('Why it matters')).toBeLessThan(at('Credits'));
    if (slug !== 'everything-is-a-file') {
      // the pilot keeps "Try it yourself" inside "Why it matters" and has no "What's still rough" section;
      // the second-brain post folds its rough edges into "What's next"
      const rough = heads.findIndex((h) => /^What's (still rough|next)/.test(h));
      expect(at('Why it matters')).toBeLessThan(rough);
      expect(rough).toBeLessThan(at('Try it yourself'));
      expect(at('Try it yourself')).toBeLessThan(at('Credits'));
    }

    expect(await page.locator('[style], style').count(), 'no inline style').toBe(0);
    expect(await page.locator('script[src*="article.js"], script[src*="hud.js"]').count(), 'Calm pages load no frame script').toBe(0);
    for (const svg of await page.locator('.p-full svg').all()) {
      await expect(svg).toHaveAttribute('role', 'img');
      await expect(svg.locator('title').first()).not.toBeEmpty();
      const box = await svg.boundingBox();
      expect(box.x + box.width, 'figure fits the width').toBeLessThanOrEqual(page.viewportSize().width);
    }

    // public site: no local or tailnet addresses, no home paths, no private repo links
    const html = readFileSync(join(root, file), 'utf8');
    expect(html.match(/127\.0\.0\.1|localhost|\.ts\.net|tailnet|\/Users\/|github\.com\/codeami\/(?!codeami\.github\.io)/gi), 'private or local address').toBeNull();
  });
}

// ---- the landing at /: one purpose line, a clip of the pipeline, three dated numbers, two buttons ----
test('landing: the purpose line, the pipeline clip, three numbers that each name a source and a date, two buttons; no walk, no trip', async ({ page }) => {
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(e.message));
  await page.route('**/*', (route) => (route.request().url().startsWith(origin) ? route.continue() : route.fulfill({ status: 200, body: '' })));
  await page.goto('/');
  await expect(page).toHaveTitle('Broman OS · Me');
  const hook = page.locator('#hook');
  await expect(page.locator('#pageov')).toBeVisible();
  await expect(hook.locator('h1')).toHaveText(mission);
  await expect(hook.locator('iframe')).toHaveAttribute('src', 'broman-os/pipeline/index.html');
  const nums = hook.locator('.stats li');
  await expect(nums).toHaveCount(3);
  for (const li of await nums.all()) {
    await expect(li.locator('.num')).toHaveText(/^\d+$/);
    await expect(li.locator('.src')).toContainText(/Source: .*\b(20\d\d)\b/);
    await expect(li.locator('.src')).toContainText(/\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) 20\d\d/);
  }
  await expect(hook.locator('.next-links a')).toHaveText(['See it work', 'Talk to me']);
  expect(await hook.locator('.next-links a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['broman-os/index.html', 'work-with-me/index.html']);
  // the old first-visit trip and the eight-step walk are gone
  for (const gone of ['#trip', '#explain', '#flow', '#step-1', '#step-8', '#replay']) await expect(page.locator(gone), gone).toHaveCount(0);
  const html = await page.content();
  expect(html).not.toMatch(/\bSam\b|~230/);
  expect(html).not.toMatch(/type="email"|<form|<input/i);
  expect(html).not.toMatch(/\$\d|\bprice|\bsubscribe|\bsign up\b|\bnewsletter/i);
  expect(await page.evaluate(() => localStorage.getItem('trip:v1'))).toBeNull();
  const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, o: [...document.querySelectorAll('.pov-body')].map((b) => b.scrollWidth - b.clientWidth) }));
  expect(w.s, 'page width').toBeLessThanOrEqual(w.c);
  expect(Math.max(0, ...w.o), 'card width').toBeLessThanOrEqual(0);
  expect(problems).toEqual([]);
});

test('landing: a fresh load shows the headline and the map with the controls, the Broman OS card and the tree closed; each choice is kept for the next visit', async ({ page }) => {
  await page.goto('/');
  const phone = test.info().project.name === 'mobile-390';
  const card = page.locator('#pageov'), panel = page.locator('#brainHost #panel'), tree = page.locator('#brainHost #wl');
  await mapState(page);
  await expect(card, 'the card is folded').toHaveClass(/min/);
  await expect(card.locator('.pov-line'), 'the headline stays').toHaveText(mission);
  await expect(page.locator('.pov-body'), 'the page body is folded away').toBeHidden();
  await expect(panel, 'controls closed').toBeHidden();
  await expect(tree, 'tree closed').toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('panels')), 'a first visit stores nothing').toBeNull();
  // everything is still one tap away
  await page.getByRole('button', { name: 'Show the page' }).click();
  await expect(page.locator('#hook')).toBeVisible();
  if (phone) return; // the controls and the tree are remembered on a wide screen only
  await page.locator('#tbDrop').click();
  await page.locator('#tbSheet').getByRole('button', { name: 'All settings' }).click();
  await page.locator('#tbDrop').click();
  await page.locator('#tbSheet').getByRole('button', { name: 'Widgets' }).click();
  await expect(panel).toBeVisible();
  await expect(tree).toBeVisible();
  await page.reload();
  await mapState(page);
  await expect(card, 'the card comes back open').not.toHaveClass(/min/);
  await expect(panel, 'controls come back open').toBeVisible();
  await expect(tree, 'tree comes back open').toBeVisible();
});

test('landing: blocked storage still gives a clean first load', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.goto('/');
  await expect(page.locator('#pageov')).toHaveClass(/min/);
  await expect(page.locator('#brainHost #panel')).toBeHidden();
});

test('landing: the pipeline clip has no private names, paths or fetches', async ({ page }) => {
  const asked = [];
  page.on('request', (r) => asked.push(r.url()));
  await page.goto('/broman-os/pipeline/index.html');
  // The step content sits in the detail drawer, which is closed on a phone until a card is opened; it only has to be built.
  await page.waitForSelector('#stages .stage', { state: 'attached' });
  const html = readFileSync(join(root, 'broman-os/pipeline/index.html'), 'utf8') + readFileSync(join(root, 'broman-os/pipeline/flow-anim.js'), 'utf8');
  expect(html).not.toMatch(/fm-inbox|operational-inbox|data\/<task>|\/Users\/|\.ts\.net|127\.0\.0\.1|localhost|@[a-z0-9-]+\.[a-z]|lavish/i);
  expect(asked.filter((u) => !u.startsWith(origin)), 'only this site is asked').toEqual([]);
  await page.getByRole('button', { name: /Replay/ }).click();
});

// ---- whoami first: one lit node, a short CV, a way past it, and no click that only reloads ----
const mapState = async (page) => {
  await page.waitForFunction(() => window.AIOMap && window.AIOMap.state().here); // set once the chart's data has loaded
  return page.evaluate(() => window.AIOMap.state());
};
// A real mouse click on the node, found through the chart's own coordinates.
const clickNode = async (page, label) => {
  await mapState(page);
  // wait until the node stops moving: two consecutive frames report the same position
  const at = await page.evaluate((l) => new Promise((resolve) => {
    const frame = (prev) => requestAnimationFrame(() => {
      const now = window.AIOMap.screenOf(l);
      if (prev && prev[0] === now[0] && prev[1] === now[1]) resolve(now);
      else frame(now);
    });
    frame(null);
  }), label);
  const box = await page.locator('canvas').first().boundingBox();
  await page.mouse.click(box.x + at[0], box.y + at[1]);
};
const stays = (page) => page.evaluate(() => { window.__stay = true; });
const stayed = (page) => page.evaluate(() => window.__stay === true);

test('landing: the chart lights one node, whoami', async ({ page }) => {
  for (const url of ['/', '/#me']) {
    await page.goto('about:blank');
    await page.goto(url);
    expect(await mapState(page), url).toEqual({ here: 'whoami', lit: ['whoami'] });
  }
});

test('landing: Me is a short block with the title, the About and CV links, and the contact line', async ({ page }) => {
  await page.goto('/#me');
  const who = page.locator('#me');
  await expect(who).toBeVisible();
  await expect(who.locator('h2')).toHaveText('Ashish Raina');
  await expect(who.locator('.k-dek')).toContainText('Technical Program Manager · AI-native delivery');
  await expect(who.getByRole('link', { name: 'About me' })).toHaveAttribute('href', 'about/index.html');
  await expect(who.getByRole('link', { name: 'Full CV' })).toHaveAttribute('href', 'cv.html');
  await expect(who.locator('.contact a')).toHaveText(['rainaash@gmail.com', 'LinkedIn']);
  await expect(who.locator('.contact a').first()).toHaveAttribute('href', 'mailto:rainaash@gmail.com');
});

// ---- one top bar on every page, and a last-line hand-off to the next page in the bar order ----
// No skip list: every public page carries the bar. The one exception is blog/index.html, a redirect that never shows.
const redirects = ['blog/index.html', 'intent/index.html']; // stubs that never show: the Blog list and Intent both moved
const barPages = () => pages.filter((f) => !share.some((r) => r.path === f && r.level !== 'public') && !redirects.includes(f));
const barItems = ['Meta-Factory', 'Case studies', 'Blog', 'About', 'Work with me'];
const barPaths = ['/broman-os/index.html', '/case-studies/index.html', '/broman-os/blog/index.html', '/about/index.html', '/work-with-me/index.html'];

// What a page's bar says: the site name, then each item's text and target.
const barOf = (page) => page.locator('header.tb').evaluate((b) => ({
  brand: b.querySelector('.tb-brand').textContent.trim(),
  home: new URL(b.querySelector('.tb-brand').href).pathname,
  items: [...b.querySelectorAll('.tb-links > a')].map((a) => [a.textContent.trim() || a.getAttribute('aria-label'), new URL(a.href).origin === location.origin ? new URL(a.href).pathname : a.href]),
}));

test('top bar: Meta-Factory, Case studies, Blog, About and Work with me on every page, all in view, current page marked', async ({ page }) => {
  expect(barPages().length, 'pages checked').toBe(pages.length - 4 - movedPages.length); // the two redirect stubs, the link-only Course and the link-only pipeline clip, and the old-address stubs
  for (const file of barPages()) {
    await page.goto(`/${file}`);
    const bar = page.locator('header.tb');
    await expect(bar, file).toHaveCount(1);
    const links = bar.locator('.tb-links > a');
    await expect(links, file).toHaveCount(5);
    expect(await links.evaluateAll((as) => as.map((a) => a.textContent.trim())), file).toEqual(barItems);
    const paths = await links.evaluateAll((as) => as.map((a) => new URL(a.href).pathname));
    expect(paths, file).toEqual(barPaths);
    expect(await bar.locator('.tb-links > a[aria-current]').count(), `${file}: one current item at most`).toBeLessThanOrEqual(1);
    expect(await bar.evaluate((b) => b.scrollWidth <= b.clientWidth + 1), `${file}: bar fits the width`).toBe(true);
    // no Menu button: all five items are in view at this width, and the site name is on the bar
    for (let i = 0; i < 5; i++) await expect(links.nth(i), `${file}: item ${i} in view`).toBeVisible();
    await expect(bar.locator('.tb-menu'), `${file}: no Menu button`).toHaveCount(0);
    await expect(bar.locator('.tb-brand'), file).toHaveText('Ashish Raina Powered by Broman OS');
    const inView = await links.evaluateAll((as) => as.every((a) => { const r = a.getBoundingClientRect(); return r.left >= 0 && r.right <= document.documentElement.clientWidth; }));
    expect(inView, `${file}: every item inside the screen width`).toBe(true);
  }
});

test('top bar: clicking each item on every public page lands on a page with the same bar and the same site name', async ({ page }) => {
  test.setTimeout(180000); // every bar page times five items is over a hundred navigations
  await page.route('**/*', (route) => (route.request().url().startsWith(origin) ? route.continue() : route.fulfill({ status: 200, body: '' })));
  await page.goto('/index.html');
  const same = await barOf(page);
  expect(same.brand).toBe('Ashish Raina Powered by Broman OS');
  expect(same.items.map((i) => i[0])).toEqual(barItems);
  for (const file of barPages()) {
    for (const [n, label] of barItems.entries()) {
      await page.goto(`/${file}`);
      const link = page.locator('header.tb .tb-links > a').nth(n);
      await expect(link, `${file}: ${label}`).toHaveText(label);
      await link.click();
      await page.waitForURL((u) => u.pathname === barPaths[n], { timeout: 10000 });
      await page.waitForSelector('header.tb');
      expect(await barOf(page), `${file} then ${label}: same bar and site name`).toEqual(same);
      await expect(page.locator('header.tb .tb-links > a[aria-current]'), `${label} marks itself`).toHaveText(label);
    }
  }
});

test('skin: one saved choice. Switch once and every page follows, before first paint; the default is HUD', async ({ page }) => {
  const all = ['index.html', 'broman-os/index.html', 'case-studies/index.html', 'broman-os/blog/index.html', 'broman-os/blog/everything-is-a-file.html', 'about/index.html', 'cv.html', 'work-with-me/index.html', 'broman-os/arena.html', 'broman-os/course/index.html'];
  const skinOf = () => page.evaluate(() => document.documentElement.dataset.skin);
  await page.goto('/cv.html');
  expect(await skinOf()).toBe('hud');
  await page.locator('#theme').click();
  expect(await skinOf()).toBe('matrix');
  await page.locator('#theme').click();
  expect(await skinOf()).toBe('calm');
  for (const file of all) {
    // the attribute is set by a script in the head, so it is on <html> as soon as the DOM starts
    await page.goto(`/${file}`, { waitUntil: 'commit' });
    await page.waitForFunction(() => !!document.documentElement.dataset.skin);
    expect(await skinOf(), file).toBe('calm');
  }
  await page.locator('#theme').click();
  expect(await skinOf(), 'Calm, then the next click, is HUD again').toBe('hud');
  await page.goto('/about/index.html');
  expect(await skinOf(), 'the choice was saved').toBe('hud');
});

test('top bar: the current page is marked in each part of the bar', async ({ page }) => {
  const current = { 'cv.html': 'About', 'about/index.html': 'About', 'work-with-me/index.html': 'Work with me', 'case-studies/index.html': 'Case studies', 'broman-os/arena.html': 'Case studies', 'broman-os/blog/index.html': 'Blog', 'broman-os/blog/second-brain-page.html': 'Blog', 'broman-os/index.html': 'Meta-Factory' };
  for (const [file, label] of Object.entries(current)) {
    await page.goto(`/${file}`);
    await expect(page.locator('header.tb .tb-links > a[aria-current]'), file).toHaveText(label);
  }
  // the Home page and the Course are not in the bar, so neither marks an item
  for (const file of ['index.html', 'broman-os/course/index.html']) {
    await page.goto(`/${file}`);
    await expect(page.locator('header.tb .tb-links > a[aria-current]'), file).toHaveCount(0);
  }
});

test('hand-off: the last line of each bar page leads to the next page in the bar order', async ({ page }) => {
  const chain = [
    ['broman-os/index.html#pages', '.handoff a', /\/case-studies\/index\.html$/], // a hash opens the folded card
    ['case-studies/index.html', '.handoff a', /\/broman-os\/blog\/index\.html$/],
    ['broman-os/blog/index.html', '.handoff a', /\/about\/index\.html$/],
    ['about/index.html', '.handoff a', /\/work-with-me\/index\.html$/],
  ];
  for (const [file, sel, target] of chain) {
    await page.goto(`/${file}`);
    const link = page.locator(`${sel}:visible`).last();
    await expect(link, file).toHaveAttribute('href', /.+/);
    expect(new URL(await link.getAttribute('href'), page.url()).href, file).toMatch(target);
  }
});

test('Meta-Factory page: how it works holds how I work with agents, what the crew may do, who it is for and the credits; Intent is a redirect that keeps its anchors', async ({ page }) => {
  await page.goto('/broman-os/index.html#safety');
  const law = page.locator('aside.law');
  await expect(law.locator('#how')).toHaveText('How I work with agents');
  await expect(law.locator('#safety')).toHaveText('What the crew may do, and what waits for me');
  await expect(law.locator('#how ~ p strong').filter({ hasText: /^(On its own|Waits for me|Never)$/ })).toHaveText(['On its own', 'Waits for me', 'Never']);
  await expect(law).toContainText('throwaway copy of the repo, one per task');
  await expect(law.locator('#doors ~ ul').first().locator('li')).toHaveCount(4);
  await expect(law.locator('#credits ~ p').first().locator('a')).toHaveCount(7);
  const text = await law.innerText();
  for (const name of ['AI-Life-OS', 'AIO OS', 'EA-bot', 'Chart Room']) expect(text, name).not.toContain(name);
  // the old Intent address still works, and a section anchor survives the redirect
  await page.goto('/intent/index.html#how');
  await page.waitForURL(/broman-os\/index\.html#how$/);
  await page.goto('/intent/index.html');
  await page.waitForURL(/broman-os\/index\.html$/);
});

test('landing: the logo and the page card never reload the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#pageov')).toBeVisible();
  await stays(page);
  // on a phone the sheet can cover the map: fold it away first, as a reader would
  await page.locator('.k-nav .k-home').click();
  await expect(page.locator('#hook')).toBeVisible();
  expect(await mapState(page)).toEqual({ here: 'whoami', lit: ['whoami'] });
  expect(await stayed(page), 'the logo: same document').toBe(true);
  // the page is a card over the map: close it, the whole map shows, and the page can come back
  await page.getByRole('button', { name: 'Close the page and show the whole map' }).click();
  await expect(page.locator('#pageov')).toBeHidden();
  await page.getByRole('button', { name: 'Show page' }).click();
  await expect(page.locator('#hook')).toBeVisible();
  expect(await stayed(page), 'the card: same document').toBe(true);
});

test('cv.html: the plain web CV is the v5 text without a phone number, an email, the employer name or a file to download', async ({ page }) => {
  await page.goto('/cv.html');
  await expect(page.locator('h1')).toHaveText('Ashish Raina');
  await expect(page.locator('.cv-role')).toHaveText('Technical Program Manager · AI-native delivery');
  await expect(page.locator('main h2')).toHaveText(['Profile', 'Selected outcomes', 'Experience', 'AI-native delivery', 'Earlier career', 'Skills and education']);
  const links = await page.$$eval('.cv-links a', (as) => as.map((a) => a.getAttribute('href')));
  expect(links).toEqual(['https://www.linkedin.com/in/ashish-raina-6308a28', 'https://github.com/codeami', 'index.html']);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/\+\d[\d\s-]{8,}|@[a-z0-9-]+\.[a-z]|rainaash|adidas/i);
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs.filter((h) => /\.(docx?|pdf)$/i.test(h)), 'no file downloads').toEqual([]);
  expect(readdirSync(root).filter((f) => /\.(docx?|pdf)$/i.test(f)), 'no CV file in the repo').toEqual([]);
  // the way on: the CV sits under Me, so its next stop is the Blog and its way back is Me
  await expect(page.getByRole('link', { name: 'Next: what I write' }).first()).toHaveAttribute('href', 'broman-os/blog/index.html');
  await expect(page.getByRole('link', { name: 'Back to Me' })).toHaveAttribute('href', 'index.html#me');
});

test('the demo chat holds the story and tour branches', () => {
  const t = JSON.parse(readFileSync(join(root, 'broman-os/tour/tour.json'), 'utf8')).chat;
  const folders = new Set(t.nodes.map((n) => n.folder));
  expect(folders.has('story') && folders.has('tour')).toBe(true);
  const ids = new Set(t.nodes.map((n) => n.id));
  for (const n of t.nodes) for (const x of n.next) expect(ids.has(x), `${n.id} -> ${x}`).toBe(true);
});

test('wiki notes card: a summary, a cloud of interest tags sized by note count, empty tags dashed, each tag lists its notes', async ({ page }) => {
  await page.goto('/broman-os/index.html#pocock-steers-with-skills-kun-builds-machinery');
  const drawer = page.locator('#drawer');
  await drawer.getByRole('tab', { name: 'Related' }).click();
  await drawer.locator('.rel button', { hasText: 'Second-brain notes' }).click();
  await expect(drawer.locator('h2.t')).toHaveText('Second-brain notes');
  await expect(drawer.locator('.pane p').first()).toContainText('25 notes');
  const tags = await drawer.locator('.ctag').evaluateAll((bs) => bs.map((b) => ({ name: b.firstChild.textContent, n: +b.querySelector('.cn').textContent, size: parseFloat(getComputedStyle(b).fontSize), dashed: getComputedStyle(b).borderTopStyle === 'dashed' })));
  expect(tags.length, 'the interest list').toBeGreaterThanOrEqual(8);
  expect(tags.length).toBeLessThanOrEqual(14);
  for (const t of tags) expect(t.dashed, `${t.name}: dashed only when empty`).toBe(t.n === 0);
  expect(tags.filter((t) => t.n === 0).length, 'empty tags are shown').toBeGreaterThan(0);
  const big = tags.reduce((a, b) => (b.n > a.n ? b : a)), small = tags.filter((t) => t.n > 0).reduce((a, b) => (b.n < a.n ? b : a));
  expect(big.size, 'more notes, bigger tag').toBeGreaterThan(small.size);
  expect(tags.reduce((s, t) => s + t.n, 0), 'a note can carry more than one tag').toBeGreaterThan(25);
  const first = drawer.locator('.ctag').filter({ hasText: big.name });
  await first.click();
  expect(await drawer.locator('.cloud-l button').count(), 'the tag lists its notes').toBe(big.n);
  await drawer.locator('.cloud-l button').first().click();
  await expect(drawer.locator('h2.t')).not.toHaveText('Second-brain notes');
  await expect(drawer.locator('.ln')).toContainText('kind:');
});

test('room drawer: every Related chip is one line, at most 28 px tall, with its full text in the title', async ({ page }) => {
  await page.goto('/broman-os/index.html#pocock-steers-with-skills-kun-builds-machinery'); // the demo opens the card of the note in the hash
  const drawer = page.locator('#drawer');
  await expect(drawer).toBeVisible();
  await drawer.getByRole('tab', { name: 'Related' }).click();
  await drawer.locator('.rel button', { hasText: 'Second-brain notes' }).click();
  await expect(drawer.locator('h2.t')).toHaveText('Second-brain notes');
  await drawer.getByRole('tab', { name: 'Related' }).click();
  const chips = await drawer.locator('.rel button').evaluateAll((bs) => bs.map((b) => ({ h: b.getBoundingClientRect().height, title: b.title, text: b.textContent })));
  expect(chips.length, 'the room lists its notes').toBeGreaterThan(5);
  for (const c of chips) {
    expect(c.h, `${c.text} is one line`).toBeLessThanOrEqual(28);
    expect(c.title, 'full text in title').toBe(c.text);
  }
  expect(await drawer.locator('.stt').evaluate((e) => getComputedStyle(e).borderTopWidth), 'status is a dot and text, not a box').toBe('0px');
  await expect(drawer).toHaveScreenshot('wiki-notes-related.png');
});

test('one dropdown under the name holds Look, Map, Layout, View and Help; the floating map buttons are gone; m still toggles motion', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('brain-motion', 'on'));
  await page.goto('/broman-os/index.html');
  const map = page.locator('#brainHost');
  await expect(map.locator('canvas')).toBeVisible();
  // the buttons that used to float over the map are hidden; the ask chips are too
  for (const id of ['#motionBtn', '#sideBtn', '#menuBtn', '#legendBtn']) await expect(map.locator(id)).toBeHidden();
  await expect(page.locator('#askBar')).toBeHidden();
  const drop = page.locator('#tbDrop');
  await expect(drop).toHaveAttribute('aria-expanded', 'false');
  await drop.click();
  const sheet = page.locator('#tbSheet');
  await expect(sheet.locator('h3')).toHaveText(['Look', 'Map', 'Layout', 'View', 'Help']);
  await expect(sheet.locator('.tb-sec').first().locator('.tb-item')).toHaveText(['HUD', 'Matrix', 'Calm']);
  // Look: the skin changes and the sheet stays open
  await sheet.getByRole('button', { name: 'Calm', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.dataset.skin)).toBe('calm');
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'HUD', exact: true }).click();
  // Map: Motion flips and says so
  const motion = sheet.getByRole('button', { name: 'Motion', exact: true });
  await expect(motion).toHaveAttribute('aria-pressed', 'true');
  await motion.click();
  await expect(sheet.getByRole('button', { name: 'Motion', exact: true })).toHaveAttribute('aria-pressed', 'false');
  // View: hide the page card, then show it again
  await sheet.getByRole('button', { name: 'Hide page' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('#pageov')).toBeHidden();
  await drop.click();
  await page.locator('#tbSheet').getByRole('button', { name: 'Show page' }).click();
  await expect(page.locator('#pageov')).toBeVisible();
  // Escape closes it; the m key flips motion back on without the sheet
  await drop.click();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await page.keyboard.press('m');
  await drop.click();
  await expect(page.locator('#tbSheet').getByRole('button', { name: 'Motion', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('the factory page tour and the map cards show the idea, not the internal tool names', async ({ request }) => {
  const terms = /backpass|no-mistakes|herdr|treehouse|lavish|worktree|launchd|\bnix\b/i;
  const tour = JSON.parse(await (await request.get('/broman-os/tour/tour.json')).text());
  const bad = [];
  (function walk(o, key) {
    if (typeof o === 'string') { if (!['id', 'next'].includes(key) && terms.test(o)) bad.push(o.slice(0, 60)); }
    else if (Array.isArray(o)) o.forEach((x) => walk(x, key));
    else if (o) Object.entries(o).forEach(([k, v]) => walk(v, k));
  })(tour, '');
  expect(bad, 'tour strings').toEqual([]);
  const data = await (await request.get('/broman-os/brain/brain-data.json')).text();
  // the room parts are our own words; the wiki notes quote their sources and keep a tool name where the source does
  const fm = JSON.parse(data).rooms.find((r) => r.id === 'fm');
  const prose = JSON.stringify(fm, (k, v) => (['rel', 'id', 'links'].includes(k) ? undefined : v)); // ids and links point at notes by name
  expect(prose.match(terms), 'FirstMate room').toBeNull();
});

test('left tree: reading order, rooms > folders > files and pages; the empty Skills pane is not drawn', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/broman-os/index.html');
  const map = page.locator('#brainHost');
  await expect(map.locator('canvas')).toBeVisible();
  if (await map.locator('#side').evaluate((e) => e.hidden)) { // the widgets start open on a wide screen, closed on a phone
    await page.locator('#tbDrop').click();
    await page.locator('#tbSheet').getByRole('button', { name: 'Widgets', exact: true }).click();
  }
  await expect(map.getByRole('tab')).toHaveCount(0);
  await expect(map.locator('#wr')).toHaveCount(0);
  await expect(map.getByRole('tree')).toBeVisible();
  const top = await map.locator('#tree > li').evaluateAll((l) => l.map((e) => e.getAttribute('aria-label')));
  expect(top).toEqual(['Read in order', 'Rooms', 'Pages and projects']);
  // the tree holds what brain-data.json holds: every room, each room's folders, each folder's named files
  const data = JSON.parse(readFileSync(join(root, 'broman-os/brain/brain-data.json'), 'utf8'));
  const rooms = await map.locator('#tree li[aria-level="2"][data-k^="r:"]').evaluateAll((l) => l.map((e) => e.getAttribute('aria-label')));
  expect(rooms).toEqual(data.rooms.map((r) => r.label));
  const giants = data.rooms.findIndex((r) => r.id === 'giants');
  const folders = await map.locator(`#tree li[data-k^="f:${giants}:"]`).evaluateAll((l) => l.map((e) => e.getAttribute('aria-label')));
  expect(folders).toEqual(data.rooms[giants].folders.map((f) => f.name));
  expect(await map.locator(`#tree li[data-k="r:${giants}"] li[aria-level="4"]`).count()).toBe(data.rooms[giants].folders.reduce((n, f) => n + f.files.length, 0));
});

test('left tree and map stay in step: a pick in either one shows in the tree, the map and the card', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/broman-os/index.html');
  const map = page.locator('#brainHost');
  await expect(map.locator('canvas')).toBeVisible();
  if (await map.locator('#side').evaluate((e) => e.hidden)) {
    await page.locator('#tbDrop').click();
    await page.locator('#tbSheet').getByRole('button', { name: 'Widgets', exact: true }).click();
  }
  const data = JSON.parse(readFileSync(join(root, 'broman-os/brain/brain-data.json'), 'utf8'));
  const giants = data.rooms.findIndex((r) => r.id === 'giants'), g = data.rooms[giants];
  const card = page.locator('#drawer h2.t'), trail = map.locator('#trail');
  const lit = () => page.evaluate(() => window.AIOMap.state().lit.length);
  const row = (key) => map.locator(`#tree li[data-k="${key}"]`);
  // map -> tree: a real click on a project's hexagon marks its row under "Pages and projects"
  await clickNode(page, 'reels4mphotos');
  await expect(card).toHaveText('reels4mphotos');
  await expect(map.locator('#tree [aria-current="location"]')).toHaveAttribute('aria-label', 'reels4mphotos');
  await expect(trail).toContainText('Pages and projects');
  // tree -> map and card: a room, then its first folder, then its first file
  await row(`r:${giants}`).locator('> .tr').click();
  await expect(card).toHaveText('Shoulders of giants');
  await expect(row(`r:${giants}`)).toHaveAttribute('aria-current', 'location');
  await expect(row(`r:${giants}`)).toHaveAttribute('aria-expanded', 'true');
  expect(await lit(), 'the room lights its files, itself and the router file').toBe(g.folders.reduce((n, f) => n + f.count, 0) + 2);
  await row(`f:${giants}:0`).locator('> .tr').click();
  await expect(card).toHaveText(g.folders[0].name);
  await expect(trail).toContainText(g.folders[0].name);
  expect(await lit(), 'a folder lights only its own files').toBe(g.folders[0].count + 2);
  await row(`f:${giants}:0`).locator('li[aria-level="4"]').first().locator('> .tr').click();
  await expect(card).toHaveText(g.folders[0].files[0].n);
  await expect(map.locator('#tree [aria-current="location"]')).toHaveCount(1);
  await expect(trail).toContainText(g.folders[0].files[0].n);
  // keyboard: the focus stays on the row after Enter, and the arrows keep moving
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(card).toHaveText(g.folders[0].files[1].n);
  await page.keyboard.press('ArrowLeft'); // up to the folder
  await expect(map.locator(`#tree li[data-k="f:${giants}:0"]:focus`)).toHaveCount(1);
  // the card's Related button moves the tree too
  await row(`r:${giants}`).locator('> .tr').click();
  await page.locator('#drawer .tab', { hasText: 'Related' }).click();
  await page.locator('#drawer .rel button').nth(1).click(); // the first related file
  await expect(map.locator('#tree [aria-current="location"]')).toHaveAttribute('data-k', /^n:/);
  // closing the card clears the selection everywhere
  await page.locator('#drawer .dh .btn').click();
  await expect(map.locator('#tree [aria-current="location"]')).toHaveCount(0);
  expect(await lit()).toBe(0);
});

test('tree filter: typing narrows the tree to the matches and their parents; Esc clears it; the arrows and Enter reach a match', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/broman-os/index.html');
  const map = page.locator('#brainHost');
  await expect(map.locator('canvas')).toBeVisible();
  if (await map.locator('#side').evaluate((e) => e.hidden)) {
    await page.locator('#tbDrop').click();
    await page.locator('#tbSheet').getByRole('button', { name: 'Widgets', exact: true }).click();
  }
  const data = JSON.parse(readFileSync(join(root, 'broman-os/brain/brain-data.json'), 'utf8'));
  const shown = () => map.locator('#tree li:not([hidden])').evaluateAll((l) => l.filter((e) => !e.parentElement.closest('ul[hidden],li[hidden]')).map((e) => e.getAttribute('aria-label')));
  const all = (await shown()).length;
  const box = map.locator('#tq'), count = map.locator('#tcount');
  await box.fill('ICM');
  // a match opens its parents, and nothing that does not match stays
  const found = await shown();
  const wanted = data.rooms.flatMap((r) => r.folders.flatMap((f) => f.files)).filter((n) => n.n.toLowerCase().includes('icm')).map((n) => n.n);
  expect(wanted.length).toBeGreaterThan(2);
  for (const n of wanted) expect(found, `${n} stays`).toContain(n);
  expect(found).not.toContain('Blog');
  expect(found.length).toBeLessThan(all / 2);
  await expect(count).toContainText('matches');
  await expect(map.locator('#q')).toHaveValue('ICM'); // one query for the tree and the map's search box, as it was typed
  expect(await page.evaluate(() => window.AIOMap.state().lit.length), 'the map lights the matches too, not only the page you are on').toBeGreaterThan(wanted.length);
  // a room that matches keeps its folders and files
  await box.fill('shoulders');
  const giants = await shown();
  expect(giants).toContain('Shoulders of giants');
  expect(giants).toContain(data.rooms.find((r) => r.id === 'giants').folders[0].files[0].n);
  // nothing found says so
  await box.fill('zzzzqq');
  await expect(count).toContainText('No match');
  expect(await shown()).toEqual([]);
  // keyboard: the arrow goes into the tree, Enter picks the first match
  await box.fill('ladder');
  await box.press('Enter');
  await expect(map.locator('#tree li:focus')).toHaveAttribute('aria-label', /layer ladder/i);
  await page.keyboard.press('Enter');
  await expect(page.locator('#drawer h2.t')).toContainText(/layer ladder/i);
  // the first Esc clears the filter and leaves the card and the pick; the whole tree is back
  await box.focus();
  await box.press('Escape');
  await expect(box).toHaveValue('');
  await expect(count).toHaveText('');
  await expect(page.locator('#drawer h2.t')).toContainText(/layer ladder/i);
  expect((await shown()).length).toBeGreaterThanOrEqual(all);
  await expect(map.locator('#tree [aria-current="location"]')).toHaveAttribute('aria-label', /layer ladder/i);
});

test('map links: a note opens rendered in the card, never as a raw .md file; a link inside the site stays in the site; a room has a deep link', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const data = JSON.parse(readFileSync(join(root, 'broman-os/brain/brain-data.json'), 'utf8'));
  const giant = data.rooms.find((r) => r.id === 'giants').folders[0].files[0]; // a giant: "The idea" (their page) and "How we use it" (a note of ours)
  const note = giant.links.find((l) => l.label === 'How we use it').href;
  expect(note).toMatch(/^notes\/.+\.md$/);
  await page.goto(`/broman-os/index.html#${giant.id}`);
  const card = page.locator('#drawer h2.t');
  await expect(card).toHaveText(giant.n);
  await expect(page.locator('#pageov')).toHaveClass(/min/); // a node link leaves the page card folded
  await page.locator('#drawer .tabs button', { hasText: 'Links' }).click();
  // the idea is another site: new tab. Nothing of this site opens in a new tab.
  await expect(page.locator('#drawer .lnk a', { hasText: 'The idea' })).toHaveAttribute('target', '_blank');
  await page.locator('#drawer .lnk button', { hasText: 'How we use it' }).click();
  await expect(page.locator('#drawer .dh .pos')).toHaveText('Note');
  await expect(card).toHaveText(/./);
  await expect(page.locator('#drawer .art strong', { hasText: 'Claim:' })).toBeVisible();
  expect(page.url(), 'the page did not navigate to the raw file').not.toMatch(/\.md/);
  await page.locator('#drawer .df .btn', { hasText: 'Show on the map' }).click();
  await expect(page.locator('#drawer .dh .pos')).not.toHaveText('Note');
  // every note link in the data is read through the reader: no raw .md anchor is drawn for a note of this site
  const notes = await page.evaluate(() => [...document.querySelectorAll('#drawer a[href$=".md"]')].filter((a) => a.origin === location.origin).length);
  expect(notes).toBe(0);
  // a link into this site's own page (Areas card: "All pages") has no new-tab arrow
  await page.goto('/broman-os/index.html#area-harness');
  await page.locator('#drawer .tabs button', { hasText: 'Links' }).click();
  await expect(page.locator('#drawer .lnk a', { hasText: 'All pages' })).not.toHaveAttribute('target', '_blank');
  // the notes room links to other people's maps only: no build script or allow-list (the what, never the how)
  await page.goto('/broman-os/index.html#notes');
  await page.locator('#drawer .tabs button', { hasText: 'Links' }).click();
  await expect(page.locator('#drawer .lnk a, #drawer .lnk button', { hasText: /Build script|Approved list/ })).toHaveCount(0);
  // a room opens from its own deep link
  await page.goto('/broman-os/index.html#giants');
  await expect(card).toHaveText('Shoulders of giants');
  await page.locator('#drawer ul button.fl', { hasText: 'Builders' }).click();
  await expect(card).toHaveText('Builders');
});

// ---- the map: Hex and Folders by default, overlays that float, and one skin over everything ----
test('map: Hex with Folders is the default; the notes sit apart and the page badges one badge width outside them', async ({ page }) => {
  await page.goto('/');
  await mapState(page);
  await expect.poll(() => page.evaluate(() => window.AIOMap.metrics().pitch), 'the layout has settled').toBeGreaterThan(0);
  const m = await page.evaluate(() => window.AIOMap.metrics());
  expect(m.layout).toBe('hex');
  expect(m.view).toBe('folders');
  await expect(page.locator('#brainHost').locator('#views [data-v="folders"]')).toHaveAttribute('aria-pressed', 'true');
  expect(m.pitch, 'two notes are at least two dot widths apart').toBeGreaterThan(20);
  expect(m.gap, 'a page badge sits about one badge width from the nearest note').toBeGreaterThan(0.5 * m.badge);
  expect(m.gap).toBeLessThan(2 * m.badge);
});

test('map: the controls float over a full-width map, close with their button and with Esc, and are a bottom sheet on a phone', async ({ page }) => {
  await page.goto('/');
  await mapState(page);
  const phone = test.info().project.name === 'mobile-390';
  const vp = page.viewportSize();
  const map = page.locator('#brainHost');
  const canvas = map.locator('canvas');
  const panel = map.locator('#panel');
  const width = async () => (await canvas.boundingBox()).width;
  expect(await width(), 'the map has the whole viewport').toBe(vp.width);
  await expect(panel).toBeHidden();
  await page.getByRole('button', { name: 'Show the page' }).click(); // the landing starts with the card folded; the controls sit beside it once it is open
  const open = async () => {
    await page.locator('#tbDrop').click();
    await page.locator('#tbSheet').getByRole('button', { name: 'All settings' }).click();
    await expect(panel).toBeVisible();
  };
  await open();
  expect(await width(), 'opening the controls takes no width from the map').toBe(vp.width);
  const box = await panel.boundingBox();
  if (phone) {
    expect(box.x, 'a sheet from the left edge').toBe(0);
    expect(box.width, 'the full width').toBe(vp.width);
    expect(Math.round(box.y + box.height), 'resting on the bottom edge').toBe(vp.height);
    await expect(page.locator('#pageov'), 'the page card steps aside').toHaveClass(/min/);
  } else {
    expect(box.x + box.width, 'inside the viewport').toBeLessThanOrEqual(vp.width);
    expect(box.x + box.width, 'beside the page card, not under it').toBeLessThanOrEqual((await page.locator('#pageov').boundingBox()).x);
  }
  await page.keyboard.press('Escape');
  await expect(panel, 'Esc closes it').toBeHidden();
  await expect(page.locator('#tbDrop'), 'focus returns to what opened it').toBeFocused();
  await open();
  await panel.getByRole('button', { name: 'Close the controls' }).click();
  await expect(panel, 'the close button closes it').toBeHidden();
  expect(await width()).toBe(vp.width);
});

test('Calm covers the map: a light canvas, light lists and panels, and text at 4.5:1; HUD stays dark', async ({ page }) => {
  const lum = (rgb) => {
    const f = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const skin of ['hud', 'calm']) {
    await page.addInitScript((s) => localStorage.setItem('skin', s), skin);
    await page.goto('about:blank');
    await page.goto('/');
    await mapState(page);
    await expect.poll(() => page.evaluate(() => { // the canvas repaints in the skin a frame or two after load
      const cv = window.AIOMap.root.querySelector('canvas'), d = cv.getContext('2d').getImageData(cv.width - 4, cv.height - 4, 1, 1).data;
      return d[0] + d[1] + d[2] > 384;
    })).toBe(skin === 'calm');
    const got = await page.evaluate(() => {
      const root = window.AIOMap.root, cv = root.querySelector('canvas');
      const px = cv.getContext('2d').getImageData(cv.width - 4, cv.height - 4, 1, 1).data; // a corner: bare map ground
      const rgb = (el, prop) => getComputedStyle(el)[prop].match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
      const text = (sel) => { const e = root.querySelector(sel); return { ink: rgb(e, 'color'), bg: rgb(e.closest('aside, div#legend') || e, 'backgroundColor') }; };
      return { canvas: [px[0], px[1], px[2]], list: text('#wl .lk'), panel: text('#panel h3'), btn: text('#panel .btn') };
    });
    const light = (rgb) => lum(rgb) > 0.5;
    expect(light(got.canvas), `${skin}: canvas ground`).toBe(skin === 'calm');
    expect(light(got.list.bg), `${skin}: left list`).toBe(skin === 'calm');
    if (skin === 'calm') {
      expect(ratio(got.list.ink, got.list.bg), 'list text').toBeGreaterThanOrEqual(4.5);
      expect(ratio(got.btn.ink, [255, 255, 255]), 'button text on paper').toBeGreaterThanOrEqual(4.5);
      // every colour the canvas writes text in, on the ground it is drawn on
      const t = await page.evaluate(() => window.AIOMap.textColours());
      const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      for (const c of t.text) expect(ratio(rgb(c), rgb(t.bg)), `map text ${c} on ${t.bg}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('the skin button names the skin that is on', async ({ page }) => {
  await page.goto('/cv.html');
  const btn = page.locator('#theme');
  await expect(btn).toHaveText('HUD');
  await btn.click();
  await expect(btn).toHaveText('Matrix');
  await expect(btn).toHaveAttribute('aria-label', /Switch to the Calm colours/);
  await btn.click();
  await expect(btn).toHaveText('Calm');
  await btn.click();
  await expect(btn).toHaveText('HUD');
});

test('a malformed #hash on the map page does not break the page or the map', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/broman-os/index.html#%E0%A4%A');
  await expect(page.locator('.pov-line')).toHaveCount(1);
  await expect(page.locator('svg').first()).toBeVisible();
  expect(errors).toEqual([]);
});
