// guided/ask: "Ask Bromni", a second guided sample workflow. One plain message (prefilled), the AI plan the person has, a SAMPLE result from the
// Research scout that differs a little by plan, a yes / change / no, a sample "done" card from the Builder, and the answer logged in Decisions.
// Nothing is asked of any assistant, searched or built; no request is made. A finished run uses one workflow run and one decision of the trial.
BromanOS.screens['guided/ask'] = function (el, data, h) {
  const e = h.esc, S = BromanOS.store, A = data.ask, FEATURES = ['workflow-runs', 'decisions'];
  let st = { step: 0, msg: A.message, plan: A.plans[0].id, answer: '', note: '' };
  const plan = function () { return A.plans.filter(function (p) { return p.id === st.plan; })[0]; };
  const NAMES = ['1. You ask', '2. Scout result', '3. Done'];
  const steps = function () {
    return '<div class="gd-dots" role="list">' + NAMES.map(function (n, i) { return '<span role="listitem" class="chip ' + (i === st.step ? 'is-working' : i < st.step ? 'is-done' : 'is-paused') + '"' + (i === st.step ? ' aria-current="step"' : '') + '>' + e(n) + '</span>'; }).join('') + '</div>';
  };
  const chrome = function (say, body) {
    return '<div class="page-head"><div><h1>Ask Bromni</h1><p>One message, a sample result, your call. Sample data only; nothing is sent.</p></div>' +
      '<div class="acts"><span class="chip is-working" data-runs>' + S.used('workflow-runs') + ' of ' + S.limit('workflow-runs') + ' runs used</span></div></div>' +
      '<div class="gd-say"><div class="gd-av">' + BromanOS.bosun() + '</div><div class="gd-bubble" aria-live="polite">' + say + '</div></div>' + body +
      '<p class="note">The flow is drawn on the <a href="#workflow/canvas">Workflows</a> page.</p>';
  };
  const tag = function (a, label) { return '<span class="chip is-acts-' + a + '" data-acts="' + a + '">' + e(label) + '</span>'; };

  function paint() {
    const full = S.full(FEATURES);
    if (full && st.step < 2) {
      el.innerHTML = chrome('<h2>This step is paused</h2><p>You have used all of one part of the free trial. Everything you made is still here.</p>', BromanOS.limitCard(full));
      BromanOS.wireConnect(el); return;
    }
    if (st.step === 0) {
      el.innerHTML = chrome('<small class="mono">Step 1 of 3 · Manual</small><h2>Ask one thing</h2><p>Type one plain message, then pick the AI plan you have. The plan changes how deep and how fast the answer is.</p>',
        steps() + '<div class="card gd-run"><label class="us-f">Your message<textarea data-msg rows="3">' + e(st.msg) + '</textarea></label>' +
        '<fieldset class="gd-plans"><legend>Your AI plan <span class="mono">(prices checked ' + e(A.checked) + ')</span></legend>' + A.plans.map(function (p) {
          return '<label class="gd-plan"><input type="radio" name="plan" value="' + e(p.id) + '"' + (p.id === st.plan ? ' checked' : '') + '><span><b>' + e(p.name) + '</b><span class="mono">' + e(p.price) + '</span></span></label>';
        }).join('') + '</fieldset><div class="acts"><button class="btn" type="button" data-go>Ask Bromni</button></div></div>');
    } else if (st.step === 1) {
      const p = plan();
      el.innerHTML = chrome('<small class="mono">Step 2 of 3 · Research scout</small><h2>The scout is back</h2><p>Here is a sample of what it could bring back on ' + e(p.name) + '. Then it is your call.</p>',
        steps() + '<div class="card gd-run" data-result><div class="card-head"><h3>Research scout ' + tag('autonomous', 'Autonomous') + '</h3><span class="chip is-needs">SAMPLE</span></div>' +
        '<p class="mono">' + e(p.depth) + ' · ' + e(p.speed) + ' · ' + p.sources + ' sources read (sample) · ' + e(p.cost) + '</p><ol class="gd-steps">' + p.lines.map(function (l) { return '<li>' + e(l) + '</li>'; }).join('') + '</ol>' +
        '<p><b>Suggested:</b> ' + e(p.pick) + '</p><p class="note">' + e(A.note) + ' Watch the four scouts on the <a href="#guided/crew">Crew</a> screen.</p></div>' +
        '<div class="card gd-run"><div class="card-head"><h3>Your call</h3>' + tag('manual', 'Manual') + '</div><label class="us-f">If you want a change, say what (optional)<input data-note placeholder="for example: only free options" value="' + e(st.note) + '"></label>' +
        '<div class="acts"><button class="btn btn-signal" type="button" data-answer="Yes">Yes</button><button class="btn btn-2" type="button" data-answer="Change">Change</button><button class="btn btn-q" type="button" data-answer="No">No</button></div></div>');
    } else {
      const yes = st.answer !== 'No';
      el.innerHTML = chrome('<small class="mono">Step 3 of 3 · Done</small><h2>' + (yes ? 'Done: a sample build' : 'Done: no build, decision kept') + '</h2><p>' + (yes ? 'The Builder made a sample done card. A person checks it before it is used.' : 'Your no is kept. Nothing was built.') + '</p>',
        steps() + '<div class="card gd-run" data-done>' + (yes ? '<div class="card-head"><h3>Builder ' + tag('assisted', 'Assisted') + '</h3><span class="chip is-needs">SAMPLE</span></div><p><b>Sample done card:</b> ' + e(plan().pick.replace(/\.$/, '')) + (st.answer === 'Change' && st.note ? '. Changed as you asked: ' + e(st.note) : '') + '.</p>' : '') +
        '<p class="note">Logged in <a href="#decisions/held">Decisions</a> as "' + e(st.answer) + '". Run ' + S.used('workflow-runs') + ' of ' + S.limit('workflow-runs') + ' used.</p>' +
        '<div class="acts"><a class="btn" href="#guided/deeper" data-deeper>Go deeper</a><button class="btn btn-2" type="button" data-again>Ask something else</button></div></div>');
    }
  }
  el.addEventListener('click', function (evt) {
    const t = evt.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-go')) {
      st.msg = el.querySelector('[data-msg]').value.trim(); if (!st.msg) { el.querySelector('[data-msg]').focus(); return; }
      st.plan = (el.querySelector('input[name=plan]:checked') || {}).value || st.plan; st.step = 1;
      BromanOS.crew = { t0: Date.now(), plan: plan() };   // lights up the scout panes on the Crew screen
    } else if (t.hasAttribute('data-answer')) {
      if (S.full(FEATURES)) { paint(); return; }
      st.answer = t.getAttribute('data-answer'); st.note = el.querySelector('[data-note]').value.trim();
      const now = new Date().toISOString(), id = 'ask-' + Date.now();
      S.add('workflow-runs', { id: id, at: now, title: 'Ask Bromni: ' + st.msg.slice(0, 60) });
      S.add('decisions', { id: id, at: now, title: 'Ask Bromni (' + plan().name + '): ' + st.msg.slice(0, 80), answer: st.answer });
      st.step = 2;
    } else if (t.hasAttribute('data-again')) st = { step: 0, msg: A.message, plan: st.plan, answer: '', note: '' };
    else return;
    paint();
  });
  paint();
};
