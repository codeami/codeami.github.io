// guided/run: "an email becomes a decision and a task", one step at a time: intake, summary, your yes or no, done.
// The summary is written here by plain rules, not by an AI model, so it is tagged Assisted and a person checks it. Nothing is sent.
// A finished run uses one workflow run, one inbox item and one decision of the free trial (BromanOS.store); at a limit the limit screen shows instead.
BromanOS.screens['guided/run'] = function (el, data, h) {
  const e = h.esc, S = BromanOS.store, FEATURES = ['workflow-runs', 'inbox-items', 'decisions'];
  let st = { step: 0, text: '', sum: null, answer: '', result: null };
  const NAMES = ['1. Intake', '2. Summary', '3. Your yes or no', '4. Done'];
  const DATE = /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}|\d{4}-\d\d-\d\d)\b/ig;
  const ASK = /\?|\b(please|could you|can you|would you|need|let me know|confirm|review|sign|send)\b/i;

  // plain rules, no model: sender and subject from the header lines, the sentences that ask something, any date words
  function summarise(text) {
    const lines = text.split(/\r?\n/);
    let from = '', subject = '';
    lines.forEach(function (l) {
      let m = /^from:\s*(.+)$/i.exec(l); if (m && !from) from = m[1].replace(/<[^>]*>/g, '').trim();
      m = /^subject:\s*(.+)$/i.exec(l); if (m && !subject) subject = m[1].trim();
    });
    const body = lines.filter(function (l) { return !/^(from|to|cc|date|subject):/i.test(l); }).join(' ').replace(/\s+/g, ' ').trim();
    const sentences = body.split(/(?<=[.?!])\s+/).filter(Boolean);
    const asks = sentences.filter(function (s) { return ASK.test(s); }).slice(0, 2);
    const dates = (body.match(DATE) || []).filter(function (d, i, a) { return a.indexOf(d) === i; }).slice(0, 2);
    return { who: from || 'Someone (no From line found)', subject: subject || (sentences[0] || '').slice(0, 80) || 'No subject', asks: asks.length ? asks : ['No clear question found. Read the email.'], when: dates.length ? dates.join(', ') : 'No date found' };
  }
  const taskLine = function (s) { return 'Reply to ' + s.who + ': ' + s.subject + (s.when.startsWith('No date') ? '' : ' (' + s.when + ')'); };

  const blocked = function () { return S.full(FEATURES); };
  function chrome(inner) {
    return '<div class="page-head"><div><h1>Guided run</h1><p>An email becomes a decision and a task. Sample data only; nothing is sent.</p></div>' +
      '<div class="acts"><span class="chip is-working" data-runs>' + S.used('workflow-runs') + ' of ' + S.limit('workflow-runs') + ' runs used</span></div></div>' +
      '<div class="gd-say"><div class="gd-av">' + BromanOS.bosun() + '</div><div class="gd-bubble" aria-live="polite">' + inner.say + '</div></div>' + inner.body +
      '<p class="note">The flow is drawn on the <a href="#workflow/canvas">Workflows</a> page.</p>';
  }
  const steps = function () {
    return '<div class="gd-dots" role="list">' + NAMES.map(function (n, i) { return '<span role="listitem" class="chip ' + (i === st.step ? 'is-working' : i < st.step ? 'is-done' : 'is-paused') + '"' + (i === st.step ? ' aria-current="step"' : '') + '>' + e(n) + '</span>'; }).join('') + '</div>';
  };

  function paint() {
    const full = blocked();
    if (full && st.step < 3) {                         // out of room: the limit screen instead of the run
      el.innerHTML = chrome({ say: '<h2>This step is paused</h2><p>You have used all of one part of the free trial. Everything you made is still here.</p>', body: BromanOS.limitCard(full) });
      BromanOS.wireConnect(el); return;
    }
    let out;
    if (st.step === 0) {
      out = { say: '<small class="mono">Step 1 of 4 · ' + 'Manual' + '</small><h2>Paste an email</h2><p>This is the intake. You paste it by hand; no mailbox is connected.</p>',
        body: steps() + '<div class="card gd-run"><label class="us-f">Email text<textarea data-email rows="10" placeholder="Paste an email here, or use the sample.">' + e(st.text) + '</textarea></label>' +
          '<div class="acts"><button class="btn btn-2" type="button" data-sample>Use the sample email</button><button class="btn" type="button" data-sum>Summarise</button></div></div>' };
    } else if (st.step === 1) {
      const s = st.sum;
      out = { say: '<small class="mono">Step 2 of 4 · Assisted</small><h2>Here is the summary</h2><p>Written by plain rules on this computer, not by an AI model. Please check it against the email before you go on.</p>',
        body: steps() + '<div class="card gd-run" data-summary><div class="card-head"><h3>Summary</h3><span class="chip is-acts-assisted" data-acts="assisted">Assisted</span></div><dl class="gd-dl"><div><dt>Who</dt><dd>' + e(s.who) + '</dd></div><div><dt>About</dt><dd>' + e(s.subject) + '</dd></div>' +
          '<div><dt>Asks</dt><dd>' + s.asks.map(e).join('<br>') + '</dd></div><div><dt>When</dt><dd>' + e(s.when) + '</dd></div></dl>' +
          '<label class="gd-check"><input type="checkbox" data-checked> I checked it against the email</label><div class="acts"><button class="btn btn-2" type="button" data-back>Back</button><button class="btn" type="button" data-ask disabled>Next</button></div></div>' };
    } else if (st.step === 2) {
      out = { say: '<small class="mono">Step 3 of 4 · Your decision</small><h2>Make a task from this email?</h2><p>This is the one step that needs you. Only you know if it needs doing.</p>',
        body: steps() + '<div class="card gd-run"><p><b>' + e(taskLine(st.sum)) + '</b></p><div class="acts"><button class="btn btn-signal" type="button" data-yes>Yes, make a task</button><button class="btn btn-2" type="button" data-no>No, leave it</button></div></div>' };
    } else {
      const r = st.result;
      out = { say: '<small class="mono">Step 4 of 4 · Done</small><h2>' + (r.task ? 'Done: a task was made' : 'Done: no task, decision kept') + '</h2><p>' + (r.task ? 'Your yes became a task. It is kept on this computer and not sent anywhere.' : 'Your no is kept as a decision. No task was made.') + '</p>',
        body: steps() + '<div class="card gd-run" data-done>' + (r.task ? '<p><b>Task:</b> ' + e(r.task) + '</p>' : '') + '<p class="note">Kept: this email in <a href="#inbox/stream">Inbox</a>, your answer in <a href="#decisions/held">Decisions</a>. Run ' + S.used('workflow-runs') + ' of ' + S.limit('workflow-runs') + ' used.</p>' +
          '<div class="acts"><button class="btn" type="button" data-again>Start another run</button></div></div>' };
    }
    el.innerHTML = chrome(out);
  }

  el.addEventListener('click', function (evt) {
    const t = evt.target.closest('button'); if (!t) return;
    const ta = el.querySelector('[data-email]');
    if (t.hasAttribute('data-sample')) { st.text = data.sampleEmail; ta.value = st.text; return; }
    if (t.hasAttribute('data-sum')) { st.text = ta.value.trim(); if (!st.text) { ta.focus(); return; } st.sum = summarise(st.text); st.step = 1; }
    else if (t.hasAttribute('data-back')) st.step = 0;
    else if (t.hasAttribute('data-ask')) st.step = 2;
    else if (t.hasAttribute('data-yes') || t.hasAttribute('data-no')) {
      const yes = t.hasAttribute('data-yes'), full = blocked();
      if (full) { paint(); return; }
      const now = new Date().toISOString(), id = 'run-' + Date.now();
      S.add('workflow-runs', { id: id, at: now, title: st.sum.subject });
      S.add('inbox-items', { kind: 'mail', source: 'Your email (sample)', date: now.slice(0, 10), title: st.sum.subject, summary: st.sum.asks.join(' '), url: '', saved: true });
      S.add('decisions', { id: id, at: now, title: 'Make a task from: ' + st.sum.subject, answer: yes ? 'Yes' : 'No' });
      const task = yes ? taskLine(st.sum) : '';
      if (task) S.addTask({ id: id, at: now, title: task });
      st.result = { task: task }; st.step = 3;
    } else if (t.hasAttribute('data-again')) { st = { step: 0, text: '', sum: null, answer: '', result: null }; }
    else return;
    paint();
  });
  el.addEventListener('change', function (ev) { if (ev.target.hasAttribute('data-checked')) el.querySelector('[data-ask]').disabled = !ev.target.checked; });
  paint();
};
