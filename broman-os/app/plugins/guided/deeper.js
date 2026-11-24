// guided/deeper: after a run, three tracks to go deeper: Tech, Marketing, Business and legal. One short paragraph and one sample workflow name each.
// Concept only (nothing here is built in the trial).
BromanOS.screens['guided/deeper'] = function (el, data, h) {
  const e = h.esc, D = data.deeper, S = BromanOS.store, ran = S ? S.used('workflow-runs') : 0;
  el.innerHTML = '<div class="page-head"><div><h1>Go deeper</h1><p>' + e(D.intro) + '</p></div><div class="acts"><span class="chip is-needs">CONCEPT</span></div></div>' +
    '<div class="gd-say"><div class="gd-av">' + BromanOS.bosun() + '</div><div class="gd-bubble"><small class="mono">Bosun</small><h2>' + (ran ? 'Nice, you have run ' + ran + (ran === 1 ? ' workflow.' : ' workflows.') : 'Where next?') + '</h2><p>Pick the side that matters to you. You can come back to any of them.</p></div></div>' +
    '<div class="gd-grid">' + D.tracks.map(function (t) {
      return '<article class="card gd-card" data-track="' + e(t.id) + '"><b>' + e(t.title) + '</b><span class="gd-price">' + e(t.line) + '</span><span>' + e(t.text) + '</span>' +
        '<span class="mono">Sample workflow: ' + e(t.workflow) + '</span></article>';
    }).join('') + '</div><p class="note">' + e(D.note) + '</p><p><a class="btn btn-2" href="#guided/ask">Ask Bromni</a> <a class="btn btn-2" href="#guided/run">Guided run</a></p>';
};
