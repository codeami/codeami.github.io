// guided/start: Bosun, the small mascot, walks the person through five steps: welcome, what this is, connect tools (shown as steps only),
// add an AI assistant (cheapest plans, with the date the prices were checked), and four how-to cards. Nothing here connects to anything.
// BromanOS.bosun() is the mascot (public site asset bosun.svg, inlined so it takes the page's colours); the guided run uses it too.
BromanOS.bosun = function () {
  return '<svg class="bosun" viewBox="0 0 100 100" role="img" aria-label="Bosun, a small robot in a sailor cap holding a signal flag">' +
    '<style>.bs-i{fill:none;stroke:var(--ink)}.bs-s{fill:var(--surface);stroke:var(--ink)}.bs-a{fill:var(--accent);stroke:var(--ink)}.bs-p{fill:var(--pop);stroke:var(--ink)}.bs-e{fill:var(--ink)}.bs-g{fill:var(--surface)}.bs-d{fill:var(--pop)}</style>' +
    '<line class="bs-i" x1="50" y1="19" x2="50" y2="5" stroke-width="3" stroke-linecap="round"/><path class="bs-p" d="M50 5h17l-4.5 5 4.5 5H50z" stroke-width="2" stroke-linejoin="round"/>' +
    '<path class="bs-s" d="M25 33Q50 10 75 33Z" stroke-width="3" stroke-linejoin="round"/><rect class="bs-s" x="18" y="31" width="64" height="47" rx="17" stroke-width="3"/>' +
    '<rect class="bs-a" x="21" y="28" width="58" height="9" rx="4.5" stroke-width="2"/><circle class="bs-e" cx="38" cy="54" r="6"/><circle class="bs-e" cx="62" cy="54" r="6"/>' +
    '<circle class="bs-g" cx="40" cy="52" r="2"/><circle class="bs-g" cx="64" cy="52" r="2"/><path class="bs-i" d="M41 66Q50 73 59 66" stroke-width="3" stroke-linecap="round"/>' +
    '<rect class="bs-a" x="32" y="80" width="36" height="16" rx="6" stroke-width="3"/><circle class="bs-d" cx="50" cy="88" r="3"/></svg>';
};

BromanOS.screens['guided/start'] = function (el, data, h) {
  const e = h.esc, J = data.journey, steps = J.steps;
  let at = 0;
  const S = BromanOS.store, tr = S && S.trial();
  const list = function (a) { return '<ul class="gd-list">' + a.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>'; };

  function body(s) {
    if (s.points) return list(s.points);
    if (s.connectors) return '<div class="gd-grid">' + s.connectors.map(function (c) {
      return '<div class="card gd-card"><b>' + e(c.name) + '</b><span class="chip is-paused">not connected</span><ol class="gd-steps">' + c.steps.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ol></div>';
    }).join('') + '</div><p class="note">' + e(s.note) + '</p>';
    if (s.plans) return '<p class="mono">Prices checked ' + e(s.checked) + '</p><div class="gd-grid">' + s.plans.map(function (p) {
      return '<div class="card gd-card" data-plan><b>' + e(p.name) + '</b><span class="gd-price">' + e(p.price) + '</span><span>' + e(p.text) + '</span><span class="mono">Source: ' + e(p.source) + '</span></div>';
    }).join('') + '</div><p class="note">' + e(s.note) + '</p>';
    if (s.cards) return '<div class="gd-grid">' + s.cards.map(function (c) { return '<div class="card gd-card" data-concept><b>' + e(c.title) + '</b><span>' + e(c.text) + '</span></div>'; }).join('') + '</div>' +
      '<p><a class="btn" href="#guided/run">Try the guided run</a></p>';
    return '';
  }

  function paint() {
    const s = steps[at];
    el.innerHTML = '<div class="page-head"><div><h1>Start here</h1><p>' + e(J.trialLine) + '</p></div>' +
      (tr ? '<div class="acts"><span class="chip is-working" data-trial>Free trial: day ' + tr.day + ' of ' + tr.of + '</span></div>' : '') + '</div>' +
      '<div class="gd-say"><div class="gd-av">' + BromanOS.bosun() + '</div><div class="gd-bubble" aria-live="polite"><small class="mono">Bosun, step ' + (at + 1) + ' of ' + steps.length + '</small><h2>' + e(s.title) + '</h2><p>' + e(s.say) + '</p></div></div>' +
      '<div class="gd-body">' + body(s) + '</div>' +
      '<div class="gd-nav"><button class="btn btn-2" type="button" data-back' + (at === 0 ? ' disabled' : '') + '>Back</button>' +
      '<div class="gd-dots" role="group" aria-label="Jump to step">' + steps.map(function (x, i) { return '<button class="wf-dot' + (i < at ? ' is-past' : '') + '" type="button" data-step="' + i + '"' + (i === at ? ' aria-current="step"' : '') + ' aria-label="Step ' + (i + 1) + ': ' + e(x.title) + '"><i></i></button>'; }).join('') + '</div>' +
      '<button class="btn" type="button" data-next' + (at === steps.length - 1 ? ' disabled' : '') + '>Next</button></div>';
  }
  el.addEventListener('click', function (evt) {
    const t = evt.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-next')) at = Math.min(steps.length - 1, at + 1);
    else if (t.hasAttribute('data-back')) at = Math.max(0, at - 1);
    else if (t.hasAttribute('data-step')) at = +t.getAttribute('data-step');
    else return;
    paint();
  });
  paint();
};
