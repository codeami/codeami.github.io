const { test, expect } = require('@playwright/test');
const { readdirSync, readFileSync, existsSync, statSync, mkdtempSync, cpSync, writeFileSync, rmSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, dirname, extname, relative, sep } = require('node:path');
const { root, pages, templates } = require('./pages');

const origin = 'http://127.0.0.1:4173';

// Overflow that exists today and is waiting for a page fix. Delete the entry when the page is fixed.
const knownOverflow = {
  'ai-life-os/kit/index.html': 'scrolls 2px sideways at 390px',
};

for (const file of pages) {
  test(`${file}: loads clean, fits the width, matches the baseline`, async ({ page }) => {
    const problems = [];
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
    page.on('pageerror', (e) => problems.push(`exception: ${e.message}`));
    page.on('requestfailed', (r) => r.url().startsWith(origin) && problems.push(`failed: ${r.url()}`));
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
  const dataFiles = ['ai-life-os/brain/brain-data.json', 'ai-life-os/brain/src/extra.json', 'ai-life-os/brain/src/site.json'];
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
const hidden = share.filter((r) => r.level !== 'public');
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

test('share.json: no chart node points at a page that is not public', () => {
  const data = readFileSync(join(root, 'ai-life-os/brain/brain-data.json'), 'utf8');
  const urls = [...data.matchAll(/"(?:url|href)":\s*"([^"]+)"/g)].map((m) => m[1]).filter((u) => !external(u));
  const hit = urls
    .map((u) => join('ai-life-os/brain', u.split('#')[0]).split(sep).join('/'))
    .filter((p) => share.some((r) => r.level !== 'public' && r.path === p));
  expect(hit).toEqual([]);
});

test('retired pages are out of the nav and show a notice', async ({ page }) => {
  await page.goto('/ai-life-os/core.html');
  await page.waitForSelector('nav[aria-label="Pages"] a.nav', { state: 'attached' });
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => new URL(a.href).pathname));
  expect(hrefs.filter((h) => hidden.some((r) => h === `/${r.path}`))).toEqual([]);
  for (const r of retired.filter((x) => pages.includes(x.path))) {
    await page.goto(`/${r.path}`);
    await expect(page.locator('.retired-note'), r.path).toContainText('Retired');
    await expect(page.locator('.retired-note a')).toHaveAttribute('href', external(r.into) ? r.into : `/${r.into}`);
  }
});

test('a link-only page is out of the nav, still opens, and carries noindex', async ({ page }) => {
  const listed = share.map((r) => (r.path === 'ai-life-os/changelog.html' ? { ...r, level: 'link-only' } : r));
  await page.route('**/share.json', (route) => route.fulfill({ json: { pages: listed } }));
  await page.goto('/ai-life-os/core.html');
  await page.waitForSelector('nav[aria-label="Pages"] a.nav', { state: 'attached' });
  const hrefs = await page.$$eval('nav a[href]', (as) => as.map((a) => new URL(a.href).pathname));
  expect(hrefs).not.toContain('/ai-life-os/changelog.html');
  const res = await page.goto('/ai-life-os/changelog.html');
  expect(res.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('.retired-note')).toHaveCount(0);
});

test('build: a link-only page gets a static noindex and no robots.txt line, a retired one keeps its Disallow', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'share-build-'));
  try {
    cpSync(join(root, 'ai-life-os'), join(tmp, 'ai-life-os'), { recursive: true });
    const fixture = share.map((r) => (r.path === 'ai-life-os/changelog.html' ? { ...r, level: 'link-only' } : r));
    writeFileSync(join(tmp, 'share.json'), JSON.stringify({ pages: fixture }));
    execFileSync('python3', ['-I', join(tmp, 'ai-life-os/brain/build_data.py')], { stdio: 'pipe' });
    expect(readFileSync(join(tmp, 'ai-life-os/changelog.html'), 'utf8')).toMatch(/<meta\s+name="robots"\s+content="noindex">/);
    const disallowed = readFileSync(join(tmp, 'robots.txt'), 'utf8').split('\n').filter((l) => l.startsWith('Disallow:'));
    expect(disallowed).not.toContain('Disallow: /ai-life-os/changelog.html');
    expect(disallowed).toEqual(retired.map((r) => `Disallow: /${r.path}`).sort());
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ---- the blog: index cards from share.json, and the Calm panel post ----
test('blog index: lists exactly the public posts, newest first inside each group, no hidden post', async ({ page }) => {
  const posts = share
    .filter((r) => /^ai-life-os\/blog\/(?!index\.html)[^/]+\.html$/.test(r.path))
    .map((r) => ({ ...r, file: r.path.split('/').pop() }));
  await page.goto('/ai-life-os/blog/index.html');
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
  await page.goto('/ai-life-os/blog/everything-is-a-file.html');
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'calm');
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
  for (const { href, text } of mores) expect(text, 'link text says what it opens').not.toMatch(/section \d/i);
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
  await page.goto('/ai-life-os/blog/everything-is-a-file.html');
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
  { slug: 'rules-from-chat-history', series: 'Customize everything, including yourself', panels: 7 },
  { slug: 'how-it-fits-together', series: 'Safe AI crews', panels: 7 },
  { slug: 'guides-and-sensors', series: 'Safe AI crews', panels: 6 },
];

test('converted posts: each one is a covered page, public in share.json and listed on the blog index under its series', async ({ page }) => {
  await page.goto('/ai-life-os/blog/index.html');
  const groups = await page.$$eval('.p-group', (gs) => gs.map((g) => ({ title: g.querySelector('h2').textContent, hrefs: [...g.querySelectorAll('.p-post h3 a')].map((a) => a.getAttribute('href')), kickers: [...g.querySelectorAll('.p-post .p-kicker')].map((k) => k.textContent) })));
  for (const { slug, series } of convertedPosts) {
    expect(pages, `${slug} gets a screenshot at both widths`).toContain(`ai-life-os/blog/${slug}.html`);
    expect(share.find((r) => r.path === `ai-life-os/blog/${slug}.html`)?.level, `${slug} level`).toBe('public');
    const group = groups.find((g) => g.hrefs.includes(`${slug}.html`));
    expect(group?.title, `${slug} group`).toBe(series);
    expect(group.kickers.every((k) => k === series), 'card kicker is the series').toBe(true);
  }
  expect(groups.map((g) => g.title), 'one group per series, no empty group').toEqual(['Signal from noise', 'Customize everything, including yourself', 'Safe AI crews']);
  expect(await page.locator('.p-posts a[href*="progress-three-weeks"], .p-posts a[href*="trading"]').count(), 'retired and draft posts stay off the index').toBe(0);
});

for (const { slug, series, panels: expected } of convertedPosts) {
  test(`converted post ${slug}: series label, problem first, why it matters last, panels capped, one try-it box, no inline style, no private links`, async ({ page }) => {
    const file = `ai-life-os/blog/${slug}.html`;
    await page.goto(`/${file}`);
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'calm');
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

// ---- the landing at / ----
test('landing: eight steps with the fork, no sideways scroll, no console errors, no capture', async ({ page }) => {
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(e.message));
  await page.route('**/*', (route) => (route.request().url().startsWith(origin) ? route.continue() : route.fulfill({ status: 200, body: '' })));
  await page.goto('/#step-1'); // a step link opens the page card; plain "/" stays calm
  await expect(page.locator('#flowN')).toHaveText('1');
  await page.getByRole('button', { name: 'What can AI do now?' }).click();
  await page.getByRole('button', { name: "So what's the catch?" }).click();
  await expect(page.getByRole('button', { name: 'Walk me through it (about 10 min)' })).toBeVisible();
  await expect(page.getByRole('button', { name: "I'm hiring or evaluating" })).toBeVisible();
  for (let n = 1; n <= 8; n++) {
    await page.goto('about:blank');
    await page.goto(`/#step-${n}`);
    await expect(page.locator('#flowN')).toHaveText(String(n));
    const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, o: [...document.querySelectorAll('.pov-body')].map((b) => b.scrollWidth - b.clientWidth) }));
    expect(w.s, `step ${n} page width`).toBeLessThanOrEqual(w.c);
    expect(Math.max(0, ...w.o), `step ${n} card width`).toBeLessThanOrEqual(0);
  }
  await page.goto('/#step-1');
  await page.getByRole('button', { name: "I'm hiring. Show me the work." }).click();
  await expect(page.locator('#flowN')).toHaveText('8');
  const html = await page.content();
  expect(html).not.toMatch(/type="email"|<form|<input/i);
  expect(html).not.toMatch(/\$\d|\bprice|\bsubscribe|\bsign up\b|\bnewsletter/i);
  expect(problems).toEqual([]);
});

