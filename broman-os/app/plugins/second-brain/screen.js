// brain: a SAMPLE second brain drawn in the look of the website's brain map: a dark ground, an orange centre file, rooms on a ring,
// one dot per note, and a dashed outer ring of tools that are not connected yet. Made-up notes only. Plain canvas, no outside script, no request.
// A toggle switches between a personal second brain and a company brain. The rooms are also listed as buttons under the map.
BromanOS.screens['second-brain/map'] = function (el, data, h) {
  const e = h.esc, TAU = Math.PI * 2, DPR = window.devicePixelRatio || 1;
  let mode = 'personal', nodes = [], sel = null, hover = null, W = 0, H = 0, dirty = true;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R_ROOM = 120, R_TOOL = 215, EXTENT = R_TOOL + 46;
  const hexa = function (c, a) { const n = parseInt(c.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };

  el.innerHTML = '<div class="page-head"><div><h1>Brain</h1><p>A sample second brain. See how your notes could connect.</p></div><div class="acts"><span class="chip is-needs">SAMPLE</span></div></div>' +
    '<div class="tabs" role="tablist" aria-label="Kind of brain">' + Object.keys(data.modes).map(function (k) { return '<button class="tab" role="tab" type="button" data-mode="' + e(k) + '" aria-selected="' + (k === mode) + '">' + e(k === 'personal' ? 'Personal second brain' : 'Company brain') + '</button>'; }).join('') + '</div>' +
    '<p class="br-line" data-line>' + e(data.line) + '</p>' +
    '<div class="br-wrap"><canvas class="br-cv" role="img" aria-label="Sample second brain map: a centre file linked to rooms of notes, with a ring of tools that are not connected yet. The same items are listed as buttons below."></canvas><div class="br-card" data-card hidden></div></div>' +
    '<div class="br-legend mono"><span><i class="br-dot" style="background:#ff7a1a"></i>centre file</span><span><i class="br-dot" style="background:#b57bff"></i>a note</span><span><i class="br-dot is-off"></i>tool not connected yet</span></div>' +
    '<div class="br-rooms" data-rooms></div>';
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), card = el.querySelector('[data-card]');

  function build() {
    const m = data.modes[mode], n = m.rooms.length;
    let rnd = 7;
    const seed = function () { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
    nodes = [{ t: 'root', x: 0, y: 0, bx: 0, by: 0, r: 13, c: '#ff7a1a', label: m.root, text: 'The centre file. Every assistant reads this first; everything else hangs off it. ' + m.about }];
    m.rooms.forEach(function (rm, i) {
      const a = i / n * TAU - Math.PI / 2, hx = R_ROOM * Math.cos(a), hy = R_ROOM * Math.sin(a);
      const hub = { t: 'hub', x: hx, y: hy, bx: hx, by: hy, r: 8, c: rm.color, label: rm.name, text: 'A room of notes: ' + rm.name + '. ' + rm.notes.length + ' sample notes.', ph: seed() * TAU, hub: null };
      nodes.push(hub);
      rm.notes.forEach(function (name, k) {
        const ga = a + (k - (rm.notes.length - 1) / 2) * 0.42, rad = R_ROOM + 40 + (k % 2) * 18, bx = rad * Math.cos(ga), by = rad * Math.sin(ga);
        nodes.push({ t: 'dot', x: bx, y: by, bx: bx, by: by, r: 3.4 + seed() * 1.2, c: rm.color, label: name, text: 'A sample note in ' + rm.name + '. Made up for this demo.', hub: hub, ph: seed() * TAU, rate: 0.6 + seed() });
      });
    });
    data.connectors.forEach(function (name, i) {
      const a = (i + 0.5) / data.connectors.length * TAU - Math.PI / 2 + 0.35, bx = R_TOOL * Math.cos(a), by = R_TOOL * Math.sin(a);
      nodes.push({ t: 'tool', x: bx, y: by, bx: bx, by: by, r: 7, c: '#5a6270', label: name, text: name + ' is not connected. Your own brain fills in only after you connect it, and you will always sign in on the tool\'s own page.', hub: nodes[0], ph: 0 });
    });
    sel = null; hover = null; card.hidden = true; dirty = true;
    el.querySelector('[data-rooms]').innerHTML = m.rooms.map(function (rm) {
      return '<section class="card br-room"><div class="card-head"><h3><i class="br-dot" style="background:' + e(rm.color) + '"></i>' + e(rm.name) + '</h3><span class="mono more">' + rm.notes.length + ' notes</span></div>' +
        '<div class="br-notes">' + rm.notes.map(function (x) { return '<button class="btn btn-q" type="button" data-pick="' + e(x) + '">' + e(x) + '</button>'; }).join('') + '</div></section>';
    }).join('');
  }
  function size() {
    const b = cv.getBoundingClientRect(); W = Math.max(200, b.width); H = Math.max(200, b.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); dirty = true;
  }
  const scale = function () { return Math.min(W, H) / (2 * EXTENT); };
  const toScreen = function (n) { const k = scale(); return { x: W / 2 + n.x * k, y: H / 2 + n.y * k, r: Math.max(2.5, n.r * k * 1.15) }; };

  function draw(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(60,30,90,.28)'); g.addColorStop(0.5, 'rgba(20,14,40,.12)'); g.addColorStop(1, 'rgba(5,6,10,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const k = scale(), cx = W / 2, cy = H / 2;
    ctx.lineWidth = 1;
    [[R_ROOM, '#7a4fd0', 'MEMORY'], [R_TOOL, '#2f5fa8', 'YOUR TOOLS']].forEach(function (rg) {
      ctx.globalAlpha = 0.45; ctx.strokeStyle = rg[1]; ctx.setLineDash(rg[2] === 'YOUR TOOLS' ? [4, 5] : []);
      ctx.beginPath(); ctx.arc(cx, cy, rg[0] * k, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 0.8; ctx.fillStyle = rg[1] === '#7a4fd0' ? '#b57bff' : '#5ea0ff'; ctx.font = '10px ui-monospace, Menlo, monospace'; ctx.textAlign = 'left';
      ctx.fillText(rg[2], cx + 44, cy - rg[0] * k * 0.96 + 4);   // beside the top of the ring, clear of the room label there
    });
    nodes.forEach(function (n) {                       // a gentle drift; none when motion is reduced
      const wob = reduce ? 0 : 1.8, tt = (t || 0) / 1000;
      n.x = n.bx + (n.t === 'root' ? 0 : Math.sin(tt * (n.rate || 0.5) + n.ph) * wob); n.y = n.by + (n.t === 'root' ? 0 : Math.cos(tt * (n.rate || 0.5) * 0.8 + n.ph) * wob);
    });
    nodes.forEach(function (n) {                       // links
      if (!n.hub && n.t !== 'hub') return;
      const a = toScreen(n), b = toScreen(n.t === 'hub' ? nodes[0] : n.hub);
      ctx.globalAlpha = n.t === 'tool' ? 0.4 : n.t === 'hub' ? 0.35 : 0.22; ctx.strokeStyle = n.c; ctx.setLineDash(n.t === 'tool' ? [3, 4] : []);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    });
    nodes.forEach(function (n) {                       // shapes
      const p = toScreen(n), on = n === sel || n === hover;
      ctx.globalAlpha = 1;
      if (n.t === 'dot' || n.t === 'hub') { const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3); gl.addColorStop(0, hexa(n.c, on ? 0.7 : 0.4)); gl.addColorStop(1, hexa(n.c, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, TAU); ctx.fill(); }
      ctx.beginPath();
      if (n.t === 'root') { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; ctx.lineTo(p.x + p.r * 1.3 * Math.cos(a), p.y + p.r * 1.3 * Math.sin(a)); } ctx.closePath(); }
      else ctx.arc(p.x, p.y, p.r, 0, TAU);
      if (n.t === 'tool') { ctx.fillStyle = '#0c0e11'; ctx.fill(); ctx.setLineDash([2, 3]); ctx.strokeStyle = '#8a93a3'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]); }
      else if (n.t === 'hub') { ctx.fillStyle = '#05060a'; ctx.fill(); ctx.strokeStyle = n.c; ctx.lineWidth = 1.8; ctx.stroke(); }
      else { ctx.fillStyle = n.c; ctx.fill(); if (n.t === 'root') { ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 1.5; ctx.stroke(); } }
      if (n.t !== 'dot' || on) {                       // labels: the centre, rooms and tools always; a note only when picked or hovered
        ctx.fillStyle = on ? '#fff' : '#cfc9bd'; ctx.font = (n.t === 'root' ? '600 ' : '') + '11px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center';
        ctx.fillText(n.label, p.x, p.y + p.r + 14);
      }
    });
    ctx.globalAlpha = 1; dirty = false;
  }
  function frame(t) {
    if (!document.body.contains(cv)) return;           // the screen was left
    if (dirty || !reduce) draw(t);
    requestAnimationFrame(frame);
  }
  function at(ev) {
    const b = cv.getBoundingClientRect(), x = ev.clientX - b.left, y = ev.clientY - b.top;
    let best = null, bd = 18 * 18;
    nodes.forEach(function (n) { const p = toScreen(n), d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d < bd) { bd = d; best = n; } });
    return best;
  }
  function pick(n) {
    sel = n;
    card.hidden = !n; dirty = true;
    if (n) card.innerHTML = '<b>' + e(n.label) + '</b><span class="chip is-needs">sample</span><p>' + e(n.text) + '</p>';
  }
  cv.addEventListener('pointermove', function (ev) { const n = at(ev); if (n !== hover) { hover = n; cv.style.cursor = n ? 'pointer' : 'default'; dirty = true; } });
  cv.addEventListener('click', function (ev) { pick(at(ev)); });
  el.addEventListener('click', function (evt) {
    const t = evt.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-mode')) {
      mode = t.getAttribute('data-mode');
      Array.prototype.forEach.call(el.querySelectorAll('[data-mode]'), function (x) { x.setAttribute('aria-selected', String(x === t)); });
      build();
    } else if (t.hasAttribute('data-pick')) {
      const name = t.getAttribute('data-pick'); pick(nodes.filter(function (n) { return n.label === name; })[0] || null);
    }
  });
  if (window.ResizeObserver) { const ro = new ResizeObserver(function () { if (!document.body.contains(cv)) { ro.disconnect(); return; } size(); }); ro.observe(cv); }
  build(); size(); requestAnimationFrame(frame);
};
