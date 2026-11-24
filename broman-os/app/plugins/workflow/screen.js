// workflow: a workflow drawn as cards on a dotted grid, with edges, a detail drawer and a step replay.
// Read-only. The page holds no rule logic: it looks the winning rule up in data.table (computed at build time from rules.json)
// and never writes. Rules change only through edit-rules.mjs; the computer-use grant comes from the permissions file at build time.
BromanOS.screens['workflow/canvas'] = function (el, data, h) {
  const e = h.esc, wfs = data.workflows || [];
  const head = function (sub) { return '<div class="page-head"><div><h1>Workflows</h1><p>' + e(sub) + '</p></div></div>'; };
  if (!wfs.length) { el.innerHTML = head('Workflows drawn as cards.') + h.empty('No workflows yet', 'When a workflow file is added to this build, it shows here.'); return; }

  const NARROW = 720;                                                   // below this width the cards stack in two columns
  const S = { w: 0, step: 0, sel: null, narrow: false, job: 'shop', cu: false, ex: false };
  let wf, at, byId, rulesStep, root, cv, grid, drawer;

  function setWorkflow(i) {
    S.w = i; wf = wfs[i]; at = {}; byId = {};
    wf.steps.forEach(function (s, k) { (s.nodes || []).forEach(function (id) { at[id] = k; }); });
    wf.nodes.forEach(function (n) { byId[n.id] = n; });
    S.step = wf.steps.length - 1; S.sel = null;
    S.job = wf.try.job; S.cu = wf.try.computerUse; S.ex = wf.try.extraEngines;
    // from the step where the rules node and every tool a rule can pick are on the canvas, the rules can be tried
    rulesStep = wf.rules.length ? Math.max.apply(null, [at[wf.rulesOn]].concat(wf.rules.map(function (r) { return at[r.use]; }))) : -1;
  }

  const ico = function (path) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + e(path) + '"/></svg>'; };
  const readyChip = function (r) { return r ? '<span class="chip ' + (r === 'live' ? 'is-done' : r === 'prototype' ? 'is-proto' : 'is-idea') + '">' + e(r) + '</span>' : ''; };
  const actsChip = function (a) { return a && data.acts[a] ? '<span class="chip is-acts-' + e(a) + '" data-acts="' + e(a) + '">' + e(data.acts[a].label) + '</span>' : ''; };
  const STATUS = { connected: ['is-done', 'connected'], 'not-configured': ['is-paused', 'not configured'], error: ['is-failed', 'error'] };
  const statusChip = function (s) { const c = STATUS[s] || STATUS.error; return '<span class="chip ' + c[0] + '" data-status="' + e(s) + '">' + c[1] + '</span>'; };
  const children = function (id) { return wf.nodes.filter(function (n) { return n.parent === id; }); };
  const verdict = function () { return wf.table[S.job + '|' + (S.cu ? 1 : 0) + '|' + (S.ex ? 1 : 0)]; };

  // ---------- the canvas ----------
  function cardHTML(n, st, tool, fresh) {
    const empty = n.empty && st < n.empty.before;
    const title = empty ? n.empty.title : n.title;
    const sub = empty ? n.empty.sub : n.subLater && st >= n.subLater.step ? n.subLater.text : n.sub;
    const kind = empty ? 'empty' : n.kind;
    let foot = '';
    if (!empty) {
      foot = readyChip(n.ready) + actsChip(n.acts) + (n.connection ? statusChip(n.connection.status) : '');
      if (tool) foot += tool === 'on' ? '<span class="chip is-working">used now</span>' : '<span class="chip">not used now</span>';
      if (n.kind === 'person') foot += '<span class="chip">you</span>';
      if (n.kind === 'reference') foot += '<span class="chip is-ref">reference</span>';
      if (n.kind === 'decision') foot += '<span class="chip is-needs">needs you</span>';
    }
    return '<button type="button" class="wf-node k-' + kind + (n.phone === 'half' ? ' half' : '') + (fresh ? ' is-new' : '') + (tool ? ' is-' + tool : '') + '" data-id="' + e(n.id) + '"' +
      ' style="--c:' + n.at[0] + ';--r:' + n.at[1] + '" aria-pressed="' + (S.sel === n.id) + '" aria-label="' + e(title + '. ' + (sub || '')) + '">' +
      ico(empty ? data.icons[n.empty.icon] : data.icons[n.icon]) + '<b>' + e(title) + '</b><small>' + e(sub || '') + '</small><span class="foot">' + foot + '</span></button>';
  }

  // which tool the Scout would use now, as a state per tool card (only once the rules can be tried)
  function toolStates() {
    const out = {};
    if (!wf.rules.length || S.step < rulesStep) return out;
    const v = verdict();
    wf.rules.forEach(function (r) { out[r.use] = out[r.use] || 'off'; });
    out[v.tool] = 'on';
    return out;
  }

  function paint() {
    const st = S.step, cur = wf.steps[st], states = toolStates();
    const shown = wf.nodes.filter(function (n) { return at[n.id] <= st; });
    root.querySelector('[data-wf-name]').textContent = wf.title;
    root.querySelector('[data-wf-ready]').innerHTML = readyChip(wf.ready) + (wf.proofFound === false ? ' <span class="chip is-usage">proof file not found</span>' : '');
    [].forEach.call(root.querySelectorAll('[data-w]'), function (b) { b.setAttribute('aria-selected', String(+b.dataset.w === S.w)); });
    grid.style.setProperty('--cols', wf.cols || 5);
    root.querySelector('[data-wf-count]').textContent = 'Step ' + (st + 1) + ' of ' + wf.steps.length;
    root.querySelector('[data-wf-back]').disabled = st === 0;
    root.querySelector('[data-wf-next]').disabled = st === wf.steps.length - 1;
    root.querySelector('[data-wf-dots]').innerHTML = wf.steps.map(function (s, i) {
      return '<button class="wf-dot' + (i < st ? ' is-past' : '') + '" type="button" data-step="' + i + '"' + (i === st ? ' aria-current="step"' : '') + ' aria-label="Step ' + (i + 1) + ': ' + e(s.title) + '"><i></i></button>';
    }).join('');
    root.querySelector('[data-wf-caption]').innerHTML = '<h2>' + e(cur.title) + '</h2><p>' + e(cur.text) + '</p><div class="added">' +
      (cur.adds || []).map(function (a) { return '<span class="chip is-working">+ ' + e(a) + '</span>'; }).join('') + '</div>';
    grid.innerHTML = shown.map(function (n) { return cardHTML(n, st, states[n.id], at[n.id] === st || (n.empty && st === n.empty.before)); }).join('');
    root.querySelector('[data-wf-rules]').innerHTML = st >= rulesStep && wf.rules.length ? rulesPanel() : '';
    const last = st === wf.steps.length - 1, pkg = wf.package || {};
    root.querySelector('[data-wf-pkg]').innerHTML = last ? '<div class="wf-pkg"><span class="chip is-idea">Package</span><h3>' + e(wf.title) + '</h3><p class="muted">' + e(wf.summary) + '</p>' +
      '<div class="tags"><span class="tag">' + wf.nodes.filter(function (n) { return n.kind !== 'reference'; }).length + ' cards</span>' +
      (pkg.needs ? '<span class="tag">needs: ' + e(pkg.needs.join(', ')) + '</span>' : '') + '</div>' +
      (pkg.basedOn ? '<div class="tags">' + pkg.basedOn.map(function (b) { return '<span class="tag">based on: ' + e(b) + '</span>'; }).join('') + '</div>' : '') + '</div>' : '';
    const hasResult = wf.nodes.some(function (n) { return n.kind === 'result' && at[n.id] <= st; });
    root.querySelector('[data-wf-sample]').textContent = hasResult && wf.sample ? wf.sample : '';
    drawEdges();
  }

  // ---------- edges ----------
  function drawEdges() {
    const br = cv.getBoundingClientRect(), rects = {}, svg = cv.querySelector('svg.wf-edges'), st = S.step;
    [].forEach.call(grid.querySelectorAll('.wf-node'), function (n) { const r = n.getBoundingClientRect(); rects[n.dataset.id] = { x: r.left - br.left, y: r.top - br.top, w: r.width, h: r.height }; });
    let paths = '', labels = '';
    wf.edges.forEach(function (ed) {
      if (ed.step > st || !rects[ed.from] || !rects[ed.to]) return;
      const a = rects[ed.from], b = rects[ed.to], ovr = ed.type === 'override';
      let g = geom(a, b, ovr ? (ed.t || 0.62) : 0.5);
      if (crossesOther(g, rects, [ed.from, ed.to])) g = bypass(a, b);
      const later = ed.labelLater && st >= ed.labelLater.step ? ed.labelLater : null;
      let lbl = later ? later.text : ed.label;
      if (S.narrow && ed.phoneLabel) lbl = ed.phoneLabel;
      const dx = S.narrow ? 0 : (later ? later.dx : ed.dx) || 0;
      if (Math.abs(a.y - b.y) < 20) lbl = null;                       // side by side: the line is short, a label would cover a card
      paths += '<path class="wf-e ' + ed.type + (ed.step === st ? ' new' : '') + '" data-f="' + e(ed.from) + '" data-t="' + e(ed.to) + '" d="' + g.d + '" marker-end="url(#wf-ah' + (ovr ? 'a' : '') + ')"/>';
      if (lbl) labels += '<span class="wf-elabel' + (ovr ? ' ovr' : '') + '" style="left:' + (+g.mx + dx).toFixed(1) + 'px;top:' + g.my + 'px">' + e(lbl) + '</span>';
    });
    svg.innerHTML = svg.querySelector('defs').outerHTML + paths;
    [].forEach.call(cv.querySelectorAll('.wf-elabel'), function (x) { x.remove(); });
    cv.insertAdjacentHTML('beforeend', labels);
  }
  // a cubic curve; pt(t) is the point a fraction t along it, mx/my the label spot at tm
  function curve(p0, c0, c1, p1, tm) {
    const pt = function (t) { const v = 1 - t; return { x: v * v * v * p0.x + 3 * v * v * t * c0.x + 3 * v * t * t * c1.x + t * t * t * p1.x, y: v * v * v * p0.y + 3 * v * v * t * c0.y + 3 * v * t * t * c1.y + t * t * t * p1.y }; };
    const n = function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }, m = pt(tm);
    return { d: 'M' + n(p0) + ' C' + n(c0) + ' ' + n(c1) + ' ' + n(p1), mx: m.x.toFixed(1), my: m.y.toFixed(1), pt: pt };
  }
  // a smooth curve from the edge of one card to the edge of the next, leaving and arriving straight
  function geom(a, b, tm) {
    const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    let p0, p1, c0, c1, d;
    if (b.y >= a.y + a.h - 6) { p0 = { x: ac.x, y: a.y + a.h }; p1 = { x: bc.x, y: b.y - 3 }; d = Math.max(24, (p1.y - p0.y) / 2); c0 = { x: p0.x, y: p0.y + d }; c1 = { x: p1.x, y: p1.y - d }; }
    else if (a.y >= b.y + b.h - 6) { p0 = { x: ac.x, y: a.y }; p1 = { x: bc.x, y: b.y + b.h + 3 }; d = Math.max(24, (p0.y - p1.y) / 2); c0 = { x: p0.x, y: p0.y - d }; c1 = { x: p1.x, y: p1.y + d }; }
    else if (b.x >= a.x + a.w - 6) { p0 = { x: a.x + a.w, y: ac.y }; p1 = { x: b.x - 3, y: bc.y }; d = Math.max(20, (p1.x - p0.x) / 2); c0 = { x: p0.x + d, y: p0.y }; c1 = { x: p1.x - d, y: p1.y }; }
    else { p0 = { x: a.x, y: ac.y }; p1 = { x: b.x + b.w + 3, y: bc.y }; c0 = { x: p0.x - 30, y: p0.y }; c1 = { x: p1.x + 30, y: p1.y }; }
    return curve(p0, c0, c1, p1, tm);
  }
  // when a straight route would cross another card (the stacked layout), go round the left edge instead
  function crossesOther(g, rects, skip) {
    for (let k = 2; k < 29; k++) {
      const p = g.pt(k / 30);
      for (const id in rects) {
        if (skip.indexOf(id) >= 0) continue;
        const r = rects[id];
        if (p.x > r.x + 2 && p.x < r.x + r.w - 2 && p.y > r.y + 2 && p.y < r.y + r.h - 2) return true;
      }
    }
    return false;
  }
  function bypass(a, b) {
    const p0 = { x: a.x, y: a.y + a.h / 2 }, p1 = { x: b.x - 3, y: b.y + b.h / 2 };
    return curve(p0, { x: a.x - 26, y: p0.y }, { x: b.x - 26, y: p1.y }, p1, 0.5);
  }

  // ---------- rules: the list, and the panel that tries it ----------
  function rulesTable() {
    const hit = verdict().rule;
    return '<table class="wf-rules"><thead><tr><th>Rule</th><th>When → use</th></tr></thead><tbody>' + wf.rules.map(function (r) {
      return '<tr class="' + (r.n === hit ? 'is-hit' : '') + '"><td>' + r.n + (r.n === hit ? ' ✓' : '') + '</td><td><b>When</b> ' + e(r.when.charAt(0).toLowerCase() + r.when.slice(1)) + '.<br><b>Use</b> ' + e(r.useTitle) + '.<br><span class="muted">' + e(r.why) + '</span></td></tr>';
    }).join('') + '</tbody></table>';
  }
  function rulesPanel() {
    const v = verdict(), real = data.grants['computer-use'] === true;
    const opt = function (val, text, sel) { return '<option value="' + val + '"' + (sel ? ' selected' : '') + '>' + text + '</option>'; };
    return '<div class="wf-try"><b>Try the rule</b>' +
      '<label>Job <select data-try="job">' + opt('shop', 'Find the cheapest item in a shop', S.job === 'shop') + opt('read', 'Summarise a paper', S.job === 'read') + '</select></label>' +
      '<label>Computer use <select data-try="cu">' + opt('0', 'Not granted', !S.cu) + opt('1', 'Granted', S.cu) + '</select></label>' +
      '<label><input type="checkbox" data-try="ex"' + (S.ex ? ' checked' : '') + '> Custom instruction: "also check Google and Perplexity"</label>' +
      '<div class="out" data-wf-out>Scout will use: <span>' + e(byId[v.tool].title) + '</span> (rule ' + v.rule + ')</div>' +
      '<p class="note">Trying only changes this panel. Your real setting is <b>' + (real ? 'granted' : 'not granted') + '</b>, read from the permissions file. This page cannot change it, and rules change only through the edit-rules script.</p></div>' +
      '<div class="wf-rulebox"><b>Which search tool? Rules, top to bottom</b><p class="note">When something is true, use this tool. The first rule that matches wins. The last rule always matches.</p>' + rulesTable() + '</div>';
  }

  // ---------- the drawer ----------
  function row(label, html, cls) { return html ? '<div><dt>' + e(label) + '</dt><dd' + (cls ? ' class="' + cls + '"' : '') + '>' + html + '</dd></div>' : ''; }
  function drawerBody(n, st) {
    if (n.empty && st < n.empty.before) return '<dl>' + row('What it is', e(n.empty.text)) + '</dl>';
    const i = n.info, kids = children(n.id);
    let out = '<div>' + (n.ready ? readyChip(n.ready) : '<span class="chip">' + (n.kind === 'reference' ? 'reference' : n.kind) + '</span>') + ' ' + actsChip(n.acts) + ' <span class="chip">' + e(i.en) + '</span></div>';
    if (n.kind === 'reference') return out + '<dl>' + row('What we keep (the pattern)', e(i.keep || i.what)) + row('What we do not copy', 'Their art, words, logo and layout.') + row('Where it lives', e(i.where), 'path') + '</dl>';
    let proof = '';
    if (n.proof) proof = e(n.proof.path) + (n.proof.note ? '<br><span class="muted">' + e(n.proof.note) + '</span>' : '') +
      (n.proofFound === false ? '<br><span class="chip is-usage">proof file not found on the machine that built this</span>' : '');
    out += '<dl>' + row('Who acts', n.acts ? '<b>' + e(data.acts[n.acts].label) + '</b>: ' + e(data.acts[n.acts].text) : '') + row('What it is', e(i.what)) + row('Reads', e(i.reads)) + row('Does', e(i.does)) + row('Who can change it', e(i.who)) + row('Honest status', e(i.honest)) +
      row('Proof it exists', proof, 'path') + row('Inside it', kids.map(function (k) { return e(k.title); }).join(', ')) + '</dl>';
    if (n.kind === 'tool') out += connectionBox(n);
    if (i.compare) out += '<div class="wf-rulebox"><b>Default or override?</b><p class="note">' + e(i.compare) + '</p></div>';
    if (n.id === wf.rulesOn && wf.rules.length) out += '<div class="wf-rulebox"><b>Which search tool? Rules, top to bottom</b><p class="note">When something is true, use this tool. The first rule that matches wins. The last rule always matches.</p>' + rulesTable() + '</div>';
    if (n.kind === 'decision') {
      out += '<div class="wf-dec"><div class="q">' + e(n.decision.question) + '</div><div class="why">' + e(n.decision.why || '') + '</div><div class="options">' +
        n.decision.options.map(function (o) { return '<div class="option"><div><b>' + e(o.title) + '</b><span>' + e(o.text) + '</span></div>' + (o.ours ? '<span class="pick">our pick</span>' : '') + '</div>'; }).join('') +
        '</div><p class="note">A preview of the question. Answers go through Decisions; nothing is sent from this page.</p></div>';
    }
    return out;
  }
  function connectionBox(n) {
    const c = n.connection;
    if (!n.adapter) return '';
    if (!c) return '<div class="wf-rulebox"><b>Connection</b><p class="note">The adapter for this tool is not part of this build, so it cannot run here.</p></div>';
    return '<div class="wf-rulebox" data-wf-connection><b>Connection</b> ' + statusChip(c.status) + '<p class="note"><b>' + e(c.adapter) + '</b> (instance ' + e(c.instance) + '): ' + e(c.label) + '.<br>' + e(c.detail) + '<br>Status is declared in the adapter file; nothing was called to check it.</p></div>';
  }
  function openDrawer(id) {
    const n = byId[id];
    S.sel = id;
    drawer.querySelector('[data-wf-title]').textContent = n.empty && S.step < n.empty.before ? 'The empty box' : n.title;
    drawer.querySelector('[data-wf-body]').innerHTML = drawerBody(n, S.step);
    root.classList.add('drawer-open'); drawer.setAttribute('aria-hidden', 'false');
    markSelected();
    drawer.querySelector('[data-wf-close]').focus();
  }
  function closeDrawer() {
    const id = S.sel;
    S.sel = null; root.classList.remove('drawer-open'); drawer.setAttribute('aria-hidden', 'true');
    markSelected();
    const back = id && grid.querySelector('[data-id="' + id + '"]'); if (back) back.focus();
  }
  function markSelected() { [].forEach.call(grid.querySelectorAll('.wf-node'), function (n) { n.setAttribute('aria-pressed', String(n.dataset.id === S.sel)); }); }
  function refreshDrawer() {                                          // the step or the try panel changed under an open drawer
    if (!S.sel) return;
    const n = byId[S.sel];
    if (at[n.id] > S.step) { closeDrawer(); return; }
    drawer.querySelector('[data-wf-title]').textContent = n.empty && S.step < n.empty.before ? 'The empty box' : n.title;
    drawer.querySelector('[data-wf-body]').innerHTML = drawerBody(n, S.step);
  }

  // the builder's tools, locked: disabled buttons, one plain line, and the optional "connect with Troupe" draft (nothing is sent from the page)
  function builderBar() {
    const b = data.builder; if (!b) return '';
    return '<section class="wf-builder card" data-builder aria-label="Workflow builder, locked"><div class="card-head"><h3><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z"/></svg> ' + e(b.title) + '</h3><span class="chip is-paused">locked</span></div>' +
      '<p class="note">' + e(b.text) + '</p><div class="acts">' + b.tools.map(function (t) { return '<button class="btn btn-2" type="button" disabled aria-disabled="true" data-locked-tool>' + e(t) + '</button>'; }).join('') +
      (BromanOS.connectBox ? '<button class="btn" type="button" data-builder-ask>Ask about unlocking</button>' : '') + '</div><div data-builder-slot></div></section>';
  }
  function wireBuilder() {
    const ask = el.querySelector('[data-builder-ask]'); if (!ask) return;
    ask.addEventListener('click', function () {
      el.querySelector('[data-builder-slot]').innerHTML = '<p class="note">You can <b>optionally</b> connect with Troupe. Nothing is sent from this page. The button opens an email draft in your own mail app, which you can edit, send or close.</p>' + BromanOS.connectBox('', data.builder.topic);
      BromanOS.wireConnect(el);
    });
  }

  // ---------- shell of the page ----------
  function go(i) { S.step = Math.max(0, Math.min(wf.steps.length - 1, i)); paint(); refreshDrawer(); }
  function mount() {
    el.innerHTML = '<div class="wf" data-wf>' +
      '<div class="wf-main">' + head('Workflows drawn as cards: pick a card for its details, step through to see how it was built.') +
      (wfs.length > 1 ? '<div class="tabs" role="tablist" aria-label="Workflows" data-wf-tabs>' + wfs.map(function (w, i) { return '<button class="tab" role="tab" type="button" data-w="' + i + '" aria-selected="' + (i === S.w) + '">' + e(w.title) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="wf-title"><h2 data-wf-name></h2><span data-wf-ready></span></div>' + builderBar() +
      '<div class="wf-stepper"><button class="btn btn-2" type="button" data-wf-back>Back</button><span class="count mono" data-wf-count></span>' +
      '<div class="wf-dots" data-wf-dots role="group" aria-label="Jump to step"></div><button class="btn" type="button" data-wf-next>Next</button></div>' +
      '<div class="wf-caption" aria-live="polite" data-wf-caption></div>' +
      '<div class="wf-cv"><svg class="wf-edges" aria-hidden="true"><defs>' +
      '<marker id="wf-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1l8 4-8 4z" fill="var(--faint)"/></marker>' +
      '<marker id="wf-aha" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1l8 4-8 4z" fill="var(--accent)"/></marker></defs></svg>' +
      '<div class="wf-grid" style="--cols:5"></div></div>' +
      '<div data-wf-rules></div><div data-wf-pkg></div><p class="note" data-wf-sample></p></div>' +
      '<aside class="wf-drawer" aria-label="Details" aria-hidden="true"><div class="dh"><h2 data-wf-title>Details</h2>' +
      '<button class="icon-btn" type="button" data-wf-close aria-label="Close details">✕</button></div><div class="db" data-wf-body></div></aside></div>';
    root = el.querySelector('[data-wf]'); cv = root.querySelector('.wf-cv'); grid = root.querySelector('.wf-grid'); drawer = root.querySelector('.wf-drawer');
    wireBuilder();
  }

  setWorkflow(0);
  mount();
  const fit = function () {                                             // stack the cards when this screen is narrow, whatever the window is
    const narrow = root.clientWidth < NARROW;
    root.classList.toggle('wf-narrow', narrow);
    if (narrow !== S.narrow || !S.fitted) { S.narrow = narrow; S.fitted = true; drawEdges(); }
  };
  fit(); paint();

  root.addEventListener('click', function (ev) {
    const t = ev.target.closest('button, .wf-node'); if (!t) return;
    if (t.matches('[data-wf-next]')) go(S.step + 1);
    else if (t.matches('[data-wf-back]')) go(S.step - 1);
    else if (t.matches('.wf-dot')) go(+t.dataset.step);
    else if (t.matches('[data-wf-close]')) closeDrawer();
    else if (t.matches('.wf-node')) openDrawer(t.dataset.id);
    else if (t.matches('[data-w]')) { if (S.sel) closeDrawer(); setWorkflow(+t.dataset.w); paint(); }
  });
  root.addEventListener('change', function (ev) {
    const k = ev.target.getAttribute('data-try'); if (!k) return;
    if (k === 'job') S.job = ev.target.value; else if (k === 'cu') S.cu = ev.target.value === '1'; else S.ex = ev.target.checked;
    paint(); refreshDrawer();
    const sel = root.querySelector('[data-try="' + k + '"]'); if (sel) sel.focus();   // paint rebuilt the panel; keep the keyboard where it was
  });
  const key = function (ev) {
    if (!document.body.contains(root)) { document.removeEventListener('keydown', key); return; }   // the screen was left
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
    if (ev.key === 'ArrowRight') go(S.step + 1); else if (ev.key === 'ArrowLeft') go(S.step - 1); else if (ev.key === 'Escape' && S.sel) closeDrawer();
  };
  document.addEventListener('keydown', key);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(function () { if (!document.body.contains(root)) { ro.disconnect(); return; } fit(); drawEdges(); });
    ro.observe(root);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (document.body.contains(root)) drawEdges(); });
};