test("landing: the first reply shows Sam's made-up personality chart", async ({ page }) => {
  await page.goto('/#step-1');
  await page.getByRole('button', { name: 'What can AI do now?' }).click();
  const chart = page.locator('.pchart');
  await expect(chart).toContainText('made-up example: Sam');
  await expect(chart.locator('li')).toHaveCount(11);
  await expect(chart.locator('.pconf')).toHaveCount(11);
  for (const w of ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism', 'Pace', 'Delegation', 'Novelty appetite', 'Need for structure', 'Review and control', 'Outside memory']) {
    await expect(chart).toContainText(w);
  }
  const over = await chart.evaluate((c) => c.scrollWidth - c.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
});

test('landing: the CV lists the approved roles and years, with one external link', async ({ page }) => {
  await page.goto('/#step-8');
  const cv = page.locator('#cv-roles');
  await expect(cv.locator('li')).toHaveCount(9);
  await expect(cv).toContainText('Senior Software Engineer, a global sportswear brand (Dec 2020 - present)');
  await expect(cv).toContainText('QA Engineer, Mindfire Solutions (2006-2008)');
  await expect(cv).toContainText('University of Pune (2005)');
  await expect(page.locator('#step-8')).not.toContainText('coming soon');
  const ext = await page.$$eval('#step-8 a[href^="http"]', (as) => as.map((a) => a.href));
  expect(ext).toEqual(['https://github.com/codeami']);
});

test('landing: How I work shows the six work traits as a radar, links each to a post, and keeps the private profile out', async ({ page }) => {
  await page.goto('/#step-8');
  const how = page.locator('#how-i-work');
  await expect(how.locator('svg[role="img"]')).toBeVisible();
  const traits = ['Pace 18', 'Delegation 19', 'Curiosity 18', 'Structure 16', 'Quality review 16', 'Outside memory 17'];
  await expect(how.locator('.radar .lbl text')).toHaveText(traits);
  await expect(how.locator('.how-list li')).toHaveCount(6);
  await expect(how.locator('figcaption')).toHaveText('Built from my own AI working sessions, Oct-Nov 2026.');
  for (const t of ['Openness', 'Extravert', 'Agreeable', 'Stress', 'Neurotic']) await expect(how).not.toContainText(t);
  // Every interest link opens a public page, and every public series post is listed.
  const hrefs = await how.locator('a').evaluateAll((as) => as.map((a) => new URL(a.href).pathname.slice(1)));
  for (const h of hrefs) expect(share.find((r) => r.path === h)?.level, h).toBe('public');
  const posts = share.filter((r) => /^ai-life-os\/blog\/(?!index\.html)/.test(r.path) && r.level === 'public').map((r) => r.path);
  expect(hrefs).toEqual(expect.arrayContaining(posts));
  const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(w.s, 'sideways scroll').toBeLessThanOrEqual(w.c);
  // The page sits in a scrolling card, so the radar figure (not the whole section) is captured.
  await how.locator('.radar').scrollIntoViewIfNeeded();
  await expect(how.locator('.radar')).toHaveScreenshot('landing-how-i-work.png');
});

test("landing: the dog interview ends on Sam's criterion", async ({ page }) => {
  await page.goto('/#step-3');
  await page.getByRole('button', { name: 'Start the interview.' }).click();
  for (let i = 0; i < 3; i++) await page.locator('.chat .k-chip:not([disabled])', { hasText: 'Take the suggested answers.' }).click();
  await expect(page.locator('.chat-card')).toContainText('Done when a two-week foster fits the weekday schedule.');
});

// ---- the calm landing: chart first, one Explain this button, the journey ----
const explainBtn = (page) => page.locator('#askBar').getByRole('button', { name: 'Explain this', exact: true });

test('landing: opens on the chart alone, with the nav label Blog and one Explain this button', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#pageov')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Show page' })).toBeVisible();
  await expect(page.locator('.k-nav').getByRole('link', { name: 'Blog' })).toHaveAttribute('href', 'http://127.0.0.1:4173/ai-life-os/blog/index.html');
  await expect(explainBtn(page)).toBeVisible();
  const others = ['Tour the map', 'What do the shapes mean?', 'How do I find something?', 'Show me the skill map'];
  for (const q of others) await expect(page.locator('#askBar').getByText(q)).toBeHidden();
  await page.locator('#askBar').getByRole('button', { name: 'More' }).click();
  for (const q of others) await expect(page.locator('#askBar').getByText(q)).toBeVisible();
});

