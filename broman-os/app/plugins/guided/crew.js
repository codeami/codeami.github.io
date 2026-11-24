// guided/crew: Bromni at the top, four scout panes like terminal windows, and dotted ghost modules for the second mates that are not in the plan yet.
// SAMPLE in this version: no agent runs. Starting "Ask Bromni" sets BromanOS.crew = { t0, plan }, and the panes play written progress lines from that moment,
// slower or faster by the plan's scoutMs. A ghost opens the optional "Connect with Troupe" draft (same rule: nothing is sent from this page).
BromanOS.crew = null;
BromanOS.screens['guided/crew'] = function (el, data, h) {
  const e = h.esc, C = data.crew;
  let timer = null;
  const run = function () { return BromanOS.crew; };

  // how far each scout is: lines shown so far, and whether it is done
  function progress(s, i) {
    const r = run();
    if (!r) return { n: 0, state: 'idle' };
    const step = r.plan.scoutMs, at = Math.floor((Date.now() - r.t0 - i * step * 0.4) / step) + 1, n = Math.max(0, Math.min(s.lines.length, at));
    return { n: n, state: n >= s.lines.length ? 'done' : n > 0 ? 'running' : 'waiting' };
  }
  function pane(s, i) {
    const p = progress(s, i), r = run();
    const chip = p.state === 'done' ? '<span class="chip is-done" data-state="done">done</span>' : p.state === 'running' ? '<span class="chip is-working" data-state="running">running</span>' : '<span class="chip is-paused" data-state="' + p.state + '">' + p.state + '</span>';
    return '<article class="cr-pane" data-scout="' + (i + 1) + '"><header><b>' + e(s.name) + '</b><span class="mono">' + e(s.task) + '</span>' + chip + '</header>' +
      '<div class="mono cr-plan">' + (r ? 'plan: ' + e(r.plan.name) : 'plan: not started') + '</div>' +
      '<pre class="cr-term">' + (p.n ? s.lines.slice(0, p.n).map(function (l, k) { return '<span' + (k === p.n - 1 && p.state === 'running' ? ' class="cr-now"' : '') + '>&gt; ' + e(l) + '</span>'; }).join('') : '<span class="cr-idle">' + e(C.idle) + '</span>') + '</pre></article>';
  }
  function ghost(g) {
    return '<button class="cr-ghost" type="button" data-ghost="' + e(g.id) + '" aria-label="' + e(g.name + ', ' + C.locked) + '"><svg class="cr-lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z"/></svg><b>' + e(g.name) + '</b><span class="mono">' + e(g.role) + '</span>' +
      '<span>' + e(g.text) + '</span><span class="chip is-paused">' + e(C.locked) + '</span></button>';
  }
  function paintPanes() { el.querySelector('[data-panes]').innerHTML = C.scouts.map(pane).join(''); }

  const r0 = run();
  el.innerHTML = '<div class="page-head"><div><h1>Crew</h1><p>Your assistant and the helpers it calls. A sample in this trial.</p></div><div class="acts"><span class="chip is-needs">SAMPLE</span></div></div>' +
    '<div class="gd-say"><div class="gd-av">' + BromanOS.bosun() + '</div><div class="gd-bubble"><small class="mono">Bromni, through Bosun</small><h2>' + (r0 ? 'The scouts are on it' : 'The crew is waiting') + '</h2><p>' +
    (r0 ? 'I gave the job to four scouts. Watch them work, then answer on <a href="#guided/ask">Ask Bromni</a>.' : 'Ask me something and four scouts start work. <a href="#guided/ask">Start Ask Bromni</a>.') + '</p></div></div>' +
    '<p class="note">' + e(C.note) + '</p><section aria-label="Scouts"><div class="cr-grid" data-panes></div></section>' +
    '<section aria-label="Not in your plan yet"><div class="card-head"><h3>Not in your plan yet</h3></div><div class="cr-ghosts">' + C.ghosts.map(ghost).join('') + '</div><div data-connect-slot></div></section>';
  paintPanes();
  timer = setInterval(function () {
    if (!document.body.contains(el) || !el.querySelector('[data-panes]')) { clearInterval(timer); return; }
    paintPanes();
  }, 400);
  el.addEventListener('click', function (evt) {
    const g = evt.target.closest('[data-ghost]'); if (!g) return;
    const spec = C.ghosts.filter(function (x) { return x.id === g.getAttribute('data-ghost'); })[0];
    el.querySelector('[data-connect-slot]').innerHTML = '<section class="card us-limit" data-ghost-card="' + e(spec.id) + '"><div class="card-head"><h3>' + e(spec.name) + ': ' + e(spec.role) + '</h3><span class="chip is-paused">' + e(C.locked) + '</span></div>' +
      '<p>' + e(spec.text) + ' It is not part of this trial.</p><p class="note">Curious? You can <b>optionally</b> connect with Troupe. Nothing is sent from this page. The button opens an email draft in your own mail app, which you can edit, send or close.</p>' +
      BromanOS.connectBox('', 'the ' + spec.name + ' (' + spec.role + ')') + '</section>';
    BromanOS.wireConnect(el);
    el.querySelector('[data-ghost-card]').scrollIntoView({ block: 'nearest' });
  });
};
