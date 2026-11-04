/* The site's frame and skin toggle. nav.js or article.js loads this file and has
   already set data-skin on <html>.
   The frame is Chart & Cards: the live second brain (brain/graph.js) is the base
   layer of every page, and the page reads as a card over it (chartAndCards() below).
   A kit page's .k-nav header stays on top as the site tabs; an older nav.js page
   carries its own header inside the card. */
(function () {
  var root = document.documentElement;
  var base = document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, "") : "";
  function skin() { return root.getAttribute("data-skin") === "matrix" ? "matrix" : "hud"; }

  function bindToggle() {
    var btns = document.querySelectorAll("#theme, button.theme");
    function label() {
      var m = skin() === "matrix";
      btns.forEach(function (b) {
        b.textContent = m ? "HUD" : "Matrix";
        b.setAttribute("aria-label", m ? "Switch to the HUD colours" : "Switch to the Matrix green colours");
        b.setAttribute("aria-pressed", m ? "true" : "false");
      });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var next = skin() === "matrix" ? "hud" : "matrix";
        root.setAttribute("data-skin", next);
        try { localStorage.setItem("skin", next); } catch (e) { /* storage blocked: lasts for this page only */ }
        label();
      });
    });
    label();
  }

  /* Top bar extras, the same on every page: the site version, Course and Second Brain
     tabs, a link up to the whoami home (the folder above this one) and the GitHub repo. */
  var VERSION = "v1.0", REPO = "https://github.com/codeami/codeami.github.io";
  function chrome() {
    var bar = document.querySelector(".k-nav, header.top");
    if (!bar || bar.querySelector(".vtag") || bar.classList.contains("tb")) return; // the one top bar carries its own links
    var home = bar.querySelector(".k-home, .where");
    var v = document.createElement("span");
    v.className = "vtag"; v.textContent = VERSION; v.title = "AI-Life-OS " + VERSION;
    if (home) home.parentNode.insertBefore(v, home.nextSibling);
    var toggle = bar.querySelector("#theme, button.theme");
    var at = toggle ? toggle.parentNode : bar;
    var up = document.createElement("a");
    up.className = "up"; up.href = base + "../"; up.textContent = "whoami";
    up.title = "Ashish Raina: home";
    var gh = document.createElement("a");
    gh.className = "gh"; gh.href = REPO; gh.setAttribute("aria-label", "GitHub: this site's source");
    gh.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg><span>GitHub</span>';
    // A page may already carry these tabs in its own markup (the whoami home does, for readers without scripts).
    if (!bar.querySelector('a[href$="course/index.html"]')) {
      var co = document.createElement("a");
      co.className = "up"; co.href = base + "course/index.html"; co.textContent = "Course";
      at.insertBefore(co, toggle || null);
    }
    if (!bar.querySelector('a[href$="brain/index.html"]')) {
      var sb = document.createElement("a");
      sb.className = "up"; sb.href = base + "brain/index.html"; sb.textContent = "Second Brain";
      at.insertBefore(sb, toggle || null);
    }
    // The whoami home itself loads this file from its subfolder: no link to itself there.
    if (new URL(up.href).pathname !== location.pathname.replace(/index\.html$/, "")) at.insertBefore(up, toggle || null);
    at.insertBefore(gh, toggle || null);
  }

  /* Chart & Cards: the second brain under the page, the page as a card over it.
     A link to another kit page swaps the card in place when that page has no inline
     script or style of its own; otherwise the browser goes there, and that page opens
     in the same frame. Every page keeps its own URL. */
  function chartAndCards() {
    var B = base + "brain/", nav = document.querySelector(".k-nav"), G = null;
    root.classList.add("brain"); document.body.classList.add("framed");
    var css = document.createElement("link"); css.rel = "stylesheet"; css.href = B + "frame.css"; document.head.appendChild(css);
    function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
    var ov = mk("section"); ov.id = "pageov"; ov.setAttribute("aria-label", "Page");
    var bar = mk("div", "pov-bar"), title = mk("span", "pov-t"), min = mk("button", "pov-btn"), x = mk("button", "pov-btn", "✕");
    min.type = x.type = "button"; x.setAttribute("aria-label", "Close the page and show the whole map");
    var body = mk("div", "pov-body"), reopen = mk("button", "pov-btn", "▴ Show page"); reopen.id = "povOpen"; reopen.type = "button"; reopen.hidden = true;
    bar.appendChild(title); bar.appendChild(min); bar.appendChild(x); ov.appendChild(bar); ov.appendChild(body);
    [].slice.call(document.body.childNodes).forEach(function (n) { if (n !== nav && n.nodeName !== "SCRIPT") body.appendChild(n); });
    document.body.appendChild(ov); document.body.appendChild(reopen);
    var state = "open", held = null; // open | min | closed
    /* The landing (meta calm-landing) opens on the chart alone, with the page one tap away.
       A deep link to a step opens the page; otherwise the visitor's last pick (open or closed) is kept in this browser. */
    var calm = !!document.querySelector('meta[name="calm-landing"]');
    function remember(v) { try { localStorage.setItem("landing-page", v); } catch (e) { /* storage blocked: the pick lasts for this visit only */ } }
    if (calm) {
      var kept = null;
      try { kept = localStorage.getItem("landing-page"); } catch (e) { /* storage blocked: calm by default */ }
      // A first visit (no "trip:v1" yet, no address hash) opens on the landing hook, so the card starts open.
      var tripped = true;
      try { tripped = !!localStorage.getItem("trip:v1"); } catch (e) { /* storage blocked: stay calm */ }
      state = /^#(step-|explain|whoami|me|trip)/.test(location.hash) || kept === "open" || (!tripped && !location.hash) ? "open" : "closed";
    }
    function phone() { return window.innerWidth <= 760; }
    function layout() {
      document.body.style.setProperty("--navh", (nav ? nav.offsetHeight : 0) + "px");
      title.textContent = document.title.split(" · ")[0];
      ov.hidden = state === "closed"; reopen.hidden = state !== "closed";
      ov.classList.toggle("min", state === "min");
      min.textContent = state === "min" ? "▴ Show" : "▾ Minimise";
      min.setAttribute("aria-label", state === "min" ? "Show the page" : "Minimise the page to see the map");
      document.body.classList.toggle("ovopen", state === "open");
      if (G) { G.overlay(state === "open" && !phone()); G.setInsets(state === "open" && phone() ? ov.offsetHeight : 0); }
    }
    function set(s) { state = s; layout(); }
    min.onclick = function () { set(state === "min" ? "open" : "min"); };
    x.onclick = function () {
      set("closed"); reopen.focus();
      if (calm) { remember("closed"); try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* sandbox may refuse */ } }
    };
    reopen.onclick = function () { set("open"); if (calm) remember("open"); };
    // "Explain this" on the landing: open the page and tell it to start the journey
    function explain() { set("open"); remember("open"); window.dispatchEvent(new Event("explain")); }
    window.addEventListener("resize", layout);
    // the tour folds the card away for the map's steps, and puts it back as it was
    function shown(on) { if (!on) { if (held === null) held = state; if (state === "open") set("min"); } else if (held !== null) { set(held); held = null; } }

    /* share.json (site root): pages that are not public are hidden but not deleted. A post list drops their entries.
       A link to a retired page goes to its 'into' page, and the retired page itself opens with a one-line notice.
       A link-only page keeps its links and gets a noindex meta. */
    var gone = [], siteRoot = new URL(base + "../", location.href).pathname;
    function pathOf(u) { var p = u.pathname; return p.charAt(p.length - 1) === "/" ? p + "index.html" : p; }
    function entry(u) { for (var i = 0; i < gone.length; i++) if (siteRoot + gone[i].path === pathOf(u)) return gone[i]; return null; }
    function intoUrl(e) { return /^https?:/.test(e.into) ? e.into : siteRoot + e.into; }
    function retire(scope) {
      if (!gone.length) return;
      [].forEach.call(scope.querySelectorAll("a[href]"), function (a) {
        var e = entry(new URL(a.href, location.href)); if (!e) return;
        var li = a.closest(".post-list li");
        if (li) li.remove(); else if (e.level === "retired") a.href = intoUrl(e);
      });
    }
    function notice() {
      var e = entry(location), old = body.querySelector(".retired-note");
      if (old) old.remove();
      if (!e) return;
      if (!document.querySelector('meta[name="robots"]')) { var m = mk("meta"); m.name = "robots"; m.content = "noindex"; document.head.appendChild(m); }
      if (e.level !== "retired") return;
      var p = mk("p", "retired-note"), a = mk("a", "", e.label);
      p.setAttribute("role", "note"); a.href = intoUrl(e);
      p.appendChild(document.createTextNode("Retired " + e.since + ": " + e.why + " ")); p.appendChild(a); p.appendChild(document.createTextNode("."));
      body.insertBefore(p, body.firstChild);
    }
    function settle() { retire(body); if (nav) retire(nav); notice(); }
    fetch(base + "../share.json").then(function (r) { return r.ok ? r.json() : { pages: [] }; })
      .then(function (j) { gone = (j.pages || []).filter(function (e) { return e.level !== "public"; }); settle(); }).catch(function () { /* no list: nothing is hidden */ });

    function framed(doc) { return doc.querySelector(".k-nav") && !doc.querySelector("script:not([src])"); }
    var swappable = framed(document);
    // the header stays while the URL changes under it: pin its relative links and images to absolute URLs
    function pin() { if (nav) [].forEach.call(nav.querySelectorAll("a[href], img[src]"), function (n) { if (n.href) n.setAttribute("href", n.href); else n.setAttribute("src", n.src); }); }
    pin();
    // the page's own style tags travel with it; marked now, before drawer.js and tour.js add theirs
    [].forEach.call(document.querySelectorAll("head style"), function (s) { s.setAttribute("data-page", ""); });
    function go(url) {
      var u = new URL(url, location.href);
      if (u.origin !== location.origin) return false; // public projects open from their card
      // A link to the page the reader is already on never reloads it: it opens the card, and a page that listens
      // for "samepage" (the landing) shows its own first section.
      if (pathOf(u) === pathOf(location)) {
        if (u.hash) location.hash = u.hash; else { body.scrollTop = 0; window.dispatchEvent(new Event("samepage")); }
        set("open"); if (calm) remember("open"); if (G) G.select(u.href);
        return true;
      }
      fetch(u.href).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        if (!framed(doc) || !swappable) { location.href = u.href; return; }
        history.pushState(null, "", u.href); // first, so the new page's relative links resolve from its own URL
        document.title = doc.title; body.textContent = "";
        [].forEach.call(document.querySelectorAll("head style[data-page]"), function (s) { s.remove(); });
        [].forEach.call(doc.querySelectorAll("head style"), function (s) { var c = document.importNode(s, true); c.setAttribute("data-page", ""); document.head.appendChild(c); });
        var dn = doc.querySelector(".k-nav");
        [].slice.call(doc.body.childNodes).forEach(function (n) { if (n !== dn && n.nodeName !== "SCRIPT") body.appendChild(document.importNode(n, true)); });
        if (nav) [].forEach.call(nav.querySelectorAll("a[href]"), function (a) {
          if (a.href.split("#")[0] === u.href.split("#")[0]) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
        settle();
        body.scrollTop = 0; set("open"); if (G) G.select(u.href);
        var t = u.hash && document.getElementById(decodeURIComponent(u.hash.slice(1))); if (t) t.scrollIntoView();
      }).catch(function () { location.href = u.href; });
      return true;
    }
    window.addEventListener("popstate", function () { location.reload(); });
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a || a.target || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      var h = a.getAttribute("href"); if (!h || h.charAt(0) === "#") return;
      if (new URL(a.href).origin === location.origin && go(a.href)) e.preventDefault();
    });

    function load(list, done) {
      if (!list.length) return done();
      var s = document.createElement("script"); s.src = B + list[0];
      s.onload = function () { load(list.slice(1), done); }; s.onerror = function () { /* the page stays readable without the map */ };
      document.head.appendChild(s);
    }
    layout();
    load(["drawer.js", "tour.js", "graph.js"], function () {
      G = window.AIOBrain({ base: B, framed: true, onPage: go, overlayShown: shown, explain: calm ? explain : null });
      G.select(location.href); layout();
      // the course page lights its lesson dots through this handle
      window.AIOMap = G; window.dispatchEvent(new Event("aiomap"));
    });
  }

  function start() {
    // nav.js builds its header after it has read share.json: frame the page after that. The header
    // then grows with chrome(), so the frame measures it again.
    function frame() { setTimeout(function () { chartAndCards(); chrome(); bindToggle(); window.dispatchEvent(new Event("resize")); }, 0); }
    if (window.navPending) document.addEventListener("navbuilt", frame, { once: true }); else frame();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