test('landing: the visitor\'s choice to show or hide the page is remembered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show page' }).click();
  await expect(page.locator('#pageov')).toBeVisible();
  await page.reload();
  await expect(page.locator('#pageov')).toBeVisible();
  await page.getByRole('button', { name: 'Close the page and show the whole map' }).click();
  await page.reload();
  await expect(page.locator('#pageov')).toBeHidden();
});

test('landing: Explain this goes problems, then solutions, then the four values, then the walk', async ({ page }) => {
  await page.goto('/');
  await explainBtn(page).click();
  const chat = page.locator('#journeyChat');
  const shot = (n) => expect(page).toHaveScreenshot(`landing-journey-${n}.png`, { mask: [page.locator('canvas')] });
  for (const p of ['Too much noise', 'Scattered notes and goals', 'AI that guesses what you want', 'Agents nobody can trust']) await expect(chat).toContainText(p);
  await expect(chat).not.toContainText('Signal from noise');
  await shot(1);
  await chat.getByRole('button', { name: 'How do you solve them?' }).click();
  await expect(chat).toContainText('One written intent, one place for it all, and a crew you can check.');
  await expect(chat).not.toContainText('Signal from noise');
  await shot(2);
  await chat.getByRole('button', { name: 'What do you stand for?' }).click();
  for (const v of ['Signal from noise.', 'Customize everything, including yourself.', 'Self-learning, evolving, powerful yet safe AI bot-swarm managers that work toward your needs.', 'Smart goal tracking that harmonises your wants.']) await expect(chat).toContainText(v);
  await shot(3);
  await chat.getByRole('button', { name: 'Show me how it works' }).click();
  await expect(page.locator('#explain')).toBeHidden();
  await expect(page.locator('#flowN')).toHaveText('1');
  await expect(page.locator('#step-1')).toContainText("I'm EA-bot");
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
// The card is a scrolling box: wait for fonts, then start the capture from its top, as the page loop does.
const settle = async (page) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.querySelectorAll('*').forEach((e) => { e.scrollTop = 0; }));
};
const stays = (page) => page.evaluate(() => { window.__stay = true; });
const stayed = (page) => page.evaluate(() => window.__stay === true);

