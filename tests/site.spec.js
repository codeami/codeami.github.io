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

    await expect(page).toHaveScreenshot(`${file.replace(/\//g, '__')}.png`, {
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

test('no "Field Notes" label is left in published files, and no brand name is added', () => {
  const text = new Set(['.html', '.js', '.css', '.json', '.md', '.py']);
  const skip = new Set(['node_modules', 'test-results', 'playwright-report', 'tests']);
  const hits = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || skip.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (text.has(extname(e.name))) {
        readFileSync(p, 'utf8').split('\n').forEach((l, i) => /Field Notes|ThoughtSignal/i.test(l) && hits.push(`${relative(root, p).split(sep).join('/')}:${i + 1}`));
      }
    }
  })(root);
  expect(hits).toEqual([]);
});

test('Chart Room chat holds the story and tour branches', () => {
  const t = JSON.parse(readFileSync(join(root, 'ai-life-os/tour/tour.json'), 'utf8')).chat;
  const folders = new Set(t.nodes.map((n) => n.folder));
  expect(folders.has('story') && folders.has('tour')).toBe(true);
  const ids = new Set(t.nodes.map((n) => n.id));
  for (const n of t.nodes) for (const x of n.next) expect(ids.has(x), `${n.id} -> ${x}`).toBe(true);
});
