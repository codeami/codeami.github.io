// Early-access form: posts straight to the Google Form named in waitlist.config.js.
// With placeholder values the button reads "Opening soon" and the form sends nothing.
(() => {
  const cfg = window.BROMAN_WAITLIST || {};
  const form = document.querySelector('form.wl-form');
  if (!form) return;
  const done = form.querySelector('.wl-done');
  const btn = form.querySelector('.wl-btn');
  const ready = [cfg.action, cfg.emailEntry, cfg.useEntry].every((v) => v && !v.includes('PLACEHOLDER'));

  if (!ready) {
    btn.textContent = 'Opening soon';
    btn.disabled = true;
    form.dataset.state = 'opening-soon';
    return;
  }

  form.action = cfg.action;
  form.querySelector('[name=email]').name = cfg.emailEntry;
  form.querySelector('[name=use]').name = cfg.useEntry;
  const sink = document.createElement('iframe');
  sink.name = 'wl-sink';
  sink.title = 'Sign-up receipt';
  sink.hidden = true;
  document.body.appendChild(sink);
  form.target = 'wl-sink';
  let sent = false;
  form.addEventListener('submit', () => { sent = true; });
  sink.addEventListener('load', () => {
    if (!sent) return;
    sent = false;
    form.querySelector('.wl-fields').hidden = true;
    done.textContent = 'You are on the list. We will email you once when your access is ready.';
    done.hidden = false;
  });
})();