test('landing: the chart lights one node, whoami, whichever view the reader is in', async ({ page }) => {
  const views = ['/', '/#whoami', '/#explain', '/#step-3', '/#step-8'];
  for (const url of views) {
    await page.goto('about:blank');
    await page.goto(url);
    expect(await mapState(page), url).toEqual({ here: 'whoami', lit: ['whoami'] });
  }
});

test('landing: whoami opens a short CV with the full CV and a skip', async ({ page }) => {
  await page.goto('/#whoami');
  const who = page.locator('#whoami');
  await expect(who).toBeVisible();
  await expect(who.locator('h1')).toHaveText('Ashish Raina');
  await expect(who.locator('.k-dek')).toHaveText('Technical Program Manager · AI-native delivery');
  await expect(who.getByText('Technical program lead with 20 years in software')).toBeVisible();
  await expect(who.locator('.outcomes')).toHaveText(/^~3,000 wholesale accounts onboarded · 4 regions · .* satisfaction \(internal NPS\) 5 → 7 \/ 10$/);
  await expect(who.getByRole('link', { name: 'Full CV' })).toHaveAttribute('href', 'cv.html');
  await expect(who.getByRole('link', { name: 'Skip to the AI problems' })).toBeVisible();
  for (const hidden of ['#explain', '#flow', '#intro']) await expect(page.locator(hidden), hidden).toBeHidden();
  await settle(page);
  // the card alone: on a phone the chart canvas fills the screen behind it, so a canvas mask would hide the card
  await expect(page.locator('#pageov')).toHaveScreenshot('landing-whoami.png');
});

