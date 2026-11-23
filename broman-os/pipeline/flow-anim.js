/*
  flow-anim.js: data-driven animation module for flow-style.css. No dependencies, works from file://.

  The page is a skeleton (see index.html in this folder). All content comes from one JSON document,
  schema "flow-pipeline.v1", inline in <script type="application/json" id="flow-data">. Nothing is fetched.
  Then FlowAnim.render(data) builds the page and FlowAnim.init(data) plays it.

  Skeleton ids it fills or uses:
    #title #tagline #thought-label #thought-text #pills  header and the travelling item
    #rail #stages #log #livetag #legend #source           rail, panels, log, footer
    #replay #slow #theme                                  buttons
    canvas.net                                            node-network background (optional)

  URL options: ?stage=N shows one stage with no auto-advance; ?slow=1 starts slow;
  ?theme=light|dark. Self-test hook: FlowAnim.state.stamp holds stage start times in ms.
  Text from the JSON is always inserted with textContent. Only **bold** is parsed.
*/
(function () {
  'use strict';
  var FlowAnim = { state: { stamp: [], ready: false, endAt: 0 } };

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

  /* ---------- node-network background ---------- */
  FlowAnim.network = function (canvas) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var nodes = [], w = 0, h = 0, dpr = 1, raf = 0;
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function rgb(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace(/\s+/g, ''); }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(24, Math.min(70, Math.round(w * h / 26000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: 1.6 + Math.random() * 2.4 });
      }
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var line = rgb('--net-line'), dot = rgb('--net-dot'), reach = Math.min(190, Math.max(120, w / 9));
      var i, j, a, b, d;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        if (!still) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > w) a.vx *= -1;
          if (a.y < 0 || a.y > h) a.vy *= -1;
        }
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j]; d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < reach) {
            ctx.strokeStyle = 'rgba(' + line + ',' + (0.5 * (1 - d / reach)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.fillStyle = 'rgba(' + dot + ',0.85)';
        ctx.shadowColor = 'rgba(' + dot + ',0.9)'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (!still) raf = requestAnimationFrame(draw);
    }
    size(); draw();
    window.addEventListener('resize', function () { cancelAnimationFrame(raf); size(); draw(); });
    FlowAnim.redrawNetwork = function () { if (still) draw(); };
  };

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
        e = el('div', 'lanes');
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
          r.appendChild(el('span', 'bmeta', '(kind: ' + it.kind + ') (since ' + it.since + ')'));
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
          if (it.tone) w.style.borderColor = 'var(--' + it.tone + ')';
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
    if (it.tone) e.style.borderColor = 'var(--' + it.tone + ')';
    e.appendChild(el('div', 't', it.title));
    if (it.sub) e.appendChild(el('div', 's' + (it.mono ? ' file' : ''), it.sub));
    if (it.bullets) { var ul = el('ul', ''); it.bullets.forEach(function (x) { ul.appendChild(el('li', '', x)); }); e.appendChild(ul); }
    return e;
  }

  /* ---------- timeline ---------- */
  FlowAnim.init = function (data) {
    var STAGES = data.stages, BASE = data.baseMs || 5000, SLOWF = data.slowFactor || 2.2;
    var CLK = data.clock || { start: '07:42:00', scale: 7 };
    var cp = CLK.start.split(':').map(Number), CLK0 = cp[0] * 3600 + cp[1] * 60 + cp[2];
    var rail = $('rail'), logEl = $('log'), live = $('livetag');
    var stageEls = Array.prototype.slice.call($('stages').querySelectorAll('.stage'));
    var pillEls = Array.prototype.slice.call(document.querySelectorAll('[data-from]'));
    var stepEls = [], timers = [], slow = false, cur = -1, t0 = 0;
    var stamp = FlowAnim.state.stamp;

    rail.style.gridTemplateColumns = 'repeat(' + STAGES.length + ', 1fr)'; // any stage count
    rail.style.setProperty('--lead', (50 / STAGES.length).toFixed(3) + '%');

    // optional parent bands: data.groups = [{ name, stages: ["01", ...] }], contiguous stage ids
    var bandsEl = $('bands'), bandEls = [], bandSpan = [];
    bandsEl.style.gridTemplateColumns = rail.style.gridTemplateColumns;
    (data.groups || []).forEach(function (g) {
      var idx = (g.stages || []).map(function (id) {
        for (var j = 0; j < STAGES.length; j++) if (STAGES[j].n === id) return j;
        return -1;
      }).filter(function (j) { return j >= 0; });
      if (!idx.length) return;
      var lo = Math.min.apply(null, idx), hi = Math.max.apply(null, idx);
      var b = el('div', 'band', g.name);
      b.style.gridColumn = (lo + 1) + ' / ' + (hi + 2);
      bandsEl.appendChild(b); bandEls.push(b); bandSpan.push([lo, hi]);
    });
    if (!bandEls.length) bandsEl.style.display = 'none';

    var line = el('div', 'line'), fill = el('div', 'fill'), pulse = el('div', 'pulse');
    rail.appendChild(line); rail.appendChild(fill); rail.appendChild(pulse);

    STAGES.forEach(function (s, i) {
      var b = el('button', 'step' + (s.gate ? ' gate' : ''));
      b.type = 'button';
      b.appendChild(el('span', 'dot', s.n));
      b.appendChild(el('span', 'nm', s.name));
      b.setAttribute('aria-label', 'Stage ' + s.n + ' ' + s.name);
      b.addEventListener('click', function () { jump(i); });
      rail.appendChild(b);
      stepEls.push(b);
    });

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
      stepEls.forEach(function (e, j) { e.classList.toggle('on', j === i); e.classList.toggle('done', j < i); });
      bandEls.forEach(function (e, j) { e.classList.toggle('on', i >= bandSpan[j][0] && i <= bandSpan[j][1]); });
      var span = 'calc((100% - 2 * var(--lead)) * ' + (i / (STAGES.length - 1)).toFixed(4) + ')';
      fill.style.width = span;
      pulse.style.left = 'calc(var(--lead) + ' + span + ')';
      pillEls.forEach(function (e) {
        var from = +e.getAttribute('data-from'), to = e.hasAttribute('data-to') ? +e.getAttribute('data-to') : 99;
        e.classList.toggle('show', i >= from && i <= to);
      });
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

    var themeBtn = $('theme');
    function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
    function setTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      themeBtn.textContent = 'Theme: ' + t;
      if (FlowAnim.redrawNetwork) FlowAnim.redrawNetwork();
    }
    // the site's saved skin decides the start: Calm is light, HUD and Matrix are dark; the button changes it for this view only
    var saved = null;
    try { saved = localStorage.getItem('skin'); } catch (e) {}
    var qTheme = /[?&]theme=(light|dark)/.exec(location.search);
    setTheme(qTheme ? qTheme[1] : (saved === 'calm' ? 'light' : 'dark'));
    themeBtn.addEventListener('click', function () { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); });

    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); replay(); }
      else if (e.key === 's' || e.key === 'S') setSlow(!slow, true);
      else if (e.key === 'ArrowRight') jump(Math.min(STAGES.length - 1, cur + 1));
      else if (e.key === 'ArrowLeft') jump(Math.max(0, cur - 1));
    });

    if (/[?&]slow=1/.test(location.search)) setSlow(true, false);
    applyFactor();
    var qStage = /[?&]stage=(\d)/.exec(location.search);
    if (qStage) jump(Math.min(STAGES.length - 1, Math.max(0, +qStage[1] - 1))); else play();
  };

  /* ---------- boot: pick the data, render, play ---------- */
  FlowAnim.boot = function () {
    FlowAnim.network(document.getElementById('net'));
    function go(data) { FlowAnim.render(data); FlowAnim.init(data); }
    function inline() {
      var n = $('flow-data');
      try { go(JSON.parse(n.textContent.replace(/<!--\/?DATA-->/g, ''))); }
      catch (e) { $('title').textContent = 'Could not read the pipeline data'; $('tagline').textContent = String(e); }
    }
    inline();
  };

  window.FlowAnim = FlowAnim;
})();
