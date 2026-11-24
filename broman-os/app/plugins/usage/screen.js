// usage: a small plain-JSON counter per feature, kept in this browser on this computer, and the screen shown at a limit.
// Nothing here makes a network call. "Connect with Troupe" shows the exact text and opens an email draft the person can edit or discard;
// this page never sends it. The limits come from plugins/usage/limits.json (baked into the build as BromanOS.data.usage).
// Other screens use BromanOS.store and BromanOS.limitCard when they are present, and work without them in the other variants.
BromanOS.store = (function () {
  const KEY = 'broman-trial-state', D = (BromanOS.data && BromanOS.data.usage) || { features: {}, trialDays: 0 };
  const LIST = { 'workflow-runs': 'runs', 'inbox-items': 'items', 'decisions': 'decisions' };   // the records each counted feature keeps
  let mem = null;
  const today = function () { return new Date().toISOString().slice(0, 10); };
  const save = function () { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch  { /* blocked storage: counters last for this visit only */ } };
  function load() {
    if (mem) return mem;
    try { const t = localStorage.getItem(KEY); if (t) mem = JSON.parse(t); } catch  { mem = null; }
    if (!mem || typeof mem !== 'object' || Array.isArray(mem)) mem = {};
    if (!mem.usage || typeof mem.usage !== 'object') mem.usage = {};
    Object.keys(D.features).forEach(function (k) { if (!(mem.usage[k] >= 0)) mem.usage[k] = 0; });
    ['runs', 'items', 'decisions', 'tasks'].forEach(function (k) { if (!Array.isArray(mem[k])) mem[k] = []; });
    if (!/^\d{4}-\d\d-\d\d$/.test(mem.trialStarted || '')) { mem.trialStarted = today(); save(); }
    return mem;
  }
  const used = function (f) { return load().usage[f] || 0; };
  const limit = function (f) { return D.features[f] ? D.features[f].limit : 0; };
  return {
    used: used, limit: limit, today: today,
    left: function (f) { return Math.max(0, limit(f) - used(f)); },
    atLimit: function (f) { return used(f) >= limit(f); },
    // the first of these features that has no room left, or '' when all have room
    full: function (list) { return list.filter(function (f) { return used(f) >= limit(f); })[0] || ''; },
    // keep one record and count it; refuses (false) when the feature is at its limit
    add: function (f, rec) {
      const s = load();
      if (used(f) >= limit(f)) return false;
      s[LIST[f]].push(rec); s.usage[f] = used(f) + 1; save();
      return true;
    },
    // a task is kept but is not a counted feature
    addTask: function (rec) { load().tasks.push(rec); save(); },
    list: function (name) { return load()[name].slice(); },
    counters: function () { const s = load(); return { usage: s.usage, trialStarted: s.trialStarted }; },
    trial: function () {
      const s = load(), n = Math.floor((Date.parse(today()) - Date.parse(s.trialStarted)) / 864e5) + 1, total = D.trialDays;
      return { day: Math.max(1, n), of: total, left: Math.max(0, total - Math.max(1, n) + 1), ended: n > total };
    },
    feature: function (f) { return D.features[f]; },
    features: function () { return Object.keys(D.features); },
  };
})();

// The text the "Connect with Troupe" draft holds. Shown in full before anything opens.
// feature: a counted feature that hit its limit; topic: instead, a thing the person asked about (for example "the CMO second mate")
BromanOS.connectText = function (feature, topic) {
  const D = BromanOS.data.usage, S = BromanOS.store, f = D.features[feature];
  const what = f ? 'I have reached the limit for "' + f.title + '" in my Broman OS trial (' + S.used(feature) + ' of ' + f.limit + ' ' + f.unit + ' used).'
    : topic ? 'I would like to hear about ' + topic + ' for my Broman OS trial.' : 'I would like to talk about my Broman OS trial.';
  return { subject: topic && !f ? 'Broman OS trial: a question about ' + topic : D.connect.subject + (f ? ': ' + f.title : ''),
    body: 'Hello Troupe,\n\n' + what + '\n\nBuild: Broman OS trial ' + D.version + '\nDate: ' + S.today() + '\n\n(Add your own note here, or delete this line.)' };
};

