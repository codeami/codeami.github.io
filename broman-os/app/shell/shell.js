// shell.js: side nav from the registry, hash routing, theme. Knows no plugin by name: whatever the build put in
// BromanOS.registry is what it shows, and a screen is whatever a plugin script put in BromanOS.screens["<plugin>/<screen>"].
(function () {
  const B = window.BromanOS, R = B.registry, THEME_KEY = 'broman-theme';
  const NAMED = R.name === 'full' || R.display.startsWith('Broman OS');   // a variant whose display name already says Broman OS needs no suffix
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // helpers handed to every screen
  const h = {
    esc: function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); },
    day: function (iso) { const m = /^\d{4}-(\d\d)-(\d\d)/.exec(iso || ''); return m ? (+m[2]) + ' ' + MONTHS[+m[1] - 1] : 'no date'; },
    // only http(s) links reach an href
    href: function (u) { return /^https?:\/\//.test(u || '') ? h.esc(u) : '#'; },
    empty: function (title, text) { return '<div class="empty"><b>' + h.esc(title) + '</b><p>' + h.esc(text) + '</p></div>'; },
  };

  const screens = [];   // flat list: { key, plugin, group, title, icon }
  R.plugins.forEach(function (p) { p.screens.forEach(function (s) { screens.push({ key: p.id + '/' + s.id, group: p.group, title: s.title, icon: s.icon }); }); });
  const groups = [];
  screens.forEach(function (s) { if (groups.indexOf(s.group) < 0) groups.push(s.group); });

  function icon(name) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + h.esc(name) + '"/></svg>'; }
  function theme(t, keep) {
    document.documentElement.setAttribute('data-theme', t);
    if (keep) try { localStorage.setItem(THEME_KEY, t); } catch  { /* blocked storage: the switch still works for this visit */ }
  }
  let saved = 'dark'; try { saved = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch  { /* dark */ }
  theme(saved, false);

  const app = document.getElementById('app');
  app.innerHTML =
    '<aside class="sidenav" aria-label="Sections"><div class="brand"><svg class="mark" aria-hidden="true"><use href="#mark"/></svg>Broman OS' +
    (NAMED ? '' : ' <small>' + h.esc(R.display) + '</small>') + '</div>' +
    groups.map(function (g) {
      return (groups.length > 1 ? '<div class="nav-label">' + h.esc(g) + '</div>' : '') +
        screens.filter(function (s) { return s.group === g; }).map(function (s) {
          return '<a class="nav-item" href="#' + h.esc(s.key) + '" data-key="' + h.esc(s.key) + '">' + icon(s.icon) + h.esc(s.title) + '</a>';
        }).join('');
    }).join('') +
    '<div class="foot"><span class="mono">built ' + h.esc(R.built) + '</span></div></aside>' +
    '<div class="main"><header class="topbar"><div class="crumb" data-crumb></div><div class="spacer"></div>' +
    '<button class="icon-btn" type="button" data-theme-toggle aria-label="Switch theme">' + icon('sun') + '</button></header>' +
    '<main class="page" id="screen" tabindex="-1"></main></div>';

  document.querySelector('[data-theme-toggle]').addEventListener('click', function () {
    theme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  });

  function route() {
    const key = decodeURIComponent(location.hash.replace(/^#/, '')) || screens[0].key;
    const s = screens.filter(function (x) { return x.key === key; })[0];
    const old = document.getElementById('screen');
    const el = old.cloneNode(false);   // a fresh element per screen: click handlers of the screen before must not stay on it
    old.parentNode.replaceChild(el, old);
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (a) {
      if (s && a.getAttribute('data-key') === s.key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.querySelector('[data-crumb]').innerHTML = s ? h.esc(s.title) + ' <span class="variant">/ ' + h.esc(R.display) + '</span>' : 'Not found';
    document.title = (s ? s.title + ' · ' : '') + (NAMED ? R.display.replace(/^Full$/, 'Broman OS') : 'Broman OS · ' + R.display);
    el.innerHTML = '';
    if (!s) { el.innerHTML = h.empty('Not part of this app', 'This page is not in this build. Pick something from the menu.'); return; }
    const render = B.screens[s.key];
    if (typeof render !== 'function') { el.innerHTML = h.empty('This screen did not load', 'Its script is missing from the build.'); return; }
    try { render(el, B.data[s.key.split('/')[0]] || {}, h); } catch (err) { el.innerHTML = h.empty('This screen failed', String(err && err.message || err)); }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
