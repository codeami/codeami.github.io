/*
  flow-anim.js: data-driven workflow canvas for flow-style.css. No dependencies, works from file://.

  The page is a skeleton (see index.html in this folder). All content comes from one JSON document,
  schema "flow-pipeline.v1", inline in <script type="application/json" id="flow-data">. Nothing is fetched.
  FlowAnim.render(data) builds the step content; FlowAnim.init(data) draws the canvas and plays it.

  Two views. Simple is the seven-step spine. Full adds, around the same spine:
    stage "fullOnly": true, "after": "<n of the stage it follows>"   a step on the spine (Twin check, Outcome)
    stage "side": true, "after": "<n>", "workers": [{name, job}]     the orchestrator and its worker branches
    stage "me": "text"                                               a ME chip (Full view; the gate always shows it)
    stage "loop": N                                                  try -> check -> fix, max N turns (Full view)
    stage "options": [{id, label, exec}]                             the outcome picker
  Every stage may carry "kind" (trigger, worker, gate, result, twin, router, outcome), "edge" (the label on the
  arrow that leaves it) and "pillAs" (which of the original seven steps its pills follow).

  Skeleton ids it fills or uses:
    #title #tagline #thought-label #thought-text #pills  header and the travelling item
    #nodes #edge-paths #canvas #now #frame               the canvas: step cards, arrows, caption
    #stages #drawer #drawer-x #board                     detail drawer
    #log #livetag #legend #source #bands                 log, footer, group chips
    #replay #slow #view #theme                           buttons (skin.js owns #theme)

  URL options: ?stage=N shows one stage with no auto-advance; ?slow=1 starts slow; ?view=full starts in Full.
  Self-test hook: FlowAnim.state.stamp holds stage start times in ms.
  Text from the JSON is always inserted with textContent. Only **bold** is parsed.
*/
(function () {
  'use strict';
  const FlowAnim = { state: { stamp: [], ready: false, endAt: 0 } };
  const NS = 'http://www.w3.org/2000/svg';

  function $(id) { return document.getElementById(id); }
  function two(n) { return n < 10 ? '0' + n : '' + n; }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function rich(e, text) { // **bold** and newline only
    String(text).split('\n').forEach(function (line, li) {
      if (li) e.appendChild(document.createElement('br'));
      line.split('**').forEach(function (part, i) {
        if (!part) return;
        if (i % 2) e.appendChild(el('b', '', part)); else e.appendChild(document.createTextNode(part));
      });
    });
    return e;
  }

  /* ---------- render: JSON -> DOM ---------- */
  FlowAnim.render = function (data) {
    FlowAnim._data = data;
    document.title = data.title;
    $('title').textContent = data.title;
    $('tagline').textContent = data.tagline || '';
    $('thought-label').textContent = (data.thought && data.thought.label) || '';
    $('thought-text').textContent = (data.thought && data.thought.text) || '';

    const pills = $('pills');
    ((data.thought && data.thought.pills) || []).forEach(function (p) {
      const e = el('span', 'pill ' + (p.tone || 'cool'), p.label);
      e.setAttribute('data-from', p.from);
      if (p.to != null) e.setAttribute('data-to', p.to);
      pills.appendChild(e);
    });

    const legend = $('legend');
    (data.legend || []).forEach(function (l) { legend.appendChild(el('span', 'pill ' + l.tone, l.label)); });
    $('source').textContent = data.source ? 'Data: ' + data.source : '';

    const host = $('stages');
    const actions = []; // per stage: [{at, fn, reset}]
    data.stages.forEach(function (s, i) {
      const st = el('div', 'stage'); st.setAttribute('data-i', i);
      const acts = []; actions.push(acts);
      const k = { n: 0 };
      const head = el('div', 'head');
      head.appendChild(el('span', 'num', s.side ? 'SIDE LOOP' : 'STAGE ' + s.n));
      head.appendChild(el('h2', '', s.title || s.name));
      if (s.today) head.appendChild(el('span', 'pill today ' + s.today.tone, s.today.label));
      st.appendChild(head);
      st.appendChild(el('p', 'role', s.role || ''));
      (s.blocks || []).forEach(function (b) { st.appendChild(block(b, k, acts)); });
      host.appendChild(st);
    });
    FlowAnim._actions = actions;
  };

  function reveal(e, k) { e.setAttribute('data-k', k.n); e.style.setProperty('--k', k.n); k.n += 1; return e; }

  function block(b, k, acts) {
    let e;
    switch (b.t) {
      case 'cards':
        e = el('div', 'row');
        b.items.forEach(function (it) { e.appendChild(card(it, k)); });
        return e;
      case 'card': return card(b, k);
      case 'row': // a flex row of any blocks
        e = el('div', 'row');
        (b.items || []).forEach(function (c) { e.appendChild(block(c, k, acts)); });
        return e;
      case 'fanout': // factories and thoughts come from data.factories / data.thoughts
        e = el('div', 'fan');
        const TH = FlowAnim._data.thoughts || [];
        (FlowAnim._data.factories || []).forEach(function (f) {
          const hit = TH.filter(function (t) { return (t.to || []).indexOf(f.id) >= 0; });
          const l = el('div', 'lane' + (hit.length ? ' pick' : '')); reveal(l, k);
          l.appendChild(el('div', 't', f.name));
          l.appendChild(el('div', 's', f.sub || ''));
          hit.forEach(function (t) { l.appendChild(el('span', 'pill cool chip', t.short || t.text)); });
          e.appendChild(l);
        });
        return e;
      case 'teams': // one row per (thought, factory) pair; the team is factory.team in the data
        e = el('div', 'teams');
        let r = 0;const FS = FlowAnim._data.factories || [];
        (FlowAnim._data.thoughts || []).forEach(function (t) {
          (t.to || []).forEach(function (fid) {
            const f = FS.filter(function (x) { return x.id === fid; })[0];
            if (!f) return;
            const rowEl = el('div', 'card teamrow'); reveal(rowEl, k);
            const th = el('div', 'th'); th.appendChild(el('b', '', f.name)); th.appendChild(document.createTextNode(' · ' + (t.short || t.text)));
            rowEl.appendChild(th);
            const tw = el('div', 'tw');
            (f.team || []).forEach(function (name, w) {
              const chip = el('span', 'st', '· ' + name);
              function set(s) { chip.textContent = (s === 'running' ? '▶ ' : s === 'done' ? '✓ ' : '· ') + name; chip.className = 'st' + (s === 'running' ? ' run' : s === 'done' ? ' fin' : ''); }
              acts.push({ at: 400 + r * 450 + w * 300, fn: function () { set('running'); }, reset: function () { set('queued'); } });
              acts.push({ at: 1900 + r * 350 + w * 250, fn: function () { set('done'); }, reset: function () { } });
              tw.appendChild(chip);
            });
            rowEl.appendChild(tw); e.appendChild(rowEl); r += 1;
          });
        });
        return e;
      case 'flow':
        e = el('div', '');
        reveal(e, k);
        e.appendChild(el('div', 'flow'));
        const lab = el('div', 'flowlabel', b.label || '');
        if (b.code) { lab.appendChild(document.createTextNode(' ')); lab.appendChild(el('code', '', b.code)); }
        e.appendChild(lab);
        return e;
      case 'split':
        e = el('div', b.ratio === 'wide-left' ? 'gatecard' : 'two');
        ['left', 'right'].forEach(function (side) {
          const col = el('div', 'col');
          (b[side] || []).forEach(function (c) { col.appendChild(block(c, k, acts)); });
          e.appendChild(col);
        });
        return e;
      case 'sortcard':
        e = el('div', 'card thoughtcard'); reveal(e, k);
        e.appendChild(el('div', 't', '“' + b.quote + '”'));
        const f = el('div', ''); reveal(f, k); f.appendChild(el('div', 'flow')); e.appendChild(f);
        const pw = el('div', ''); const pl = el('span', 'pill ' + b.pill.tone, b.pill.label); reveal(pl, k); pw.appendChild(pl); e.appendChild(pw);
        if (b.sub) e.appendChild(el('div', 's', b.sub));
        return e;
      case 'tree':
        e = el('pre', 'tree');
        const root = el('span', ''); reveal(root, k); root.appendChild(el('span', 'k', b.root)); e.appendChild(root);
        b.lines.forEach(function (ln, idx) {
          e.appendChild(document.createTextNode('\n'));
          const row = el('span', ''); reveal(row, k);
          row.appendChild(document.createTextNode((idx === b.lines.length - 1 ? '└─ ' : '├─ ') + ln.text));
          if (ln.tag) { row.appendChild(document.createTextNode('  ')); row.appendChild(el('span', ln.tone === 'dim' ? 's' : 'new', ln.tag)); }
          e.appendChild(row);
        });
        return e;
      case 'lanes':
        e = el('div', 'fan');
        b.items.forEach(function (it) {
          const l = el('div', 'lane' + (it.pick ? ' pick' : '')); reveal(l, k);
          l.appendChild(el('div', 't', it.title));
          l.appendChild(el('div', 's', it.sub));
          if (it.file) l.appendChild(el('div', 'file', it.file));
          e.appendChild(l);
        });
        return e;
      case 'backlog':
        e = el('div', 'backlog');
        b.items.forEach(function (it) {
          const r = el('div', 'bl' + (it.done ? ' done' : '')); reveal(r, k);
          r.appendChild(el('span', 'bx', it.done ? '[x]' : '[ ]'));
          r.appendChild(el('span', 'bid', it.id));
          r.appendChild(el('span', 'btx', it.title));
          r.appendChild(el('span', 'bmeta', ' (kind: ' + it.kind + ') (since ' + it.since + ')'));
          e.appendChild(r);
        });
        return e;
      case 'plan':
        e = el('div', 'plan'); reveal(e, k);
        e.appendChild(el('div', 't', b.title));
        const ul = el('ul', ''); (b.bullets || []).forEach(function (x) { ul.appendChild(el('li', '', x)); }); e.appendChild(ul);
        const dec = el('div', 'decide');
        (b.buttons || []).forEach(function (bt) {
          const bb = el('div', 'big ' + bt.kind, bt.label); dec.appendChild(bb);
          if (bt.pressAt != null) acts.push({ at: bt.pressAt, fn: function () { bb.classList.add('pressed'); }, reset: function () { bb.classList.remove('pressed'); } });
        });
        e.appendChild(dec);
        return e;
      case 'rule': e = el('div', 'rule'); rich(e, b.text); return reveal(e, k);
      case 'note': e = el('p', 'note'); rich(e, b.text); return reveal(e, k);
      case 'workers':
        e = el('div', 'workers');
        b.items.forEach(function (it) {
          const w = el('div', 'card worker'); reveal(w, k);
          if (it.tone) w.style.borderColor = 'var(--t-' + it.tone + ')';
          w.appendChild(el('span', 't', it.name));
          const st = el('span', 'st', 'queued'); w.appendChild(st);
          function set(s) { st.textContent = s; st.className = 'st' + (s === 'running' ? ' run' : s === 'done' ? ' fin' : ''); }
          (it.states || []).forEach(function (x) { acts.push({ at: x.at, fn: function () { set(x.state); }, reset: function () { set('queued'); } }); });
          e.appendChild(w);
        });
        return e;
      default:
        return el('div', 'card', 'unknown block: ' + b.t);
    }
  }

  function card(it, k) {
    const e = el('div', 'card'); reveal(e, k);
    if (it.tone) e.style.borderColor = 'var(--t-' + it.tone + ')';
    e.appendChild(el('div', 't', it.title));
    if (it.sub) e.appendChild(el('div', 's' + (it.mono ? ' file' : ''), it.sub));
    if (it.bullets) { const ul = el('ul', ''); it.bullets.forEach(function (x) { ul.appendChild(el('li', '', x)); }); e.appendChild(ul); }
    return e;
  }

  /* ---------- canvas: step cards and arrows ---------- */
  const ICON = { // 16px line icons, one per node kind
    trigger: '<path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z"/>',
    worker: '<circle cx="8" cy="8" r="2.4"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
    gate: '<path d="M8 1.5 14.5 8 8 14.5 1.5 8z"/><path d="M5.5 8l1.8 1.8L10.8 6"/>',
    result: '<rect x="2" y="2.5" width="12" height="11"/><path d="M5 8.2l2.2 2.2L11.2 6"/>',
    twin: '<circle cx="5.5" cy="8" r="3.6"/><circle cx="10.5" cy="8" r="3.6"/>',
    router: '<circle cx="3" cy="8" r="1.6"/><circle cx="13" cy="3.5" r="1.6"/><circle cx="13" cy="12.5" r="1.6"/><path d="M4.6 8h3l3.4-3.6M7.6 8l3.8 3.6"/>',
    outcome: '<path d="M2 5.5h5l2 2.5-2 2.5H2zM9 8h5"/>',
    loop: '<path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v3h-3"/>'
  };
  const KIND_LABEL = { trigger: 'TRIGGER', worker: 'WORKER', gate: 'GATE', result: 'RESULT', twin: 'TWIN', router: 'ORCHESTRATOR', outcome: 'OUTCOME' };
  function svg(name) { return '<svg viewBox="0 0 16 16" aria-hidden="true">' + ICON[name] + '</svg>'; }
  function kindOf(s) { return s.gate ? 'gate' : s.kind || 'worker'; }
  function setClass(p, base, state, mark) {
    p.setAttribute('class', base + (state ? ' ' + state : ''));
    p.setAttribute('marker-end', 'url(#' + (state ? 'aha' : mark || 'ah') + ')');
  }

  // Where each step sits: 4 columns wide (the rows alternate direction, so each row drops straight into the next), or one column.
  function place(i, cols) {
    if (cols === 1) return { row: i, col: 0 };
    const row = Math.floor(i / cols), c = i % cols;
    return { row: row, col: row % 2 ? cols - 1 - c : c };
  }

  FlowAnim.canvas = function (data, onPick) {
    const S = data.stages, canvas = $('canvas'), host = $('nodes'), paths = $('edge-paths');
    const els = [],heads = [],smalls = [];let seq = [],spine = [],spineLbl = [],full = false,cols = 1;
    let routerIdx = -1,afterIdx = -1,grp = null;const gOut = [],gBack = [];let gE1,gE2,gL1,gL2,outcomeIdx = -1,outcome = null;
    S.forEach(function (s, o) { if (s.side) routerIdx = o; if (s.options) outcomeIdx = o; });
    if (routerIdx >= 0) S.forEach(function (s, o) { if (s.n === S[routerIdx].after) afterIdx = o; });

    function fill(b, s, kind) { // the text of one card; returns its sentence line
      const kd = el('span', 'kind');
      kd.insertAdjacentHTML('beforeend', svg(kind));
      kd.appendChild(document.createTextNode((s.side ? '' : s.n + ' · ') + KIND_LABEL[kind]));
      b.appendChild(kd);
      b.appendChild(el('b', '', s.name));
      const sm = el('small', '', (s.role || '').split(/(?<=\.)\s/)[0]); b.appendChild(sm);
      if (s.me) b.appendChild(el('span', 'mechip' + (kind === 'gate' ? '' : ' fo'), 'ME · ' + s.me));
      if (s.loop) {
        const lp = el('span', 'loop fo'); lp.insertAdjacentHTML('beforeend', svg('loop'));
        lp.appendChild(document.createTextNode('try → check → fix · max ' + s.loop + ' turns')); b.appendChild(lp);
      }
      return sm;
    }

    S.forEach(function (s, o) {
      const kind = kindOf(s);let b,hd;
      if (s.side) { // orchestrator on top, its workers stacked under it; arrows go out the left side and come back on the right
        const box = el('div', 'rgroup'); box.hidden = true;
        hd = el('button', 'node k-router'); hd.type = 'button'; smalls[o] = fill(hd, s, kind);
        box.appendChild(hd);
        const ul = el('ul', 'wks'), wk = [];
        (s.workers || []).forEach(function (w) {
          const li = el('li', 'wk'); li.appendChild(el('b', '', w.name)); li.appendChild(el('small', '', w.job)); ul.appendChild(li); wk.push(li);
        });
        box.appendChild(ul);
        grp = { box: box, head: hd, wk: wk }; b = box;
      } else if (s.options) { // a card whose head opens the drawer and whose chips pick the outcome
        b = el('div', 'node k-outcome'); hd = el('button', 'nhead'); hd.type = 'button'; smalls[o] = fill(hd, s, kind); b.appendChild(hd);
        const opts = el('div', 'opts'), chips = [];
        opts.setAttribute('role', 'group'); opts.setAttribute('aria-label', 'Outcome');
        s.options.forEach(function (op, j) {
          const c = el('button', 'opt', op.label); c.type = 'button'; c.addEventListener('click', function () { pickOutcome(j); });
          opts.appendChild(c); chips.push(c);
        });
        b.appendChild(opts); outcome = { chips: chips, sel: 0 };
      } else {
        b = hd = el('button', 'node k-' + kind); b.type = 'button'; smalls[o] = fill(b, s, kind);
        b.setAttribute('aria-label', 'Step ' + s.n + ' ' + s.name + ', ' + KIND_LABEL[kind].toLowerCase());
      }
      hd.addEventListener('click', function () { onPick(o, hd); });
      b.hidden = true; host.appendChild(b); els[o] = b; heads[o] = hd;
    });
    const base = smalls.map(function (sm) { return sm ? sm.textContent : ''; });

    function pickOutcome(j) { // the path changes a little: Execute says what it makes
      if (!outcome) return;
      outcome.sel = j;
      outcome.chips.forEach(function (c, x) { c.setAttribute('aria-pressed', x === j ? 'true' : 'false'); });
      if (afterIdx >= 0) smalls[afterIdx].textContent = full ? 'Starts the workers, then ' + S[outcomeIdx].options[j].exec + '.' : base[afterIdx];
    }

    if (grp) { // arrows for the side loop, made once
      for (let j = 0; j < grp.wk.length; j++) {
        const po = document.createElementNS(NS, 'path'), pb = document.createElementNS(NS, 'path');
        paths.appendChild(po); paths.appendChild(pb); gOut.push(po); gBack.push(pb);
      }
      gE1 = document.createElementNS(NS, 'path'); gE2 = document.createElementNS(NS, 'path'); paths.appendChild(gE1); paths.appendChild(gE2);
      gL1 = el('span', 'elabel l', 'jobs'); gL2 = el('span', 'elabel', 'done'); canvas.appendChild(gL1); canvas.appendChild(gL2);
    }

    function setMode(f) {
      full = f;
      canvas.classList.toggle('full', f);
      const list = [];
      S.forEach(function (s, o) { if (!s.fullOnly) list.push(o); });
      if (f) S.forEach(function (s, o) {
        if (!s.fullOnly || s.side) return;
        let p = -1; list.forEach(function (x, idx) { if (S[x].n === s.after) p = idx; });
        list.splice(p + 1, 0, o);
      });
      seq = list;
      S.forEach(function (s, o) { els[o].hidden = !(seq.indexOf(o) >= 0 || (s.side && f)); });
      spine.forEach(function (p) { p.remove(); }); spineLbl.forEach(function (l) { l.remove(); }); spine = []; spineLbl = [];
      for (let i = 0; i < seq.length - 1; i++) {
        const p = document.createElementNS(NS, 'path'); setClass(p, 'e', ''); paths.appendChild(p); spine.push(p);
        const lb = el('span', 'elabel', S[seq[i]].edge || ''); lb.hidden = true; canvas.appendChild(lb); spineLbl.push(lb);
      }
      pickOutcome(outcome ? outcome.sel : 0);
      layout();
    }

    function layout() {
      cols = canvas.clientWidth >= 600 ? 4 : 1;
      canvas.classList.toggle('wide', cols > 1);
      host.style.setProperty('--cols', cols);
      let row = 0, gpos = null, epos = null;
      seq.forEach(function (o, i) {
        const pos = cols === 1 ? { row: row, col: 0 } : place(i, cols);
        if (cols === 1) { row += 1; if (full && o === afterIdx && grp) { gpos = { row: row }; row += 1; } }
        els[o].style.gridRow = pos.row + 1; els[o].style.gridColumn = pos.col + 1;
        els[o].classList.toggle('off', cols > 1 && i % 2 === 1);
        if (o === afterIdx) epos = pos;
      });
      if (grp && epos && (cols > 1 || gpos)) {
        if (cols > 1) { const start = epos.col + 1 < cols ? epos.col : epos.col - 1; gpos = { row: epos.row + 1 }; grp.box.style.gridColumn = (start + 1) + ' / span 2'; }
        else grp.box.style.gridColumn = '1';
        grp.box.style.gridRow = gpos.row + 1;
      }
      draw();
    }

    function rect(e) {
      const c = canvas.getBoundingClientRect(), r = e.getBoundingClientRect();
      return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
    }
    function curve(a, b) { // leave one card on the side that faces the next, arrive with the arrowhead on the near edge
      const dx = Math.abs((a.x + a.w / 2) - (b.x + b.w / 2));let p0,p1,c0,c1,d;
      if (dx < 8) { // straight down
        p0 = { x: a.x + a.w / 2, y: a.y + a.h }; p1 = { x: b.x + b.w / 2, y: b.y - 3 }; d = (p1.y - p0.y) / 2;
        c0 = { x: p0.x, y: p0.y + d }; c1 = { x: p1.x, y: p1.y - d };
      } else if (b.x > a.x) { // to the right
        p0 = { x: a.x + a.w, y: a.y + a.h / 2 }; p1 = { x: b.x - 3, y: b.y + b.h / 2 }; d = (p1.x - p0.x) / 2;
        c0 = { x: p0.x + d, y: p0.y }; c1 = { x: p1.x - d, y: p1.y };
      } else { // to the left
        p0 = { x: a.x, y: a.y + a.h / 2 }; p1 = { x: b.x + b.w + 3, y: b.y + b.h / 2 }; d = (p0.x - p1.x) / 2;
        c0 = { x: p0.x - d, y: p0.y }; c1 = { x: p1.x + d, y: p1.y };
      }
      return { d: 'M' + p0.x + ' ' + p0.y + ' C' + c0.x + ' ' + c0.y + ' ' + c1.x + ' ' + c1.y + ' ' + p1.x + ' ' + p1.y, mx: (p0.x + p1.x) / 2, my: (p0.y + p1.y) / 2, vert: dx < 8 };
    }
    function put(lb, x, y, show) { lb.hidden = !show; lb.style.left = x + 'px'; lb.style.top = y + 'px'; }

    function draw() {
      spine.forEach(function (p, i) {
        const a = rect(els[seq[i]]), b = rect(els[seq[i + 1]]), lb = spineLbl[i];
        if (cols === 1 && full && grp && seq[i] === afterIdx) { // the orchestrator sits between: route round the right edge
          const gx = canvas.clientWidth - 6, y0 = a.y + a.h / 2, y1 = b.y + b.h / 2, x1 = b.x + b.w + 3;
          p.setAttribute('d', 'M' + (a.x + a.w) + ' ' + y0 + ' H' + (gx - 6) + ' Q' + gx + ' ' + y0 + ' ' + gx + ' ' + (y0 + 6) + ' V' + (y1 - 6) + ' Q' + gx + ' ' + y1 + ' ' + (gx - 6) + ' ' + y1 + ' H' + x1);
          lb.hidden = true; return;
        }
        const g = curve(a, b);
        p.setAttribute('d', g.d);
        put(lb, g.mx, g.my, g.vert && !!lb.textContent); // a label only where the arrow is long enough to carry one
        lb.classList.toggle('l', g.mx + 12 + lb.offsetWidth > canvas.clientWidth - 4); // keep it inside the canvas: left of the line when the right is short
      });
      if (!grp) return;
      const on = full && !grp.box.hidden;
      gOut.concat(gBack, [gE1, gE2]).forEach(function (p) { p.style.display = on ? '' : 'none'; });
      gL1.hidden = gL2.hidden = !on;
      if (!on) return;
      const O = rect(grp.head), X = rect(els[afterIdx]), cx = X.x + X.w / 2, xb = X.y + X.h, ob = O.y + O.h, tx = O.x + 14, rx = O.x + O.w - 14;
      gE1.setAttribute('d', 'M' + (cx - 14) + ' ' + xb + ' V' + (O.y - 3));
      gE2.setAttribute('d', 'M' + (cx + 14) + ' ' + O.y + ' V' + (xb + 3));
      put(gL1, cx - 14 - 20, (xb + O.y) / 2, true); put(gL2, cx + 14, (xb + O.y) / 2, true);
      grp.wk.forEach(function (w, j) {
        const W = rect(w), wy = W.y + W.h / 2;
        gOut[j].setAttribute('d', 'M' + tx + ' ' + ob + ' V' + (wy - 8) + ' Q' + tx + ' ' + wy + ' ' + (tx + 8) + ' ' + wy + ' H' + (W.x - 3));
        gBack[j].setAttribute('d', 'M' + (W.x + W.w) + ' ' + wy + ' H' + (rx - 8) + ' Q' + rx + ' ' + wy + ' ' + rx + ' ' + (wy - 8) + ' V' + (ob + 3));
      });
    }

    function resetGroup() {
      if (!grp) return;
      gOut.forEach(function (p) { setClass(p, 'e', ''); }); gBack.forEach(function (p) { setClass(p, 'e back', ''); });
      setClass(gE1, 'e', ''); setClass(gE2, 'e back', '');
      grp.wk.forEach(function (w) { w.className = 'wk'; });
    }
    window.addEventListener('resize', layout);
    if (window.ResizeObserver) new ResizeObserver(draw).observe(host);
    resetGroup(); setMode(false);

    return {
      nodes: heads,
      seq: function () { return seq; },
      setMode: setMode,
      mark: function (cur) { // the step on, steps passed, arrows passed and the arrow being walked
        els.forEach(function (b, o) { const j = seq.indexOf(o); b.classList.toggle('on', j >= 0 && j === cur); b.classList.toggle('done', j >= 0 && j < cur); });
        if (grp) heads[routerIdx].classList.remove('on');
        spine.forEach(function (p, j) { setClass(p, 'e', j === cur - 1 ? 'live' : j < cur - 1 ? 'done' : ''); });
      },
      pickSide: function () { if (grp) heads[routerIdx].classList.add('on'); },
      worker: function (j, state) { // '' idle, 'run' the job goes out, 'done' the result comes back
        if (!grp || !grp.wk[j]) return;
        grp.wk[j].className = 'wk' + (state ? ' ' + state : '');
        setClass(gOut[j], 'e', state === 'run' ? 'live' : state === 'done' ? 'done' : '');
        setClass(gBack[j], 'e back', state === 'done' ? 'live' : '');
      },
      router: function (state) { // '' idle, 'go' jobs handed over, 'back' results handed back
        if (!grp) return;
        if (!state) resetGroup();
        setClass(gE1, 'e', state === 'go' || state === 'back' ? 'done' : '');
        if (state === 'go') setClass(gE1, 'e', 'live');
        setClass(gE2, 'e back', state === 'back' ? 'live' : '');
      },
      hasRouter: function () { return !!grp; },
      workers: function () { return grp ? grp.wk.length : 0; },
      execIdx: afterIdx, routerIdx: routerIdx
    };
  };

  /* ---------- timeline ---------- */
  FlowAnim.init = function (data) {
    const STAGES = data.stages, BASE = data.baseMs || 5000, SLOWF = data.slowFactor || 2.2;
    const CLK = data.clock || { start: '07:42:00', scale: 7 };
    const cp = CLK.start.split(':').map(Number), CLK0 = cp[0] * 3600 + cp[1] * 60 + cp[2];
    const logEl = $('log'), live = $('livetag'), drawer = $('drawer'), board = $('board'), now = $('now');
    const stageEls = Array.prototype.slice.call($('stages').querySelectorAll('.stage'));
    const pillEls = Array.prototype.slice.call(document.querySelectorAll('[data-from]'));
    let timers = [], slow = false, full = false, cur = -1, t0 = 0, opener = null, seq = [];
    const stamp = FlowAnim.state.stamp;
    const docked = window.matchMedia('(min-width: 900px)');

    // optional parent chips: data.groups = [{ name, stages: ["01", ...] }]
    const bandsEl = $('bands'), bandEls = [], bandSpan = [];
    (data.groups || []).forEach(function (g) {
      const idx = (g.stages || []).map(function (id) {
        for (let j = 0; j < STAGES.length; j++) if (STAGES[j].n === id) return j;
        return -1;
      }).filter(function (j) { return j >= 0; });
      if (!idx.length) return;
      const lo = Math.min.apply(null, idx), hi = Math.max.apply(null, idx);
      const b = el('div', 'band', g.name + ' · ' + STAGES[lo].n + (hi > lo ? '-' + STAGES[hi].n : ''));
      bandsEl.appendChild(b); bandEls.push(b); bandSpan.push([lo, hi]);
    });
    if (!bandEls.length) bandsEl.style.display = 'none';

    const cv = FlowAnim.canvas(data, function (o, btn) { opener = btn; pick(o); });
    seq = cv.seq();

    // while Execute runs in the Full view, the orchestrator hands each job out to its worker and takes the result back
    if (cv.hasRouter()) {
      const acts = FlowAnim._actions[cv.execIdx];
      acts.push({ at: 300, fn: function () { cv.router('go'); }, reset: function () { cv.router(''); } });
      for (let w = 0; w < cv.workers(); w++) (function (w) {
        acts.push({ at: 800 + w * 450, fn: function () { cv.worker(w, 'run'); }, reset: function () { cv.worker(w, ''); } });
        acts.push({ at: 2200 + w * 350, fn: function () { cv.worker(w, 'done'); }, reset: function () { } });
      })(w);
      acts.push({ at: 3700, fn: function () { cv.router('back'); }, reset: function () { } });
    }

    function openDrawer(on) {
      drawer.hidden = !on;
      board.classList.toggle('has-drawer', on && docked.matches);
      if (!on && opener && !docked.matches) opener.focus();
      cv.nodes.forEach(function (b) { b.setAttribute('aria-expanded', on ? 'true' : 'false'); });
    }
    $('drawer-x').addEventListener('click', function () { openDrawer(false); });
    docked.addEventListener('change', function () { openDrawer(docked.matches); });

    function pick(o) {
      if (STAGES[o].side) { clearAll(); live.textContent = '● paused'; showSide(o); } else jump(seq.indexOf(o));
      openDrawer(true);
    }
    function showSide(o) {
      stageEls.forEach(function (e, j) { e.classList.toggle('on', j === o); });
      cv.pickSide();
      caption(o);
    }
    function caption(o) {
      now.textContent = '';
      now.appendChild(el('b', '', (STAGES[o].side ? 'Side loop' : STAGES[o].n) + ' ' + (STAGES[o].title || STAGES[o].name) + ': '));
      now.appendChild(document.createTextNode(STAGES[o].role || ''));
    }

    function factor() { return slow ? SLOWF : 1; }
    function applyFactor() { document.documentElement.style.setProperty('--tm', String(factor())); }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clearAll() { timers.forEach(clearTimeout); timers = []; }

    function clock(i, off) {
      const t = CLK0 + Math.round((i * BASE + off) / 1000 * (CLK.scale || 7));
      return two(Math.floor(t / 3600) % 24) + ':' + two(Math.floor(t / 60) % 60) + ':' + two(t % 60);
    }
    function addLog(i, L) {
      const d = el('div', 'ln ' + (L.tone || ''));
      d.appendChild(el('span', 'ts', clock(i, L.at)));
      d.appendChild(document.createTextNode(' '));
      const txt = (L.state ? L.state + (L.key ? ' [key=' + L.key + ']' : '') + ': ' : '') + L.text;
      d.appendChild(el('span', 'tx', txt));
      logEl.appendChild(d);
      while (logEl.children.length > 14) logEl.removeChild(logEl.firstChild);
    }

    function show(i) {
      cur = i;
      const o = seq[i], pa = STAGES[o].pillAs != null ? STAGES[o].pillAs : o;
      stageEls.forEach(function (e, j) { e.classList.toggle('on', j === o); });
      cv.mark(i);
      bandEls.forEach(function (e, j) { e.classList.toggle('on', pa >= bandSpan[j][0] && pa <= bandSpan[j][1]); });
      pillEls.forEach(function (e) {
        const from = +e.getAttribute('data-from'), to = e.hasAttribute('data-to') ? +e.getAttribute('data-to') : 99;
        e.classList.toggle('show', pa >= from && pa <= to);
      });
      caption(o);
      stamp[i] = Math.round(performance.now() - t0);
    }

    function runStage(i) {
      show(i);
      const o = seq[i], f = factor();
      const logs = (STAGES[o].log || []).concat(full && o === cv.execIdx && cv.routerIdx >= 0 ? STAGES[cv.routerIdx].log || [] : []);
      logs.forEach(function (L) { later(function () { addLog(i, L); }, L.at * f); });
      FlowAnim._actions.forEach(function (acts) { acts.forEach(function (a) { a.reset(); }); });
      FlowAnim._actions[o].forEach(function (a) { later(a.fn, a.at * f); });
    }

    function play() {
      clearAll();
      t0 = performance.now();
      stamp.length = 0;
      logEl.innerHTML = '';
      live.textContent = '● live';
      FlowAnim.state.ready = false;
      if (docked.matches) openDrawer(true); // wide: the drawer follows the replay; a phone keeps the canvas in view and shows a caption
      const f = factor();
      for (let i = 0; i < seq.length; i++) {
        (function (i) { later(function () { runStage(i); }, i * BASE * f); })(i);
      }
      later(function () {
        live.textContent = '● done';
        FlowAnim.state.ready = true;
        FlowAnim.state.endAt = Math.round(performance.now() - t0);
      }, seq.length * BASE * f);
    }

    function jump(i) {
      clearAll();
      t0 = performance.now();
      logEl.innerHTML = '';
      live.textContent = '● paused';
      runStage(Math.max(0, Math.min(seq.length - 1, i)));
    }

    function replay() { applyFactor(); play(); }
    $('replay').addEventListener('click', replay);

    const slowBtn = $('slow');
    function setSlow(v, restart) {
      slow = v;
      slowBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
      slowBtn.textContent = 'Slow-mo: ' + (v ? 'on' : 'off');
      if (restart) replay();
    }
    slowBtn.addEventListener('click', function () { setSlow(!slow, true); });

    const viewBtn = $('view');
    function setView(v, restart) { // Simple is the seven-step spine; Full adds the checks, the loops and the router
      full = v;
      viewBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
      viewBtn.textContent = 'View: ' + (v ? 'Full' : 'Simple');
      $('frame').hidden = !v;
      clearAll(); cv.router('');
      cv.setMode(v); seq = cv.seq();
      if (restart) replay();
    }
    viewBtn.addEventListener('click', function () { setView(!full, true); });

    // #theme is the site's skin button (skin.js): HUD, Matrix, Calm. The saved skin decides the start.

    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); replay(); }
      else if (e.key === 'Escape' && !drawer.hidden) openDrawer(false);
      else if (e.key === 's' || e.key === 'S') setSlow(!slow, true);
      else if (e.key === 'v' || e.key === 'V') setView(!full, true);
      else if (e.key === 'ArrowRight') jump(Math.min(seq.length - 1, cur + 1));
      else if (e.key === 'ArrowLeft') jump(Math.max(0, cur - 1));
    });

    if (/[?&]slow=1/.test(location.search)) setSlow(true, false);
    if (/[?&]view=full/.test(location.search)) setView(true, false);
    applyFactor();
    const qStage = /[?&]stage=(\d)/.exec(location.search);
    if (qStage) { jump(Math.min(seq.length - 1, Math.max(0, +qStage[1] - 1))); openDrawer(docked.matches); } else play();
  };

  /* ---------- boot: pick the data, render, play ---------- */
  FlowAnim.boot = function () {
    const n = $('flow-data');
    try {
      const data = JSON.parse(n.textContent.replace(/<!--\/?DATA-->/g, ''));
      FlowAnim.render(data); FlowAnim.init(data);
    } catch (e) { $('title').textContent = 'Could not read the pipeline data'; $('tagline').textContent = String(e); }
  };

  window.FlowAnim = FlowAnim;
})();