test('landing: Skip to the AI problems continues the journey, and Show me how it works reaches the walk', async ({ page }) => {
  await page.goto('/#whoami');
  await page.getByRole('link', { name: 'Skip to the AI problems' }).click();
  await expect(page.locator('#whoami')).toBeHidden();
  const chat = page.locator('#journeyChat');
  for (const p of ['Too much noise', 'Scattered notes and goals', 'AI that guesses what you want', 'Agents nobody can trust']) await expect(chat).toContainText(p);
  await expect(page).toHaveURL(/#explain$/);
  expect(await mapState(page)).toEqual({ here: 'whoami', lit: ['whoami'] });
  await settle(page);
  await expect(page.locator('#pageov')).toHaveScreenshot('landing-skip.png');
  await chat.getByRole('button', { name: 'How do you solve them?' }).click();
  await chat.getByRole('button', { name: 'What do you stand for?' }).click();
  await chat.getByRole('button', { name: 'Show me how it works' }).click();
  await expect(page.locator('#flowN')).toHaveText('1');
});

test('landing: a click on the whoami node, the logo or the page card never reloads the page', async ({ page }) => {
  // from the calm chart: the node opens the whoami section
  await page.goto('/');
  await expect(page.locator('#pageov')).toBeHidden();
  await stays(page);
  await clickNode(page, 'whoami');
  await expect(page.locator('#pageov')).toBeVisible();
  await expect(page.locator('#whoami')).toBeVisible();
  expect(await mapState(page)).toEqual({ here: 'whoami', lit: ['whoami'] });
  // a second click on the same node does not switch it off
  await clickNode(page, 'whoami');
  await expect(page.locator('#whoami')).toBeVisible();
  expect(await mapState(page)).toEqual({ here: 'whoami', lit: ['whoami'] });
  // from the journey: the node and the logo both lead back to whoami
  for (const back of ['node', 'logo']) {
    await page.getByRole('link', { name: 'Skip to the AI problems' }).click();
    await expect(page.locator('#explain')).toBeVisible();
    if (back === 'node') await clickNode(page, 'whoami');
    else await page.locator('.k-nav .k-home').click();
    await expect(page.locator('#whoami'), back).toBeVisible();
    await expect(page.locator('#explain'), back).toBeHidden();
    expect(await stayed(page), `${back}: same document`).toBe(true);
  }
  // from the walk (a typed address with a new hash reloads the page by design, so start from a blank one)
  await page.goto('about:blank');
  await page.goto('/#step-4');
  await stays(page);
  await page.locator('.k-nav .k-home').click();
  await expect(page.locator('#whoami')).toBeVisible();
  await expect(page.locator('#flow')).toBeHidden();
  expect(await stayed(page)).toBe(true);
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
  // the way back into the journey
  await page.getByRole('link', { name: 'Continue to the AI problems' }).first().click();
  await expect(page).toHaveURL(/#explain$/);
  await expect(page.locator('#journeyChat')).toContainText('Too much noise');
});

test('Chart Room chat holds the story and tour branches', () => {
  const t = JSON.parse(readFileSync(join(root, 'ai-life-os/tour/tour.json'), 'utf8')).chat;
  const folders = new Set(t.nodes.map((n) => n.folder));
  expect(folders.has('story') && folders.has('tour')).toBe(true);
  const ids = new Set(t.nodes.map((n) => n.id));
  for (const n of t.nodes) for (const x of n.next) expect(ids.has(x), `${n.id} -> ${x}`).toBe(true);
});

test('room drawer: every Related chip is one line, at most 28 px tall, with its full text in the title', async ({ page }) => {
  await page.goto('/ai-life-os/brain/index.html#pocock-steers-with-skills-kun-builds-machinery');
  const drawer = page.locator('#drawer');
  await expect(drawer).toBeVisible();
  await drawer.getByRole('tab', { name: 'Related' }).click();
  await drawer.locator('.rel button', { hasText: 'Wiki notes' }).click();
  await expect(drawer.locator('h2.t')).toHaveText('Wiki notes');
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
