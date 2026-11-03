const { test, expect } = require('@playwright/test');
const { readdirSync, readFileSync, existsSync, statSync } = require('node:fs');
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
