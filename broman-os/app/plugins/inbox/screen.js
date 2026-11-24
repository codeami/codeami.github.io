// inbox: what came in from the feeds and creators, who covers what, and the lists behind it. The baked part is read-only data from the
// last build. The live part (Add feed, Find feeds, Podcasts, Social, Compact) talks to the local API that `node serve.mjs` mounts on
// this computer only; opened any other way those controls say so and nothing else changes.

// Side-by-side compaction: word-level compare of the source and the compacted text. Pure, so a test can run it without a page.
// Source words that did not survive are wrapped in .cut, compacted words that are not in the source in .add.
BromanOS.inbox = (function () {
  const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const tokens = function (s) { return String(s).replace(/\r\n?/g, '\n').match(/\n|[^\s]+/g) || []; };
  const key = function (t) { return t === '\n' ? '' : t.toLowerCase().replace(/[^a-z0-9À-￿]/g, ''); };
  // which tokens of a and b are in a longest common subsequence of their word keys (line breaks and bare punctuation always stay)
  const lcs = function (a, b) {
    const ka = a.map(key), kb = b.map(key), n = ka.length, m = kb.length, keepA = ka.map(function () { return false; }), keepB = kb.map(function () { return false; });
    if (n * m > 4000000) {   // very long texts: fall back to "is the word anywhere in the other text"
      const inB = {}, inA = {}; kb.forEach(function (k) { inB[k] = 1; }); ka.forEach(function (k) { inA[k] = 1; });
      return { a: ka.map(function (k) { return !k || !!inB[k]; }), b: kb.map(function (k) { return !k || !!inA[k]; }) };
    }
    const w = m + 1, t = new Uint16Array((n + 1) * w);
    let i, j;
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) t[i * w + j] = ka[i] && ka[i] === kb[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    i = 0; j = 0;
    while (i < n && j < m) {
      if (ka[i] && ka[i] === kb[j]) { keepA[i] = true; keepB[j] = true; i++; j++; } else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) i++; else j++;
    }
    return { a: ka.map(function (k, x) { return !k || keepA[x]; }), b: kb.map(function (k, x) { return !k || keepB[x]; }) };
  };
  const paint = function (toks, kept, cls) {
    let out = '', run = '';
    const flush = function () { if (run) { out += '<span class="' + cls + '">' + esc(run.trim()) + '</span> '; run = ''; } };
    toks.forEach(function (t, i) {
      if (t === '\n') { flush(); out = out.replace(/ $/, '') + '<br>'; } else if (kept[i]) { flush(); out += esc(t) + ' '; } else run += t + ' ';
    });
    flush();
    return out.trim();
  };
  // -> { left, right, cut, added } : html for the two panes, and how many words were cut / are new
  const compare = function (source, compacted) {
    const a = tokens(source), b = tokens(compacted), k = lcs(a, b), count = function (kept) { return kept.filter(function (x) { return !x; }).length; };
    return { left: paint(a, k.a, 'cut'), right: paint(b, k.b, 'add'), cut: count(k.a), added: count(k.b) };
  };
  return { compare: compare, esc: esc };
})();

