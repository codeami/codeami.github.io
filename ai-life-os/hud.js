/* The Chart Room's background graph and skin toggle. nav.js or article.js loads
   this file and has already set data-skin on <html>.
   The graph is a slow, dim ring map in the style of the AIO second-brain map:
   the site at the centre, its sections on the first ring, the Field Notes posts
   on the second, and the public second-brain notes (brain/notes.js, names and
   links only) on the outer ring, coloured by tag. It sits behind the page and
   never takes clicks. With reduced motion it is drawn once and stays still. */
(function () {
  var root = document.documentElement;
  var base = document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, "") : "";
  var TAU = Math.PI * 2;
  var SECTIONS = ["Field Notes", "Arena", "Safety", "The story", "Chat", "Core logic",
                  "Skill map", "Harness flow", "About", "Second brain"];
  var POSTS = 6;
  var SKINS = {
    hud:    { accent: "#ff7a1a", label: "rgba(233,230,224,.55)", guide: "rgba(255,122,26,.16)", wash: "rgba(70,32,90,.22)",
              tags: ["#ff7a1a", "#ffb347", "#ff4fd8", "#b57bff", "#5cd3ff", "#2ee6c5", "#ffd93d", "#4f8dff"] },
    matrix: { accent: "#39ff7a", label: "rgba(214,255,224,.55)", guide: "rgba(57,255,122,.16)", wash: "rgba(10,70,30,.22)",
              tags: ["#39ff7a", "#1fd65f", "#8dff9e", "#00c853", "#b9ff5a", "#5dffb0", "#2bbf5a", "#a6ffcb"] }
  };
  function skin() { return root.getAttribute("data-skin") === "matrix" ? "matrix" : "hud"; }

  var notes = [], links = [], cv, ctx, W = 0, H = 0, DPR = 1, sprites = {}, still = false;

  /* Glow sprite: a soft radial dot, drawn additively (from the AIO map). */
  function sprite(color) {
    if (sprites[color]) return sprites[color];
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "#fff"); gr.addColorStop(.18, color); gr.addColorStop(.45, color + "55"); gr.addColorStop(1, color + "00");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return sprites[color] = c;
  }

  function loadNotes(done) {
    var s = document.createElement("script");
    s.src = base + "brain/notes.js";
    s.onload = function () {
      var list = (window.BRAIN_NOTES || []).slice().sort(function (a, b) {
        return (a.tags[0] || "").localeCompare(b.tags[0] || "");
      });
      var tags = [], at = {};
      list.forEach(function (n, i) {
        var t = n.tags[0] || "";
        if (tags.indexOf(t) < 0) tags.push(t);
        at[n.id] = i;
        notes.push({ tag: tags.indexOf(t) });
      });
      list.forEach(function (n, i) {
        (n.links || []).forEach(function (l) { if (at[l] > i) links.push([i, at[l]]); });
      });
      done();
    };
    s.onerror = done;
    document.head.appendChild(s);
  }

  /* Where the graph goes: centred, unless a text panel leaves a wide free band
     beside it; then the graph sits in that band (the nav.js sidebar is not free). */
  var CX = 0, LABELS = true;
  function size() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    CX = W / 2;
    var panel = document.querySelector("main.page, .col > main"), side = document.querySelector(".col > main") && document.querySelector(".side");
    LABELS = !panel; // labels behind a text panel would read as noise
    if (panel && W >= 1000) {
      var r = panel.getBoundingClientRect(), s = side && side.offsetWidth && getComputedStyle(side).position !== "fixed" ? side.getBoundingClientRect().right : 0;
      var left = r.left - s, right = W - r.right;
      if (Math.max(left, right) >= 320) { CX = left >= right ? s + left / 2 : r.right + right / 2; LABELS = true; }
    }
  }

  function draw(t) {
    var P = SKINS[skin()], tm = (t || 0) / 1000;
    var S = Math.min(Math.max(W, H) * .5, Math.max(Math.min(W, H), 420));
    var cx = CX, cy = W < 700 ? Math.min(H * .3, 260) : H / 2;
    var R1 = S * .22, R2 = S * .36, R3 = S * .52;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R3 * 1.4);
    g.addColorStop(0, P.wash); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    ctx.lineWidth = 1; ctx.strokeStyle = P.guide;
    [R1, R2, R3].forEach(function (r, i) {
      ctx.setLineDash(i === 1 ? [4, 6] : []);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    });
    ctx.setLineDash([]);

    function pos(i, n, r, speed, off) {
      var a = off + i / n * TAU + tm * speed;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }
    var sec = SECTIONS.map(function (_, i) { return pos(i, SECTIONS.length, R1, .012, -Math.PI / 2); });
    var pst = []; for (var p = 0; p < POSTS; p++) pst.push(pos(p, POSTS, R2, -.008, .3));
    var nts = notes.map(function (_, i) { return pos(i, notes.length, R3, .005, .1); });

    // links: centre to sections, sections to posts, note to note
    ctx.globalAlpha = .22; ctx.strokeStyle = P.accent; ctx.beginPath();
    sec.forEach(function (q) { ctx.moveTo(cx, cy); ctx.lineTo(q[0], q[1]); });
    pst.forEach(function (q) { ctx.moveTo(sec[0][0], sec[0][1]); ctx.lineTo(q[0], q[1]); });
    ctx.stroke();
    ctx.globalAlpha = .12; ctx.beginPath();
    links.forEach(function (l) { var a = nts[l[0]], b = nts[l[1]]; ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(cx, cy, b[0], b[1]); });
    ctx.stroke();

    // glows
    ctx.globalCompositeOperation = "lighter";
    function glow(q, color, r, a) { ctx.globalAlpha = a; ctx.drawImage(sprite(color), q[0] - r, q[1] - r, r * 2, r * 2); }
    glow([cx, cy], P.accent, 34, .95);
    sec.forEach(function (q) { glow(q, P.accent, 13, .8); });
    pst.forEach(function (q) { glow(q, "#ffffff", 9, .55); });
    nts.forEach(function (q, i) { glow(q, P.tags[notes[i].tag % P.tags.length], 8 + 2 * Math.sin(tm + i), .85); });
    ctx.globalCompositeOperation = "source-over";

    // labels: the sections only, and only where there is room
    if (W >= 700 && LABELS) {
      ctx.globalAlpha = 1; ctx.fillStyle = P.label;
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      sec.forEach(function (q, i) { ctx.fillText(SECTIONS[i].toUpperCase().split("").join(" "), q[0], q[1] + 22); });
      ctx.fillText("T H E   C H A R T   R O O M", cx, cy + 50);
    }
  }

  var last = 0;
  function frame(t) {
    if (!document.hidden && t - last > 33) { draw(t); last = t; }
    requestAnimationFrame(frame);
  }

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
        if (still) draw(0);
      });
    });
    label();
  }

  /* Top bar extras, the same on every page: the site version, a link up to the
     whoami home (the folder above this one) and the GitHub repo. */
  var VERSION = "v1.0", REPO = "https://github.com/codeami/codeami.github.io";
  function chrome() {
    var bar = document.querySelector(".k-nav, header.top");
    if (!bar || bar.querySelector(".vtag")) return;
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
    // The whoami home itself loads this file from its subfolder: no link to itself there.
    if (new URL(up.href).pathname !== location.pathname.replace(/index\.html$/, "")) at.insertBefore(up, toggle || null);
    at.insertBefore(gh, toggle || null);
  }

  function start() {
    cv = document.createElement("canvas");
    cv.className = "hud-bg";
    cv.setAttribute("aria-hidden", "true");
    document.body.insertBefore(cv, document.body.firstChild);
    ctx = cv.getContext("2d");
    size();
    still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.addEventListener("resize", function () { size(); draw(performance.now()); });
    loadNotes(function () { if (still) draw(0); else requestAnimationFrame(frame); });
    // nav.js builds its header on DOMContentLoaded; bind after it.
    setTimeout(function () { chrome(); bindToggle(); }, 0);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
