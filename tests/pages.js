// Finds every HTML page in the repo, so new pages are covered without editing a list.
// Build templates (files holding %%PLACEHOLDERS%%, e.g. maps/_shared/shell.html) are not pages.
const { readdirSync, readFileSync } = require('node:fs');
const { join, relative, sep } = require('node:path');

const root = join(__dirname, '..');
const skip = new Set(['node_modules', 'test-results', 'playwright-report']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || skip.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(relative(root, p).split(sep).join('/'));
  }
  return out;
}

const all = walk(root).sort();
const isTemplate = (f) => /%%[A-Z]+%%/.test(readFileSync(join(root, f), 'utf8'));

module.exports = { root, pages: all.filter((f) => !isTemplate(f)), templates: all.filter(isTemplate) };