BromanOS.screens['inbox/stream'] = function (el, data, h) {
  const e = h.esc, PAGE = 20, S = (data.stream || []).slice(), feeds = data.feeds || [], creators = data.creators || [], lanes = data.lanes || {};
  let LIVE = [];
  const state = { kind: 'all', q: '', shown: PAGE };
  let API = null;   // { levels, feeds } once the local API answers; null when the page is not served by serve.mjs
  const SEARCH = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>';
  const TYPES = { rss: 'RSS', atom: 'Atom', podcast: 'Podcast', youtube: 'YouTube', 'instagram-profile': 'Instagram profile', 'instagram-post': 'Instagram post', 'papers-hf': 'Papers: Hugging Face', 'papers-arxiv': 'Papers: arXiv', 'papers-alphaxiv': 'Papers: alphaXiv' };
  const NEEDS = 'This needs the local server. On this Mac run: node serve.mjs full, then open the local address it prints (a tailnet address cannot add or change feeds).';
  const initials = function (s) { const w = String(s).replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w.length > 1 ? w[1][0] : (w[0] || '')[1] || '')).toUpperCase(); };
  const site = function (u) { return String(u).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''); };
  const call = function (method, path, body) {
    return fetch(path, { method: method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.json().catch(function () { return { error: 'The server sent something unreadable.' }; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j; });
    });
  };

  // everything that can open in the compaction view is registered here: { title, text, url }
  const SRC = [];
  const reg = function (title, text, url) { return SRC.push({ title: title, text: text, url: url }) - 1; };
  S.forEach(function (i) { i.k = reg(i.title, i.title + (i.summary ? '\n\n' + i.summary : ''), i.url); });
  const allItems = function () { return S.concat(LIVE).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }); };
  const READER = !!data.reader;   // a news reader: no local API, so no Compact, Add feed or Find feeds; items can be saved instead
  const compactBtn = function (k) { return READER ? '<button class="btn btn-q in-act" type="button" data-save="' + k + '">Save</button>' : '<button class="btn btn-q in-act" type="button" data-compact="' + k + '">Compact</button>'; };

  const chip = function (hl) {
    if (!hl) return '<span class="chip is-paused">' + (READER ? 'sample' : 'not fetched yet') + '</span>';
    if (hl.error) return '<span class="chip is-failed">' + e(hl.error) + '</span>';
    return '<span class="chip is-done">' + (hl.http ? 'HTTP ' + hl.http : 'OK') + '</span>';
  };
  const item = function (i) {
    return '<article class="feed-item' + (i.watch ? ' is-watch' : '') + '"><div class="src">' + e(initials(i.source)) + '</div><div>' +
      '<h4>' + (i.url ? '<a href="' + h.href(i.url) + '" target="_blank" rel="noopener">' + e(i.title) + '</a>' : e(i.title)) + '</h4>' + (i.summary ? '<p>' + e(i.summary) + '</p>' : '') +
      '<div class="meta"><span class="mono">' + e(i.source) + '</span><span class="mono">' + e(h.day(i.date)) + '</span>' + (i.views ? '<span class="mono">' + e(i.views) + ' views</span>' : '') +
      '<span class="tag">' + (i.kind === 'creator' ? 'creator' : 'feed') + '</span>' + (i.watch ? '<span class="tag">watch list</span>' : '') + (i.saved ? '<span class="tag">yours</span>' : '') + (READER && i.saved ? '' : compactBtn(i.k)) + '</div></div></article>';
  };
  const laneRow = function (title, l, what) {
    if (!l) return '';
    const bad = l.failed ? '<span class="chip is-failed">' + l.failed + ' failed</span>' : l.unknown ? '<span class="chip is-paused">' + l.unknown + ' not fetched</span>' : '<span class="chip is-done">OK</span>';
    return '<div class="row"><div class="body"><div class="title">' + e(title) + '</div><div class="sub">' + l.ok + ' of ' + l.total + ' ' + what + ' fetched · ' + l.items + ' items' + (l.newest ? ' · newest ' + e(h.day(l.newest)) : '') + '</div></div>' + bad + '</div>';
  };
  const failed = feeds.concat(creators).filter(function (x) { return x.health && x.health.error; }).map(function (x) {
    return '<div class="row"><div class="body"><div class="title">' + e(x.name) + '</div><div class="sub">' + e(x.health.error) + '</div></div></div>';
  }).join('');
  const listRow = function (x, isC) {
    const hl = x.health, sub = isC ? [x.handle, x.videos + ' videos', hl && hl.newest ? 'newest ' + h.day(hl.newest) : '', x.note] : [site(x.url), hl && hl.newest ? 'newest ' + h.day(hl.newest) : '', hl && !hl.error ? hl.kept + ' kept of ' + hl.fetched : ''];
    return '<div class="row"><div class="lead">' + e(initials(x.name)) + '</div><div class="body"><div class="title">' + e(x.name) + '</div><div class="sub">' + e(sub.filter(Boolean).join(' · ')) + '</div></div><div class="trail">' + chip(hl) + '</div></div>';
  };
  const listPanel = function (id, list, isC) {
    return '<div data-panel="' + id + '" hidden>' + (isC ? '' : '<section class="card" data-mine></section>') + '<section><p class="note">' + (isC ? 'Public YouTube channel feeds, one fetch per channel. No logins.' : 'RSS and Atom feeds. Each run reports whether the feed answered.') + '</p>' +
      '<div class="card is-flush rows in-list">' + (list.length ? list.map(function (x) { return listRow(x, isC); }).join('') : h.empty('No ' + (isC ? 'creators' : 'feeds') + ' yet', 'The list was empty when this was built.')) + '</div></section></div>';
  };
  const topics = data.topics || [];
  const topicCard = function (t) {
    return '<article class="feed-item in-topic" data-topic="' + e(t.id) + '"><div class="src">' + e(initials(t.title)) + '</div><div><h4>' + e(t.title) + '</h4><p>' + e(t.about) + '</p>' +
      '<div class="meta"><span class="mono">' + e(t.names.join(', ')) + '</span></div><div class="meta"><span class="mono">' + e(t.source) + '</span><span class="tag">topic</span></div></div></article>';
  };

  const tabs = READER ? [['read', 'Read'], ['feeds', 'Sources ' + feeds.length], ['saved', 'Saved ' + (BromanOS.store ? BromanOS.store.used('inbox-items') : 0)]]
    : [['read', 'Read'], ['papers', 'Papers'], ['podcasts', 'Podcasts'], ['social', 'Social'], ['creators', 'Creators ' + creators.length], ['feeds', 'Feeds ' + feeds.length], ['topics', 'Topics ' + topics.length]];
  el.innerHTML = '<div class="page-head"><div><h1>Inbox</h1><p>' + (READER ? 'A news reader with a few public sources, and the things you keep.' : 'What came in from your feeds and creators, who covers what, and the lists behind it.') + '</p></div>' +
    (READER ? '<div class="acts"><span class="chip is-needs">SAMPLE ITEMS</span></div>'
      : '<div class="acts"><button class="btn" type="button" data-open="add">Add feed</button><button class="btn btn-2" type="button" data-open="find">Find feeds</button><span class="chip is-done">real data</span></div>') + '</div>' +
    '<div class="tabs" role="tablist">' + tabs.map(function (t, i) { return '<button class="tab" type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (i === 0) + '">' + e(t[1]) + '</button>'; }).join('') + '</div>' +
    '<section class="card in-compact" data-compact-box hidden aria-live="polite"></section>' +
    '<div data-panel="add" hidden><section class="card"><div class="card-head"><h3>Add feed</h3><span class="mono more">checked before it is saved</span></div>' +
      '<p class="note">Paste an RSS or Atom link, a podcast feed, a YouTube channel, or a public Instagram profile, post or reel. It is fetched and checked first; nothing is saved until you say so.</p>' +
      '<form class="bar" data-addform><label class="field"><input name="url" type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://… feed, channel or Instagram link" aria-label="Feed address"></label><button class="btn" type="submit">Check</button></form>' +
      '<div data-addout aria-live="polite"></div></section></div>' +
    '<div data-panel="find" hidden><section class="card"><div class="card-head"><h3>Find feeds</h3><span class="mono more">podcasts from Apple, plus a starter list</span></div>' +
      '<div class="bar"><label class="field">' + SEARCH + '<input name="fq" data-findq autocomplete="off" placeholder="Search podcasts and topics: sleep, index funds, agents…" aria-label="Search for feeds"></label></div>' +
      '<div data-findout aria-live="polite"></div></section></div>' +
    '<div class="in-read" data-panel="read"><section><div class="bar"><div class="seg" role="group" aria-label="Show">' +
      [['all', 'All'], ['feed', 'Feeds'], ['creator', 'Creators']].map(function (k) { return '<button class="btn btn-2" type="button" data-kind="' + k[0] + '" aria-pressed="' + (k[0] === 'all') + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      '<label class="field">' + SEARCH + '<input name="q" data-search placeholder="Search the stream" aria-label="Search the stream"></label></div>' +
      '<div class="card is-flush" data-stream></div><div class="more-row"><span class="mono" data-count></span><button class="btn btn-2" type="button" data-more>Show more</button></div>' +
      '<p class="source"><b>Source:</b> the frontier AI feed lane and the creator lane, as of the last fetch, plus the feeds you added here. Newest first.</p></section>' +
      (READER ? '' : '<aside><section class="card"><div class="card-head"><h3>Lane health</h3></div><div class="rows">' + laneRow('Frontier AI feeds', lanes.feeds, 'sources') + laneRow('Creators', lanes.creators, 'channels') + failed + '</div>' +
      '<p class="source"><b>Source:</b> each lane\'s health file from its last fetch. Built ' + e(data.built || '') + '.</p></section></aside>') + '</div>' +
    '<div data-panel="saved" hidden><section><div class="card is-flush" data-saved></div><p class="source"><b>Source:</b> items you saved from Read, and emails from the guided run. Kept on this computer.</p></section></div>' +
    '<div data-panel="papers" hidden><div data-papers>' + h.empty('Loading papers…', 'Reading the paper sources you subscribed to.') + '</div></div>' +
    '<div data-panel="podcasts" hidden><div data-podcasts>' + h.empty('Loading podcasts…', 'Reading the feeds you added.') + '</div></div>' +
    '<div data-panel="social" hidden><div data-social>' + h.empty('Loading…', 'Reading the posts you captured.') + '</div></div>' +
    listPanel('creators', creators, true) + listPanel('feeds', feeds, false) +
    '<div data-panel="topics" hidden><section><div class="card is-flush" data-topics>' + (topics.length ? topics.map(topicCard).join('') : h.empty('No topics yet', 'Nothing was added to the topic list when this was built.')) + '</div>' +
    '<p class="source"><b>Source:</b> the topic list kept with this page, each card with the source and date it came in.</p></section></div>';

  const q = function (s) { return el.querySelector(s); }, qa = function (s) { return Array.prototype.slice.call(el.querySelectorAll(s)); };
  const show = function (id) {
    qa('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', String(x.getAttribute('data-tab') === id)); });
    qa('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== id; });
    if (id === 'papers' && API && !PP.started) { PP.started = true; autoPrepare(); }
  };
  qa('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-tab')); }); });
  qa('[data-open]').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-open')); const i = q('[data-panel="' + b.getAttribute('data-open') + '"] input'); if (i) i.focus(); if (b.getAttribute('data-open') === 'find') find(''); }); });

  const draw = function () {
    const needle = state.q.toLowerCase(), A = allItems();
    const m = A.filter(function (i) { return (state.kind === 'all' || i.kind === state.kind) && (!needle || (i.title + ' ' + i.source + ' ' + i.summary).toLowerCase().indexOf(needle) > -1); });
    q('[data-stream]').innerHTML = m.length ? m.slice(0, state.shown).map(item).join('') : h.empty('Nothing matches', A.length ? 'Clear the search or pick All.' : 'The lanes had no items when this was built.');
    q('[data-count]').textContent = 'Showing ' + Math.min(state.shown, m.length) + ' of ' + m.length;
    q('[data-more]').hidden = m.length <= state.shown;
    q('[data-tab="read"]').textContent = 'Read ' + A.length;
  };
  qa('[data-kind]').forEach(function (b) {
    b.addEventListener('click', function () { state.kind = b.getAttribute('data-kind'); state.shown = PAGE; qa('[data-kind]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); draw(); });
  });
  q('[data-search]').addEventListener('input', function (ev) { state.q = ev.target.value.trim(); state.shown = PAGE; draw(); });
  q('[data-more]').addEventListener('click', function () { state.shown += PAGE; draw(); });

  // ---------- compaction: source on the left, compacted on the right, what was cut marked ----------
  const box = q('[data-compact-box]');
  let cv = { it: null, done: {}, level: '', busy: false, err: '' };
  const paintCompact = function () {
    const it = cv.it, lv = API ? API.levels : [], res = cv.done[cv.level];
    let right;
    const cmp = res ? BromanOS.inbox.compare(it.text, res.text) : null;
    if (!API) right = '<p class="note">' + e(NEEDS) + '</p>';
    else if (cv.busy) right = '<p class="note">Compacting with Haiku…</p>';
    else if (cv.err) right = '<p><span class="chip is-failed">' + e(cv.err) + '</span></p>';
    else if (cmp) right = '<div class="in-text">' + cmp.right + '</div>';
    else right = '<p class="note">Pick a level above. The result is saved, so asking again is free.</p>';
    box.innerHTML = '<div class="card-head"><h3>Compact: ' + e(it.title) + '</h3><button class="btn btn-q" type="button" data-compact-close>Close</button></div>' +
      '<div class="seg in-levels" role="group" aria-label="Compaction level">' + lv.map(function (l) { return '<button class="btn btn-2" type="button" data-level="' + e(l.id) + '" title="' + e(l.hint) + '" aria-pressed="' + (l.id === cv.level) + '">' + e(l.label) + '</button>'; }).join('') + '</div>' +
      '<div class="in-sbs"><div><div class="in-pane-head"><b>Source</b><span class="mono">' + it.text.split(/\s+/).length + ' words' + (cmp ? ' · ' + cmp.cut + ' cut' : '') + '</span></div><div class="in-text" data-src>' + (cmp ? cmp.left : e(it.text).replace(/\n/g, '<br>')) + '</div></div>' +
      '<div><div class="in-pane-head"><b>' + e(cv.level ? (lv.filter(function (l) { return l.id === cv.level; })[0] || {}).label : 'Compacted') + '</b><span class="mono">' + (res ? res.text.split(/\s+/).length + ' words · ' + (res.cached ? 'from cache' : 'just generated') : '') + '</span></div>' + right + '</div></div>' +
      '<p class="source"><span class="cut">Struck</span> = in the source but cut. <span class="add">Highlighted</span> = new wording not in the source. Compacted with Haiku; the source text is the feed\'s own.' + (it.url ? ' <a href="' + h.href(it.url) + '" target="_blank" rel="noopener">Open the source</a>.' : '') + '</p>';
  };
  const pick = function (level) {
    const it = cv.it;
    cv.level = level; cv.err = '';
    if (cv.done[level]) return paintCompact();
    cv.busy = true; paintCompact();
    call('POST', '/api/compact', { text: it.text, level: level }).then(function (r) { if (cv.it === it) cv.done[level] = r; }, function (err) { if (cv.it === it) cv.err = err.message; })
      .then(function () { if (cv.it === it && cv.level === level) { cv.busy = false; paintCompact(); } });
  };
  // a level given (the five buttons on a paper card) opens the view and runs that level at once
  const openCompact = function (k, level) {
    cv = { it: SRC[k], done: {}, level: '', busy: false, err: '' };
    paintCompact(); box.hidden = false; box.scrollIntoView({ block: 'start' });
    if (level && API) pick(level);
  };
  el.addEventListener('click', function (ev) {
    const t = ev.target.closest ? ev.target.closest('[data-compact],[data-level],[data-compact-close]') : null;
    if (!t || !el.contains(t)) return;
    if (t.hasAttribute('data-compact')) return openCompact(+t.getAttribute('data-compact'), t.getAttribute('data-preset') || '');
    if (t.hasAttribute('data-compact-close')) { box.hidden = true; return; }
    pick(t.getAttribute('data-level'));
  });

  // ---------- Add feed ----------
  const addOut = q('[data-addout]');
  let pending = null;
  const feedCard = function (c, saved) {
    return '<div class="in-check"><div class="row"><div class="lead">' + e(initials(c.title)) + '</div><div class="body"><div class="title">' + e(c.title) + '</div><div class="sub">' + e(site(c.feedUrl || c.url)) + '</div>' +
      (c.last ? '<div class="sub">Latest: ' + e(c.last.title) + (c.last.date ? ' · ' + e(h.day(c.last.date)) : '') + '</div>' : '') + (c.note ? '<div class="sub">' + e(c.note) + '</div>' : '') + '</div>' +
      '<div class="trail"><span class="chip is-working">' + e(TYPES[c.type] || c.type) + '</span></div></div>' +
      (saved ? '' : '<div class="bar"><button class="btn" type="button" data-save>Save feed</button><button class="btn btn-q" type="button" data-discard>Not this one</button></div>') + '</div>';
  };
  const say = function (node, ok, text) { node.innerHTML = '<p><span class="chip ' + (ok ? 'is-done' : 'is-failed') + '">' + e(text) + '</span></p>'; };
  q('[data-addform]').addEventListener('submit', function (ev) {
    ev.preventDefault();
    const url = ev.target.url.value.trim();
    if (!url) return say(addOut, false, 'Paste an address first.');
    if (!API) return say(addOut, false, NEEDS);
    addOut.innerHTML = '<p class="note">Checking…</p>'; pending = null;
    call('POST', '/api/feeds/check', { url: url }).then(function (c) { pending = c; addOut.innerHTML = feedCard(c, false); }, function (err) { say(addOut, false, err.message); });
  });
  addOut.addEventListener('click', function (ev) {
    const t = ev.target.closest ? ev.target.closest('[data-save],[data-discard]') : null;
    if (!t) return;
    if (t.hasAttribute('data-discard')) { pending = null; addOut.innerHTML = ''; return; }
    if (!pending) return;
    t.disabled = true;
    call('POST', '/api/feeds', { url: pending.url }).then(function (r) {
      addOut.innerHTML = feedCard(r.feed, true) + '<p><span class="chip is-done">Saved</span></p>'; pending = null; q('[data-addform]').url.value = '';
      if (r.feed.type === 'instagram-post') capture(r.feed.url, addOut);
      return live();
    }, function (err) { t.disabled = false; say(addOut, false, err.message); });
  });

  // ---------- Find feeds ----------
  const findOut = q('[data-findout]'), findQ = q('[data-findq]');
  let findTimer = null, findSeq = 0;
  const findRow = function (name, sub, url, saved, art, idx) {
    return '<div class="row">' + (art ? '<img class="in-art" src="' + h.href(art) + '" alt="" width="40" height="40" loading="lazy">' : '<div class="lead">' + e(initials(name)) + '</div>') + '<div class="body"><div class="title">' + e(name) + '</div><div class="sub">' + e(sub) + '</div></div>' +
      '<div class="trail">' + (saved ? '<span class="chip is-done">Subscribed</span>' : '<button class="btn btn-2" type="button" data-sub="' + e(url) + '" data-row="' + idx + '">Subscribe</button>') + '</div></div>';
  };
  const find = function (term) {
    if (!API) { findOut.innerHTML = '<p class="note">' + e(NEEDS) + '</p>'; return; }
    const seq = ++findSeq;
    call('GET', '/api/search?q=' + encodeURIComponent(term)).then(function (r) {
      if (seq !== findSeq) return;
      let html = '', idx = 0;
      const cats = [];
      r.curated.forEach(function (s) { if (cats.indexOf(s.category) < 0) cats.push(s.category); });
      if (r.podcasts.length) html += '<h4 class="in-group">Podcasts matching "' + e(term) + '"</h4><div class="rows">' + r.podcasts.map(function (p) { return findRow(p.name, [p.artist, p.genre].filter(Boolean).join(' · '), p.feedUrl, p.saved, p.art, idx++); }).join('') + '</div>';
      else if (r.podcastError) html += '<p><span class="chip is-failed">' + e(r.podcastError) + '</span></p>';
      else if (term.trim().length >= 2) html += '<p class="note">No podcasts found for "' + e(term) + '".</p>';
      cats.forEach(function (c) {
        html += '<h4 class="in-group">' + e(c) + (term ? '' : ' · starter list') + '</h4><div class="rows">' + r.curated.filter(function (s) { return s.category === c; }).map(function (s) { return findRow(s.name, s.why, s.url, s.saved, '', idx++); }).join('') + '</div>';
      });
      if (!cats.length && !r.podcasts.length && !r.podcastError && term.trim().length < 2) html = '<p class="note">Type at least two letters.</p>';
      findOut.innerHTML = html;
    }, function (err) { if (seq === findSeq) say(findOut, false, err.message); });
  };
  findQ.addEventListener('input', function () { clearTimeout(findTimer); findTimer = setTimeout(function () { find(findQ.value.trim()); }, 350); });
  findOut.addEventListener('click', function (ev) {
    const t = ev.target.closest ? ev.target.closest('[data-sub]') : null;
    if (!t) return;
    t.disabled = true; t.textContent = 'Checking…';
    call('POST', '/api/feeds', { url: t.getAttribute('data-sub') }).then(function () { t.parentNode.innerHTML = '<span class="chip is-done">Subscribed</span>'; return live(); },
      function (err) { t.disabled = false; t.textContent = 'Subscribe'; t.parentNode.insertAdjacentHTML('beforeend', '<span class="chip is-failed">' + e(err.message) + '</span>'); });
  });

  // ---------- live data: your feeds, podcasts, social ----------
  const mine = function (list) {
    const node = q('[data-mine]');
    node.innerHTML = '<div class="card-head"><h3>Your feeds</h3><span class="mono more">' + list.length + ' saved in ~/.config/broman-os/feeds.json</span></div>' +
      (list.length ? '<div class="rows">' + list.map(function (f) {
        return '<div class="row"><div class="lead">' + e(initials(f.title)) + '</div><div class="body"><div class="title">' + e(f.title) + '</div><div class="sub">' + e(site(f.feedUrl || f.url)) + (f.last ? ' · latest: ' + e(f.last.title) : '') + (f.error ? ' · ' + e(f.error) : '') + '</div></div>' +
          '<div class="trail"><span class="chip ' + (f.error ? 'is-failed' : 'is-working') + '">' + e(f.error ? 'not answering' : TYPES[f.type] || f.type) + '</span><button class="btn btn-q" type="button" data-remove="' + e(f.id) + '">Remove</button></div></div>';
      }).join('') + '</div>' : '<p class="note">None yet. Use Add feed or Find feeds.</p>');
  };
  const podcasts = function (list) {
    q('[data-podcasts]').innerHTML = list.length ? list.map(function (p) {
      return '<section class="card in-pod"><div class="card-head"><h3>' + e(p.feed.title) + '</h3><span class="mono more">Top 5 to listen to</span></div>' + (p.error ? '<p><span class="chip is-failed">' + e(p.error) + '</span></p>' : '') +
        '<ol class="in-eps">' + p.episodes.map(function (ep) {
          const k = reg(ep.title, ep.title + '\n\n' + ep.text, ep.url);
          return '<li><div class="in-ep-head"><a href="' + h.href(ep.url) + '" target="_blank" rel="noopener">' + e(ep.title) + '</a><span class="mono">' + e(h.day(ep.date)) + (ep.duration ? ' · ' + e(ep.duration) : '') + '</span></div>' +
            (ep.ideas.length ? '<ul class="in-ideas">' + ep.ideas.map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ul>' : '<p class="note">No usable show notes for this episode.</p>') + compactBtn(k) + '</li>';
        }).join('') + '</ol><p class="source"><b>Source:</b> the latest five episodes in the feed. The three ideas are lines picked from each episode\'s show notes, not from the audio.</p></section>';
    }).join('') : h.empty('No podcast feeds yet', API ? 'Add a podcast feed or find one in Find feeds; its latest five episodes show up here.' : NEEDS);
  };
  const socialCard = function (s) {
    const cap = s.capture, k = cap ? reg(s.feed.title, cap.caption, s.feed.url) : -1;
    if (s.profile) return '<article class="card in-ig"><div class="card-head"><h3>' + e(s.feed.title) + '</h3><span class="chip is-paused">profile</span></div><p class="note">Instagram shows a profile\'s posts only to logged-in users, and this app never logs in. Add single posts or reels from it with Add feed.</p><p><a href="' + h.href(s.feed.url) + '" target="_blank" rel="noopener">' + e(site(s.feed.url)) + '</a></p></article>';
    return '<article class="card in-ig"><div class="card-head"><h3>' + e(s.feed.title) + '</h3><span class="chip ' + (cap ? 'is-done' : 'is-paused') + '">' + (cap ? 'captured' : 'not captured') + '</span></div>' +
      (cap ? '<div class="in-ig-body"><img class="in-shot" src="' + e(cap.image) + '" alt="Contact sheet of twelve frames from the reel" loading="lazy"><div><div class="in-pane-head"><b>Caption, as captured</b><span class="mono">' + e(h.day(cap.capturedAt)) + '</span></div><pre class="in-caption">' + e(cap.caption) + '</pre></div></div>' +
        '<div class="meta"><a href="' + h.href(s.feed.url) + '" target="_blank" rel="noopener">' + e(site(s.feed.url)) + '</a>' + compactBtn(k) + '</div>'
        : '<p class="note">' + (s.feed.last ? 'Saved caption preview: ' + e(s.feed.last.title) : '') + '</p><div class="bar"><button class="btn" type="button" data-capture="' + e(s.feed.url) + '">Capture screenshot and caption</button></div><div data-capout aria-live="polite"></div>') + '</article>';
  };
  const social = function (list) {
    q('[data-social]').innerHTML = (list.length ? list.map(socialCard).join('') : h.empty('No Instagram posts yet', API ? 'Add a public post or reel link with Add feed. The page keeps a screenshot-style thumbnail and the exact caption.' : NEEDS)) +
      '<p class="source"><b>Source:</b> public posts only, captured without logging in. Files stay in ~/Documents/content-studio/reels, not in the app.</p>';
  };
  const capture = function (url, out, force) {
    out.insertAdjacentHTML('beforeend', '<p class="note" data-capnote>Capturing: this downloads the public video and cuts a contact sheet, about a minute…</p>');
    return call('POST', '/api/capture', { url: url, force: !!force }).then(function () { const n = out.querySelector('[data-capnote]'); if (n) n.remove(); return live(); },
      function (err) { const n = out.querySelector('[data-capnote]'); if (n) n.outerHTML = '<p><span class="chip is-failed">' + e(err.message) + '</span></p>'; });
  };
  el.addEventListener('click', function (ev) {
    const t = ev.target.closest ? ev.target.closest('[data-capture],[data-remove]') : null;
    if (!t) return;
    if (t.hasAttribute('data-remove')) { t.disabled = true; call('POST', '/api/feeds/remove', { id: t.getAttribute('data-remove') }).then(live, function (err) { t.disabled = false; t.insertAdjacentHTML('afterend', '<span class="chip is-failed">' + e(err.message) + '</span>'); }); return; }
    t.disabled = true; capture(t.getAttribute('data-capture'), t.closest('.card').querySelector('[data-capout]') || t.parentNode).then(function () { t.disabled = false; });
  });
  // ---------- papers: a card per paper, built on this Mac (thumbnail, key figure, insight) and cached ----------
  const PP = { list: [], sources: [], available: [], shown: 10, started: false, busy: {} }, AUTO = 5;
  const authorsLine = function (a) { return a.length > 4 ? a.slice(0, 4).join(', ') + ' +' + (a.length - 4) + ' more' : a.join(', '); };
  const signals = function (p) {
    const c = [];
    if (p.hf) c.push('<span class="chip is-working" title="Hugging Face Daily Papers">▲ ' + p.hf.upvotes + ' on Hugging Face</span>' + (p.hf.comments ? '<span class="chip is-paused">' + p.hf.comments + ' comments</span>' : ''));
    if (p.alphaxiv) c.push('<span class="chip is-done" title="alphaXiv trending list">alphaXiv trending #' + p.alphaxiv.rank + '</span>');
    if (p.arxiv) c.push('<span class="chip is-paused">new on arXiv</span>');
    return c.join('');
  };
  const claim = function (c) { return c.ok ? '<li>' + e(c.text) + '</li>' : ''; };
  const insightHtml = function (p) {
    const i = p.insight;
    if (!i) return '';
    const quotes = [i.says].concat(i.matters).filter(function (c) { return c.ok; });
    return '<div class="in-ins"><h4>What it says</h4>' + (i.says.ok ? '<p>' + e(i.says.text) + '</p>' : '<p class="note">The model\'s one-line summary could not be matched to the paper\'s text, so it is left out.</p>') +
      '<h4>Why it matters</h4><ul>' + i.matters.map(claim).join('') + '</ul>' +
      '<h4>Picture it <span class="mono">an analogy, not from the paper</span></h4><p>' + e(i.picture.analogy) + '</p>' + (i.picture.breaks ? '<p><b>Where it breaks:</b> ' + e(i.picture.breaks) + '</p>' : '') +
      '<details class="in-evidence"><summary>Quoted from the paper (' + i.verified.ok + ' of ' + i.verified.of + ' claims found in its ' + e(i.source) + ')</summary><ul>' + quotes.map(function (c) { return '<li>“' + e(c.quote) + '”</li>'; }).join('') + '</ul></details></div>';
  };
  const paperCard = function (p) {
    const k = reg(p.title, p.title + (p.abstract ? '\n\n' + p.abstract : ''), p.absUrl), busy = PP.busy[p.id], levels = API ? API.levels : [], f = p.figure;
    const thumb = p.thumb ? '<a class="in-thumb" href="' + e(p.thumb) + '" target="_blank" rel="noopener" aria-label="Open the first page full size"><img src="' + e(p.thumb) + '" alt="First page of the paper" loading="lazy"></a>'
      : '<div class="in-thumb is-empty"><span class="mono">' + (busy ? 'building…' : 'no page image yet') + '</span></div>';
    const errs = (p.errors || []).map(function (x) { return '<span class="chip is-failed">' + e(x.step + ': ' + x.message) + '</span>'; }).join('');
    const fig = f && f.ok ? '<figure class="in-fig"><a href="' + e(f.url) + '" target="_blank" rel="noopener"><img src="' + e(f.url) + '" alt="Key figure: figure 1, page ' + f.page + '" loading="lazy"></a><figcaption class="mono">Key figure · figure 1, page ' + f.page + ' of the PDF' + (f.caption ? ' · ' + e(f.caption) : '') + '</figcaption></figure>'
      : f ? '<p class="note in-nofig">No key figure: ' + e(f.reason) + '.</p>' : '';
    return '<article class="card in-paper" data-pid="' + e(p.id) + '">' +
      '<div class="in-paper-top">' + thumb + '<div class="in-paper-head"><h3><a href="' + h.href(p.absUrl) + '" target="_blank" rel="noopener">' + e(p.title) + '</a></h3>' +
      '<div class="meta"><span class="mono">' + e(authorsLine(p.authors)) + '</span><span class="mono">' + e(h.day(p.date)) + '</span><span class="mono">arXiv ' + e(p.id) + '</span></div><div class="in-sig">' + signals(p) + '</div></div></div>' +
      (p.insight ? insightHtml(p) : '<div class="in-ins"><h4>Abstract</h4><p>' + e((p.abstract || '').slice(0, 420) + ((p.abstract || '').length > 420 ? '…' : '')) + '</p>' +
        '<div class="bar"><button class="btn" type="button" data-prepare="' + e(p.id) + '"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Building the card…' : 'Make the card') + '</button><span class="note">Downloads the PDF (about a minute the first time).</span></div></div>') +
      errs + fig +
      '<div class="in-compactrow"><span class="mono">Compact the abstract</span><span class="seg">' + levels.map(function (l) { return '<button class="btn btn-2" type="button" data-compact="' + k + '" data-preset="' + e(l.id) + '" title="' + e(l.hint) + '">' + e(l.label) + '</button>'; }).join('') + '</span></div>' +
      '<div class="meta in-links"><a href="' + h.href(p.absUrl) + '" target="_blank" rel="noopener">arXiv</a><a href="' + h.href(p.pdfUrl) + '" target="_blank" rel="noopener">PDF</a>' +
      '<a href="' + h.href(p.alphaxivUrl) + '" target="_blank" rel="noopener">alphaXiv discussion</a>' + (p.code ? '<a href="' + h.href(p.code.url) + '" target="_blank" rel="noopener">Code' + (p.code.stars != null ? ' · ★ ' + p.code.stars : '') + '</a>' : '') + '</div></article>';
  };
  const papersView = function () {
    const node = q('[data-papers]'), src = PP.sources.map(function (s) {
      return '<div class="row"><div class="body"><div class="title">' + e(s.title) + '</div><div class="sub">' + s.count + ' papers' + (s.note ? ' · ' + e(s.note) : '') + '</div></div><div class="trail">' + (s.error ? '<span class="chip is-failed">' + e(s.error) + '</span>' : '<span class="chip is-done">OK</span>') + '</div></div>';
    }).join('');
    const offer = PP.available.filter(function (s) { return !s.saved; }).map(function (s) {
      return '<div class="row"><div class="body"><div class="title">' + e(s.name) + '</div><div class="sub">' + e(s.why) + '</div></div><div class="trail"><button class="btn btn-2" type="button" data-psub="' + e(s.url) + '">Subscribe</button></div></div>';
    }).join('');
    const list = PP.list.slice(0, PP.shown);
    node.innerHTML = (PP.list.length ? list.map(paperCard).join('') + (PP.list.length > PP.shown ? '<div class="more-row"><span class="mono">Showing ' + PP.shown + ' of ' + PP.list.length + '</span><button class="btn btn-2" type="button" data-pmore>Show more</button></div>' : '') :
      h.empty('No papers yet', PP.sources.length ? 'Your paper sources answered with nothing right now.' : 'Subscribe to a paper source below.')) +
      '<section class="card"><div class="card-head"><h3>Paper sources</h3><span class="mono more">saved through the same feeds script</span></div>' + (src ? '<div class="rows">' + src + '</div>' : '') + (offer ? '<div class="rows">' + offer + '</div>' : '') +
      '<p class="source"><b>Source:</b> Hugging Face Daily Papers, arXiv RSS and alphaXiv\'s public trending page, merged by arXiv id. The page image, key figure and explanation are made on this Mac from the paper\'s own PDF and cached; the explanation uses Haiku on the abstract and introduction, and each claim carries a quote that was checked against that text.</p></section>';
    q('[data-tab="papers"]').textContent = 'Papers ' + PP.list.length;
  };
  const loadPapers = function () {
    return call('GET', '/api/papers').then(function (r) { PP.list = r.papers; PP.sources = r.sources; PP.available = r.available; papersView(); }, function (err) { q('[data-papers]').innerHTML = '<p><span class="chip is-failed">' + e(err.message) + '</span></p>'; });
  };
  const prepareCard = function (id) {
    if (PP.busy[id]) return Promise.resolve();
    PP.busy[id] = true; papersView();
    return call('POST', '/api/papers/prepare', { id: id }).then(function (r) { PP.list = PP.list.map(function (p) { return p.id === id ? r : p; }); }, function (err) {
      PP.list = PP.list.map(function (p) { return p.id === id ? Object.assign({}, p, { errors: [{ step: 'card', message: err.message }] }) : p; });
    }).then(function () { delete PP.busy[id]; papersView(); });
  };
  // the first AUTO cards without an insight are built one after another when the tab is first opened; the rest on a click
  const autoPrepare = function () {
    const todo = PP.list.slice(0, AUTO).filter(function (p) { return !p.insight && !(p.errors && p.errors.length); }).map(function (p) { return p.id; });
    return todo.reduce(function (chain, id) { return chain.then(function () { return prepareCard(id); }); }, Promise.resolve());
  };
  el.addEventListener('click', function (ev) {
    const t = ev.target.closest ? ev.target.closest('[data-prepare],[data-pmore],[data-psub]') : null;
    if (!t) return;
    if (t.hasAttribute('data-pmore')) { PP.shown += 10; return papersView(); }
    if (t.hasAttribute('data-prepare')) return prepareCard(t.getAttribute('data-prepare'));
    t.disabled = true; t.textContent = 'Checking…';
    call('POST', '/api/feeds', { url: t.getAttribute('data-psub') }).then(function () { return live().then(loadPapers); }, function (err) { t.disabled = false; t.textContent = 'Subscribe'; t.parentNode.insertAdjacentHTML('beforeend', '<span class="chip is-failed">' + e(err.message) + '</span>'); });
  });

  // reload what the local API knows; the static lists above stay as built
  const live = function () {
    return call('GET', '/api/inbox').then(function (r) {
      LIVE = r.items.map(function (i) { i.k = reg(i.title, i.title + (i.text ? '\n\n' + i.text : ''), i.url); return i; });
      mine(r.feeds); podcasts(r.podcasts); social(r.social); draw();
      q('[data-tab="podcasts"]').textContent = 'Podcasts ' + r.podcasts.length; q('[data-tab="social"]').textContent = 'Social ' + r.social.length;
    }, function (err) { podcasts([]); social([]); q('[data-mine]').innerHTML = '<p><span class="chip is-failed">' + e(err.message) + '</span></p>'; });
  };

  draw();
  if (READER) {   // saved items: the person's own, counted by the usage store; at the limit the limit screen shows instead of one more Save
    const S2 = BromanOS.store;
    const savedView = function () {
      const mine = S2 ? S2.list('items').reverse() : [];
      q('[data-saved]').innerHTML = (S2 && S2.atLimit('inbox-items') && BromanOS.limitCard ? BromanOS.limitCard('inbox-items') : '') +
        (mine.length ? mine.map(function (i) { i.k = reg(i.title, i.title, i.url); return item(i); }).join('') : h.empty('Nothing saved yet', 'Press Save on an item in Read, or finish a guided run.'));
      q('[data-tab="saved"]').textContent = 'Saved ' + (S2 ? S2.used('inbox-items') : 0);
      if (BromanOS.wireConnect) BromanOS.wireConnect(q('[data-saved]'));
    };
    savedView();
    el.addEventListener('click', function (ev) {
      const t = ev.target.closest ? ev.target.closest('[data-save]') : null;
      if (!t || !S2) return;
      const it = S.filter(function (x) { return String(x.k) === t.getAttribute('data-save'); })[0];
      if (it && !S2.add('inbox-items', { kind: it.kind, source: it.source, date: it.date, title: it.title, summary: it.summary || '', url: it.url, saved: true })) show('saved');
      else if (it) t.outerHTML = '<span class="chip is-done">Saved</span>';
      savedView();
    });
  }
  const offline = function () {
    if (READER) return;
    q('[data-mine]').innerHTML = '<div class="card-head"><h3>Your feeds</h3></div><p class="note">' + e(NEEDS) + '</p>';
    podcasts([]); social([]);
    q('[data-papers]').innerHTML = h.empty('Papers need the local server', NEEDS);
  };
  // serve.mjs marks the page when its API is there (and only for a loopback address); any other host is never probed
  if (window.BROMAN_INBOX_API) call('GET', '/api/boot').then(function (b) { API = b; return live().then(loadPapers); }, offline); else offline();
};
