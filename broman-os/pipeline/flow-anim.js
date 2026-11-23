/*
  flow-anim.js: data-driven workflow canvas for flow-style.css. No dependencies, works from file://.

  The page is a skeleton (see index.html in this folder). All content comes from one JSON document,
  schema "flow-pipeline.v1", inline in <script type="application/json" id="flow-data">. Nothing is fetched.
  FlowAnim.render(data) builds the step content; FlowAnim.init(data) draws the canvas and plays it.

  Each stage may carry "kind" (trigger, worker, gate or result; default worker, "gate": true means gate)
  and "edge" (the label on the arrow that leaves it).

  Skeleton ids it fills or uses:
    #title #tagline #thought-label #thought-text #pills  header and the travelling item
    #nodes #edge-paths #canvas #now                      the canvas: step cards, arrows, caption
    #stages #drawer #drawer-x #board                     detail drawer
    #log #livetag #legend #source #bands                 log, footer, group chips
    #replay #slow #theme                                 buttons (skin.js owns #theme)

  URL options: ?stage=N shows one stage with no auto-advance; ?slow=1 starts slow.
  Self-test hook: FlowAnim.state.stamp holds stage start times in ms.
  Text from the JSON is always inserted with textContent. Only **bold** is parsed.
*/
(function () {
  'use strict';
  var FlowAnim = { state: { stamp: [], ready: false, endAt: 0 } };
  var NS = 'http://www.w3.org/2000/svg';

  function $(id) { return document.getElementById(id); }
  function two(n) { return n < 10 ? '0' + n : '' + n; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
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

    var pills = $('pills');
    ((data.thought && data.thought.pills) || []).forEach(function (p) {
      var e = el('span', 'pill ' + (p.tone || 'cool'), p.label);
      e.setAttribute('data-from', p.from);
      if (p.to != null) e.setAttribute('data-to', p.to);
      pills.appendChild(e);
    });

    var legend = $('legend');
    (data.legend || []).forEach(function (l) { legend.appendChild(el('span', 'pill ' + l.tone, l.label)); });
    $('source').textContent = data.source ? 'Data: ' + data.source : '';

    var host = $('stages');
    var actions = []; // per stage: [{at, fn, reset}]
    data.stages.forEach(function (s, i) {
      var st = el('div', 'stage'); st.setAttribute('data-i', i);
      var acts = []; actions.push(acts);
      var k = { n: 0 };
      var head = el('div', 'head');
      head.appendChild(el('span', 'num', 'STAGE ' + s.n));
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
    var e, i;
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
        var TH = FlowAnim._data.thoughts || [];
        (FlowAnim._data.factories || []).forEach(function (f) {
          var hit = TH.filter(function (t) { return (t.to || []).indexOf(f.id) >= 0; });
          var l = el('div', 'lane' + (hit.length ? ' pick' : '')); reveal(l, k);
          l.appendChild(el('div', 't', f.name));
          l.appendChild(el('div', 's', f.sub || ''));
          hit.forEach(function (t) { l.appendChild(el('span', 'pill cool chip', t.short || t.text)); });
          e.appendChild(l);
        });
        return e;
      case 'teams': // one row per (thought, factory) pair; the team is factory.team in the data
        e = el('div', 'teams');
        var r = 0, FS = FlowAnim._data.factories || [];
        (FlowAnim._data.thoughts || []).forEach(function (t) {
          (t.to || []).forEach(function (fid) {
            var f = FS.filter(function (x) { return x.id === fid; })[0];
            if (!f) return;
            var rowEl = el('div', 'card teamrow'); reveal(rowEl, k);
            var th = el('div', 'th'); th.appendChild(el('b', '', f.name)); th.appendChild(document.createTextNode(' · ' + (t.short || t.text)));
            rowEl.appendChild(th);
            var tw = el('div', 'tw');
            (f.team || []).forEach(function (name, w) {
              var chip = el('span', 'st', '· ' + name);
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
        var lab = el('div', 'flowlabel', b.label || '');
        if (b.code) { lab.appendChild(document.createTextNode(' ')); lab.appendChild(el('code', '', b.code)); }
        e.appendChild(lab);
        return e;
      case 'split':
        e = el('div', b.ratio === 'wide-left' ? 'gatecard' : 'two');
        ['left', 'right'].forEach(function (side) {
          var col = el('div', 'col');
          (b[side] || []).forEach(function (c) { col.appendChild(block(c, k, acts)); });
          e.appendChild(col);
        });
        return e;
      case 'sortcard':
        e = el('div', 'card thoughtcard'); reveal(e, k);
        e.appendChild(el('div', 't', '“' + b.quote + '”'));
        var f = el('div', ''); reveal(f, k); f.appendChild(el('div', 'flow')); e.appendChild(f);
        var pw = el('div', ''); var pl = el('span', 'pill ' + b.pill.tone, b.pill.label); reveal(pl, k); pw.appendChild(pl); e.appendChild(pw);
        if (b.sub) e.appendChild(el('div', 's', b.sub));
        return e;
      case 'tree':
        e = el('pre', 'tree');
        var root = el('span', ''); reveal(root, k); root.appendChild(el('span', 'k', b.root)); e.appendChild(root);
        b.lines.forEach(function (ln, idx) {
          e.appendChild(document.createTextNode('\n'));
          var row = el('span', ''); reveal(row, k);
          row.appendChild(document.createTextNode((idx === b.lines.length - 1 ? '└─ ' : '├─ ') + ln.text));
          if (ln.tag) { row.appendChild(document.createTextNode('  ')); row.appendChild(el('span', ln.tone === 'dim' ? 's' : 'new', ln.tag)); }
          e.appendChild(row);
        });
        return e;
      case 'lanes':
        e = el('div', 'fan');
        b.items.forEach(function (it) {
          var l = el('div', 'lane' + (it.pick ? ' pick' : '')); reveal(l, k);
          l.appendChild(el('div', 't', it.title));
          l.appendChild(el('div', 's', it.sub));
          if (it.file) l.appendChild(el('div', 'file', it.file));
          e.appendChild(l);
        });
        return e;
      case 'backlog':
        e = el('div', 'backlog');
        b.items.forEach(function (it) {
          var r = el('div', 'bl' + (it.done ? ' done' : '')); reveal(r, k);
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
        var ul = el('ul', ''); (b.bullets || []).forEach(function (x) { ul.appendChild(el('li', '', x)); }); e.appendChild(ul);
        var dec = el('div', 'decide');
        (b.buttons || []).forEach(function (bt) {
          var bb = el('div', 'big ' + bt.kind, bt.label); dec.appendChild(bb);
          if (bt.pressAt != null) acts.push({ at: bt.pressAt, fn: function () { bb.classList.add('pressed'); }, reset: function () { bb.classList.remove('pressed'); } });
        });
        e.appendChild(dec);
        return e;
      case 'rule': e = el('div', 'rule'); rich(e, b.text); return reveal(e, k);
      case 'note': e = el('p', 'note'); rich(e, b.text); return reveal(e, k);
      case 'workers':
        e = el('div', 'workers');
        b.items.forEach(function (it) {
          var w = el('div', 'card worker'); reveal(w, k);
          if (it.tone) w.style.borderColor = 'var(--t-' + it.tone + ')';
          w.appendChild(el('span', 't', it.name));
          var st = el('span', 'st', 'queued'); w.appendChild(st);
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
    var e = el('div', 'card'); reveal(e, k);
    if (it.tone) e.style.borderColor = 'var(--t-' + it.tone + ')';
    e.appendChild(el('div', 't', it.title));
    if (it.sub) e.appendChild(el('div', 's' + (it.mono ? ' file' : ''), it.sub));
    if (it.bullets) { var ul = el('ul', ''); it.bullets.forEach(function (x) { ul.appendChild(el('li', '', x)); }); e.appendChild(ul); }
    return e;
  }

  /* ---------- canvas: step cards and arrows ---------- */
  var ICON = { // 16px line icons, one per node kind
    trigger: '<path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8z"/>',
    worker: '<circle cx="8" cy="8" r="2.4"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
    gate: '<path d="M8 1.5 14.5 8 8 14.5 1.5 8z"/><path d="M5.5 8l1.8 1.8L10.8 6"/>',
    result: '<rect x="2" y="2.5" width="12" height="11"/><path d="M5 8.2l2.2 2.2L11.2 6"/>'
  };
  function kindOf(s, i, n) { return s.gate ? 'gate' : s.kind || (i === 0 ? 'trigger' : i === n - 1 ? 'result' : 'worker'); }
  var KIND_LABEL = { trigger: 'TRIGGER', worker: 'WORKER', gate: 'CHECKPOINT', result: 'RESULT' };

  // Where each step sits: 4 columns wide (the second row runs right to left, so Prepare drops straight into Gate), or one column.
  function place(i, n, cols) {
    if (cols === 1) return { row: i, col: 0 };
    var row = Math.floor(i / cols), c = i % cols;
    return { row: row, col: row % 2 ? cols - 1 - c : c };
  }

  FlowAnim.canvas = function (data, onPick) {
    var S = data.stages, n = S.length, host = $('nodes'), canvas = $('canvas'), paths = $('edge-paths');
    var nodes = [], labels = [], edges = [], cols = 1;
    S.forEach(function (s, i) {
      var kind = kindOf(s, i, n);
      var b = el('button', 'node k-' + kind);
      b.type = 'button';
      b.setAttribute('aria-label', 'Step ' + s.n + ' ' + s.name + ', ' + KIND_LABEL[kind].toLowerCase());
      var kd = el('span', 'kind');
      kd.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 16 16" aria-hidden="true">' + ICON[kind] + '</svg>');
      kd.appendChild(document.createTextNode(s.n + ' · ' + KIND_LABEL[kind]));
      b.appendChild(kd);
      b.appendChild(el('b', '', s.name));
      b.appendChild(el('small', '', (s.role || '').split(/(?<=\.)\s/)[0]));
      b.addEventListener('click', function () { onPick(i, b); });
      host.appendChild(b); nodes.push(b);
    });
    for (var i = 0; i < n - 1; i++) {
      var p = document.createElementNS(NS, 'path'); p.setAttribute('class', 'e'); p.setAttribute('marker-end', 'url(#ah)');
      paths.appendChild(p); edges.push(p);
      var lb = el('span', 'elabel', S[i].edge || ''); lb.hidden = true; canvas.appendChild(lb); labels.push(lb);
    }

    function layout() {
      cols = canvas.clientWidth >= 600 ? 4 : 1;
      canvas.classList.toggle('wide', cols > 1);
      host.style.setProperty('--cols', cols);
      nodes.forEach(function (b, i) {
        var pos = place(i, n, cols);
        b.style.gridRow = pos.row + 1; b.style.gridColumn = pos.col + 1;
        b.classList.toggle('off', cols > 1 && i % 2 === 1);
      });
      draw();
    }
    function rect(i) {
      var c = canvas.getBoundingClientRect(), r = nodes[i].getBoundingClientRect();
      return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
    }
    function curve(a, b) { // leave one card on the side that faces the next, arrive with the arrowhead on the near edge
      var dx = Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)), p0, p1, c0, c1, d;
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
    function draw() {
      edges.forEach(function (p, i) {
        var g = curve(rect(i), rect(i + 1));
        p.setAttribute('d', g.d);
        // labels only where the arrow is long enough to carry one without covering its head
        var lb = labels[i];
        lb.hidden = !(g.vert && lb.textContent);
        lb.style.left = g.mx + 'px'; lb.style.top = g.my + 'px';
      });
    }
    window.addEventListener('resize', layout);
    if (window.ResizeObserver) new ResizeObserver(draw).observe(host);
    layout();

    return {
      nodes: nodes,
      mark: function (cur) { // the step on, steps passed, arrows passed and the arrow being walked
        nodes.forEach(function (b, j) { b.classList.toggle('on', j === cur); b.classList.toggle('done', j < cur); });
        edges.forEach(function (p, j) {
          var live = j === cur - 1, done = j < cur - 1;
          p.setAttribute('class', 'e' + (live ? ' live' : done ? ' done' : ''));
          p.setAttribute('marker-end', live || done ? 'url(#aha)' : 'url(#ah)');
        });
      }
    };
  };

  /* ---------- timeline ---------- */
  FlowAnim.init = function (data) {
    var STAGES = data.stages, BASE = data.baseMs || 5000, SLOWF = data.slowFactor || 2.2;
    var CLK = data.clock || { start: '07:42:00', scale: 7 };
    var cp = CLK.start.split(':').map(Number), CLK0 = cp[0] * 3600 + cp[1] * 60 + cp[2];
    var logEl = $('log'), live = $('livetag'), drawer = $('drawer'), board = $('board'), now = $('now');
    var stageEls = Array.prototype.slice.call($('stages').querySelectorAll('.stage'));
    var pillEls = Array.prototype.slice.call(document.querySelectorAll('[data-from]'));
    var timers = [], slow = false, cur = -1, t0 = 0, opener = null;
    var stamp = FlowAnim.state.stamp;
    var docked = window.matchMedia('(min-width: 900px)');

    // optional parent chips: data.groups = [{ name, stages: ["01", ...] }]
    var bandsEl = $('bands'), bandEls = [], bandSpan = [];
    (data.groups || []).forEach(function (g) {
      var idx = (g.stages || []).map(function (id) {
        for (var j = 0; j < STAGES.length; j++) if (STAGES[j].n === id) return j;
        return -1;
      }).filter(function (j) { return j >= 0; });
      if (!idx.length) return;
      var lo = Math.min.apply(null, idx), hi = Math.max.apply(null, idx);
      var b = el('div', 'band', g.name + ' · ' + STAGES[lo].n + (hi > lo ? '-' + STAGES[hi].n : ''));
      bandsEl.appendChild(b); bandEls.push(b); bandSpan.push([lo, hi]);
    });
    if (!bandEls.length) bandsEl.style.display = 'none';

    var cv = FlowAnim.canvas(data, function (i, btn) { opener = btn; jump(i); openDrawer(true); });

    function openDrawer(on) {
      drawer.hidden = !on;
      board.classList.toggle('has-drawer', on && docked.matches);
      if (!on && opener && !docked.matches) opener.focus();
      cv.nodes.forEach(function (b) { b.setAttribute('aria-expanded', on ? 'true' : 'false'); });
    }
    $('drawer-x').addEventListener('click', function () { openDrawer(false); });
    docked.addEventListener('change', function () { openDrawer(docked.matches); });

    function factor() { return slow ? SLOWF : 1; }
    function applyFactor() { document.documentElement.style.setProperty('--tm', String(factor())); }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function clearAll() { timers.forEach(clearTimeout); timers = []; }

    function clock(i, off) {
      var t = CLK0 + Math.round((i * BASE + off) / 1000 * (CLK.scale || 7));
      return two(Math.floor(t / 3600) % 24) + ':' + two(Math.floor(t / 60) % 60) + ':' + two(t % 60);
    }
    function addLog(i, L) {
      var d = el('div', 'ln ' + (L.tone || ''));
      d.appendChild(el('span', 'ts', clock(i, L.at)));
      d.appendChild(document.createTextNode(' '));
      var txt = (L.state ? L.state + (L.key ? ' [key=' + L.key + ']' : '') + ': ' : '') + L.text;
      d.appendChild(el('span', 'tx', txt));
      logEl.appendChild(d);
      while (logEl.children.length > 14) logEl.removeChild(logEl.firstChild);
    }

    function show(i) {
      cur = i;
      stageEls.forEach(function (e, j) { e.classList.toggle('on', j === i); });
      cv.mark(i);
      bandEls.forEach(function (e, j) { e.classList.toggle('on', i >= bandSpan[j][0] && i <= bandSpan[j][1]); });
      pillEls.forEach(function (e) {
        var from = +e.getAttribute('data-from'), to = e.hasAttribute('data-to') ? +e.getAttribute('data-to') : 99;
        e.classList.toggle('show', i >= from && i <= to);
      });
      now.textContent = '';
      now.appendChild(el('b', '', STAGES[i].n + ' ' + (STAGES[i].title || STAGES[i].name) + ': '));
      now.appendChild(document.createTextNode(STAGES[i].role || ''));
      stamp[i] = Math.round(performance.now() - t0);
    }

    function runStage(i) {
      show(i);
      var f = factor();
      (STAGES[i].log || []).forEach(function (L) { later(function () { addLog(i, L); }, L.at * f); });
      FlowAnim._actions.forEach(function (acts) { acts.forEach(function (a) { a.reset(); }); });
      FlowAnim._actions[i].forEach(function (a) { later(a.fn, a.at * f); });
    }

    function play() {
      clearAll();
      t0 = performance.now();
      stamp.length = 0;
      logEl.innerHTML = '';
      live.textContent = '● live';
      FlowAnim.state.ready = false;
      if (docked.matches) openDrawer(true); // wide: the drawer follows the replay; a phone keeps the canvas in view and shows a caption
      var f = factor();
      for (var i = 0; i < STAGES.length; i++) {
        (function (i) { later(function () { runStage(i); }, i * BASE * f); })(i);
      }
      later(function () {
        live.textContent = '● done';
        FlowAnim.state.ready = true;
        FlowAnim.state.endAt = Math.round(performance.now() - t0);
      }, STAGES.length * BASE * f);
    }

    function jump(i) {
      clearAll();
      t0 = performance.now();
      logEl.innerHTML = '';
      live.textContent = '● paused';
      runStage(i);
    }

    function replay() { applyFactor(); play(); }
    $('replay').addEventListener('click', replay);

    var slowBtn = $('slow');
    function setSlow(v, restart) {
      slow = v;
      slowBtn.setAttribute('aria-pressed', v ? 'true' : 'false');
      slowBtn.textContent = 'Slow-mo: ' + (v ? 'on' : 'off');
      if (restart) replay();
    }
    slowBtn.addEventListener('click', function () { setSlow(!slow, true); });

    // #theme is the site's skin button (skin.js): HUD, Matrix, Calm. The saved skin decides the start.

    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); replay(); }
      else if (e.key === 'Escape' && !drawer.hidden) openDrawer(false);
      else if (e.key === 's' || e.key === 'S') setSlow(!slow, true);
      else if (e.key === 'ArrowRight') jump(Math.min(STAGES.length - 1, cur + 1));
      else if (e.key === 'ArrowLeft') jump(Math.max(0, cur - 1));
    });

    if (/[?&]slow=1/.test(location.search)) setSlow(true, false);
    applyFactor();
    var qStage = /[?&]stage=(\d)/.exec(location.search);
    if (qStage) { jump(Math.min(STAGES.length - 1, Math.max(0, +qStage[1] - 1))); openDrawer(docked.matches); } else play();
  };

  /* ---------- boot: pick the data, render, play ---------- */
  FlowAnim.boot = function () {
    var n = $('flow-data');
    try {
      var data = JSON.parse(n.textContent.replace(/<!--\/?DATA-->/g, ''));
      FlowAnim.render(data); FlowAnim.init(data);
    } catch (e) { $('title').textContent = 'Could not read the pipeline data'; $('tagline').textContent = String(e); }
  };

  window.FlowAnim = FlowAnim;
})();