// The screen at a limit: what was used, and the optional Connect button. Call BromanOS.wireConnect(el) after inserting it.
BromanOS.escape = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
// the editable draft: the exact text, then "Open email draft" and "Copy text". Wired by BromanOS.wireConnect.
BromanOS.connectBox = function (feature, topic) {
  const t = BromanOS.connectText(feature, topic), esc = BromanOS.escape;
  return '<div class="us-connect" data-connect><b>Connect with Troupe for help</b><p class="note">This is exactly what the draft will hold. Change it here if you like.</p>' +
    '<label class="us-f">Subject<input data-c-subject value="' + esc(t.subject) + '"></label>' +
    '<label class="us-f">Message<textarea data-c-body rows="9">' + esc(t.body) + '</textarea></label>' +
    '<div class="acts"><button class="btn" type="button" data-c-open>Open email draft</button><button class="btn btn-2" type="button" data-c-copy>Copy text</button><span class="mono" data-c-said></span></div></div>';
};
BromanOS.limitCard = function (feature) {
  const e = BromanOS.escape, S = BromanOS.store, f = S.feature(feature);
  return '<section class="card us-limit" data-limit="' + e(feature) + '"><div class="card-head"><h3>You have used all of "' + e(f.title) + '"</h3><span class="chip is-usage">' + S.used(feature) + ' of ' + f.limit + ' used</span></div>' +
    '<p>This free trial includes ' + f.limit + ' ' + e(f.unit) + '. You have used them all, so this step is paused. Everything you have already made stays here.</p>' +
    '<p class="note">Want more? You can <b>optionally</b> connect with Troupe for help. Nothing is sent from this page. The button opens an email draft in your own mail app. You can edit it, send it, or close it.</p>' +
    BromanOS.connectBox(feature) + '</section>';
};
// the mailto: link for a draft; an empty recipient opens the draft with no "To", for the person to fill in
BromanOS.connectHref = function (subject, body) {
  return 'mailto:' + encodeURIComponent(BromanOS.data.usage.connect.to).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
};
BromanOS.wireConnect = function (el) {
  const box = el.querySelector('[data-connect]');
  if (!box) return;
  const text = function () { return box.querySelector('[data-c-subject]').value + '\n\n' + box.querySelector('[data-c-body]').value; };
  const said = function (s) { box.querySelector('[data-c-said]').textContent = s; };
  box.querySelector('[data-c-open]').addEventListener('click', function () {
    said('Opening a draft in your mail app. Nothing has been sent.');
    window.location.href = BromanOS.connectHref(box.querySelector('[data-c-subject]').value, box.querySelector('[data-c-body]').value);   // hands the text to the mail app; this page makes no request
  });
  box.querySelector('[data-c-copy]').addEventListener('click', function () {
    try { navigator.clipboard.writeText(text()).then(function () { said('Copied.'); }, function () { said('Could not copy. Select the text and copy it.'); }); } catch  { said('Could not copy. Select the text and copy it.'); }
  });
};

BromanOS.screens['usage/meter'] = function (el, data, h) {
  const e = h.esc, S = BromanOS.store, tr = S.trial();
  const rows = S.features().map(function (f) {
    const d = S.feature(f), n = S.used(f), pct = Math.min(100, Math.round(n / d.limit * 100)), full = S.atLimit(f);
    return '<div class="us-row" data-feature="' + e(f) + '"><div class="us-top"><b>' + e(d.title) + '</b><span class="chip ' + (full ? 'is-usage' : 'is-done') + '">' + n + ' of ' + d.limit + '</span></div>' +
      '<div class="meter" role="img" aria-label="' + n + ' of ' + d.limit + ' used"><i style="width:' + pct + '%"></i></div>' +
      '<div class="mono">' + (full ? 'All used. This step is paused.' : S.left(f) + ' ' + e(d.unit) + ' left') + '</div></div>';
  }).join('');
  const firstFull = S.full(S.features());
  el.innerHTML = '<div class="page-head"><div><h1>Usage</h1><p>A free trial with small limits. The counters live on this computer only.</p></div>' +
    '<div class="acts"><span class="chip ' + (tr.ended ? 'is-usage' : 'is-working') + '" data-trial>' + (tr.ended ? 'Free trial: ' + tr.of + ' days are over' : 'Free trial: day ' + tr.day + ' of ' + tr.of) + '</span></div></div>' +
    '<section class="card"><div class="card-head"><h3>What you have used</h3></div><div class="us-rows">' + rows + '</div>' +
    '<p class="note">No payment and no account. The trial length is shown for information; this version does not switch anything off when the days end.</p></section>' +
    '<section class="card"><div class="card-head"><h3>The counter file</h3><span class="mono more">plain JSON, in this browser</span></div><pre class="us-json" data-json>' + e(JSON.stringify(S.counters(), null, 2)) + '</pre>' +
    '<p class="note">This is the whole counter. It holds numbers and a start date, no names or messages. It is stored for the address you opened this page from, so open it from the same address each time.</p></section>' +
    (firstFull ? BromanOS.limitCard(firstFull) : '<section class="card"><div class="card-head"><h3>Need more?</h3></div><p class="note">When you reach a limit, this page offers an optional way to connect with Troupe for help. Nothing is sent unless you choose to send it yourself.</p></section>');
  BromanOS.wireConnect(el);
};
