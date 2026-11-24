// decisions: the calls held for the owner, newest first, each with its report (read-only), the outreach drafts (buttons copy a line),
// and the AI-news proposals (yes / no / later, saved on this Mac through the local API).
BromanOS.screens['decisions/held'] = function (el, data, h) {
  const e = h.esc, PAGE = 20, items = data.items || [], state = { q: '', shown: PAGE };
  const age = function (i) { return i.ageDays == null ? '' : i.ageDays === 0 ? 'today' : i.ageDays + ' d'; };

  el.innerHTML = '<div class="page-head"><div><h1>Decisions</h1><p>Calls that are held for you to make, newest first.</p></div>' +
    '<div class="acts"><span class="chip ' + (data.total ? 'is-needs' : 'is-done') + '">' + (data.total || 0) + ' waiting</span></div></div>' +
    (data.own ? '<p class="note"><b>Samples.</b> The calls below are made-up examples. Your own decisions from the guided run are listed first.</p>'
      : '<p class="note"><b>Held calls are read-only.</b> Answers to them are given to ' + e(data.agent) + '; the list only shows what is held and where its report is.</p>') +
    (data.own ? '<section class="card" data-own><div class="card-head"><h3>Your decisions</h3><span class="mono more" data-own-count></span></div><div class="rows" data-own-list></div></section>' : '') +
    '<section class="dec"><div class="bar"><label class="field"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>' +
    '<input name="q" data-search placeholder="Search the calls" aria-label="Search the calls"></label></div>' +
    '<div class="card is-flush rows" data-list></div><div class="more-row"><span class="mono" data-count></span><button class="btn btn-2" type="button" data-more>Show more</button></div>' +
    '<p class="source"><b>Source:</b> the console\'s decisions list (' + (data.withReport || 0) + ' of ' + (data.shown || 0) + ' calls have a report on file).</p></section>';

  // AI news: proposals from the signal flow (scripts/signal.mjs). Needs the local server, because an answer is written to a log on this Mac.
  const sig = document.createElement('section');
  sig.className = 'dec-signal';
  sig.setAttribute('data-signal', '');
  el.querySelector('.dec').insertBefore(sig, el.querySelector('.bar'));
  const call = function (method, path, body) {
    return fetch(path, { method: method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.json().catch(function () { return { error: 'The server sent something unreadable.' }; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j; });
    });
  };
  const KIND = { read: 'Read', try: 'Try', post: 'Write a post', ignore: 'Ignore' };
  const sigHead = '<h2>AI news: proposed actions</h2>';
  const sigCard = function (i) {
    return '<article class="card dec-news" data-news="' + e(i.id) + '"><div class="dec-who"><span class="chip is-working">' + e(KIND[i.action.id] || i.action.id) + '</span>' +
      '<span class="chip">' + e(i.score) + '/10</span><span class="mono">' + e(i.source) + ' · ' + e(h.day(i.date)) + (i.laterAt ? ' · was set to later' : '') + '</span></div>' +
      '<h3><a href="' + h.href(i.url) + '" target="_blank" rel="noopener">' + e(i.title) + '</a></h3><p>' + e(i.summary) + '</p>' +
      '<p class="dec-act"><b>Suggested:</b> ' + e(i.action.text) + '</p><p class="note"><b>Why it scored ' + e(i.score) + ':</b> ' + e(i.reason) + '</p>' +
      '<div class="acts"><button class="btn btn-signal" type="button" data-say="yes">Yes</button><button class="btn btn-2" type="button" data-say="no">No</button>' +
      '<button class="btn btn-q" type="button" data-say="later">Later</button><span class="mono" data-said></span></div></article>';
  };
  const drawSignal = function (d, note) {
    const w = d.week.slice(0, 4), run = d.lastRun;
    sig.innerHTML = sigHead + '<div class="dec-bar"><button class="btn btn-2" type="button" data-fetch>Fetch today\'s feeds</button><span class="mono" data-fetch-note>' + e(note || (run ? 'Last run ' + run.at.slice(0, 16).replace('T', ' ') + ' UTC: ' + run.fresh + ' new, ' + run.proposed + ' proposed' : 'Not run yet on this Mac.')) + '</span></div>' +
      (d.pending.length ? d.pending.map(sigCard).join('') : h.empty('Nothing waiting', 'Items scoring ' + d.threshold + ' or more out of 10 appear here. Fetch the feeds to look for new ones.')) +
      (d.snoozed.length ? '<p class="note">' + d.snoozed.length + ' set to later; they come back after a few days.</p>' : '') +
      '<div class="card is-flush scroll-x"><table class="dec-week"><caption class="note">Weekly count (weeks start Monday)</caption><thead><tr><th>Week of</th><th>Came in</th><th>Reached you</th><th>You acted on</th><th>No</th><th>Later</th></tr></thead><tbody>' +
      (w.length ? w.map(function (r) { return '<tr><td>' + e(h.day(r.week)) + '</td><td>' + r.in + '</td><td>' + r.reached + '</td><td>' + r.acted + '</td><td>' + r.no + '</td><td>' + r.later + '</td></tr>'; }).join('') : '<tr><td colspan="6">No items yet.</td></tr>') + '</tbody></table></div>' +
      '<p class="mono dec-note">Nothing is sent or posted from here. Each answer is saved with its date on this Mac. Scoring rules: signal/scoring.json.</p>';
  };
  if (window.BROMAN_INBOX_API) {
    call('GET', '/api/signal').then(drawSignal, function (x) { sig.innerHTML = sigHead + '<p class="note">' + e(x.message) + '</p>'; });
    sig.addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-say],[data-fetch]');
      if (!b) return;
      b.disabled = true;
      if (b.hasAttribute('data-fetch')) {
        b.textContent = 'Fetching…';
        call('POST', '/api/signal/run', {}).then(function (d) { const c = d.counts; drawSignal(d, 'Fetched ' + c.fetched + ' items: ' + c.inWindow + ' recent, ' + c.fresh + ' new, ' + c.proposed + ' proposed to you.'); },
          function (x) { b.disabled = false; b.textContent = 'Fetch today\'s feeds'; sig.querySelector('[data-fetch-note]').textContent = x.message; });
        return;
      }
      const card = b.closest('[data-news]');
      call('POST', '/api/signal/decide', { id: card.getAttribute('data-news'), choice: b.getAttribute('data-say') }).then(function (d) { drawSignal(d, 'Saved: ' + b.getAttribute('data-say') + '.'); },
        function (x) { b.disabled = false; card.querySelector('[data-said]').textContent = x.message; });
    });
  } else {
    sig.innerHTML = sigHead + '<p class="note">This needs the local server, since an answer is written to a log on this Mac. Run <code>node serve.mjs full</code> and open the local address it prints (a tailnet address cannot save answers).</p>';
  }

  // outreach drafts: one card each. The buttons only copy an answer line for the one who acts; nothing is sent from here.
  const drafts = data.drafts || [];
  if (drafts.length) {
    const box = document.createElement('section');
    box.className = 'dec-drafts';
    box.innerHTML = '<h2>Outreach drafts</h2>' + drafts.map(function (d) {
      return '<article class="card dec-draft" data-draft="' + e(d.id) + '"><div class="dec-who"><b>' + e(d.prospect) + '</b>' +
        (d.fictional ? '<span class="chip is-needs">FICTIONAL SAMPLE</span>' : '') + '</div>' +
        '<ul class="dec-why">' + d.why.map(function (w) { return '<li>' + e(w) + '</li>'; }).join('') + '</ul>' +
        '<div class="dec-mail"><div class="mono">Subject: ' + e(d.email.subject) + '</div><pre>' + e(d.email.body) + '</pre></div>' +
        '<div class="acts"><button class="btn btn-signal" type="button" data-answer="Approve">Approve</button>' +
        '<button class="btn btn-2" type="button" data-answer="Edit">Edit</button>' +
        '<button class="btn btn-q" type="button" data-answer="Skip">Skip</button>' +
        '<span class="mono" data-said></span></div>' +
        '<p class="mono dec-note">Nothing sends. A button copies a line to give ' + e(data.agent) + '; you send approved drafts by hand.</p></article>';
    }).join('');
    el.querySelector('.dec').insertBefore(box, el.querySelector('.bar'));
    box.addEventListener('click', function (ev) {
      const b = ev.target.closest('[data-answer]');
      if (!b) return;
      const card = b.closest('[data-draft]'), line = b.getAttribute('data-answer') + ' outreach draft ' + card.getAttribute('data-draft');
      try { navigator.clipboard.writeText(line); } catch  { /* no clipboard: the line is still shown */ }
      card.querySelector('[data-said]').textContent = 'Copied: ' + line;
    });
  }

  if (data.own && BromanOS.store) {
    const mine = BromanOS.store.list('decisions').reverse(), S = BromanOS.store;
    el.querySelector('[data-own-count]').textContent = S.used('decisions') + ' of ' + S.limit('decisions') + ' used';
    el.querySelector('[data-own-list]').innerHTML = mine.length ? mine.map(function (d) {
      return '<div class="row"><div class="body"><div class="title">' + e(d.title) + '</div><div class="sub">' + e(h.day(d.at)) + '</div></div><div class="trail"><span class="chip ' + (d.answer === 'Yes' ? 'is-done' : 'is-paused') + '">' + e(d.answer) + '</span></div></div>';
    }).join('') : h.empty('None yet', 'Finish a guided run and your yes or no shows here.');
    if (S.atLimit('decisions') && BromanOS.limitCard) { el.querySelector('[data-own]').insertAdjacentHTML('afterend', BromanOS.limitCard('decisions')); BromanOS.wireConnect(el); }
  }

  const draw = function () {
    const needle = state.q.toLowerCase();
    const m = items.filter(function (i) { return !needle || (i.title + ' ' + i.question).toLowerCase().indexOf(needle) > -1; });
    el.querySelector('[data-list]').innerHTML = m.length ? m.slice(0, state.shown).map(function (i) {
      const rep = i.report ? (i.report.href ? '<a href="' + h.href(i.report.href) + '" target="_blank" rel="noopener">Report</a>' : '<span class="mono" title="' + e(i.report.path) + '">' + e(i.report.path) + '</span>') : '<span class="mono">no report</span>';
      return '<div class="row"><div class="body"><div class="title">' + e(i.title) + '</div><div class="sub">' + e(i.question) + '</div>' +
        '<div class="dec-meta">' + (i.set ? '<span class="mono">set ' + e(h.day(i.set)) + '</span>' : '') + (i.until ? '<span class="mono">until ' + e(h.day(i.until)) + '</span>' : '') + rep + '</div></div>' +
        (age(i) ? '<div class="trail"><span class="chip">' + e(age(i)) + '</span></div>' : '') + '</div>';
    }).join('') : h.empty('Nothing matches', items.length ? 'Clear the search.' : 'No held calls were found when this was built.');
    el.querySelector('[data-count]').textContent = 'Showing ' + Math.min(state.shown, m.length) + ' of ' + m.length;
    el.querySelector('[data-more]').hidden = m.length <= state.shown;
  };
  el.querySelector('[data-search]').addEventListener('input', function (ev) { state.q = ev.target.value.trim(); state.shown = PAGE; draw(); });
  el.querySelector('[data-more]').addEventListener('click', function () { state.shown += PAGE; draw(); });
  draw();
};
