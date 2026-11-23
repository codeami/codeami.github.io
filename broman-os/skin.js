/* The one saved site-wide skin: "hud" (the default), "matrix" or "calm", kept in localStorage as "skin".
   Every page loads this in the head, so data-skin is set before the body is drawn and no page flashes white.
   Any header button with id "theme" (or class "theme") cycles the skin; a change in one tab reaches the others. */
(function () {
  var root = document.documentElement, SKINS = ["hud", "matrix", "calm"], NAMES = { hud: "HUD", matrix: "Matrix", calm: "Calm" };
  function saved() {
    var s = null;
    try { s = localStorage.getItem("skin"); } catch (e) { /* storage blocked: use the default */ }
    return SKINS.indexOf(s) >= 0 ? s : "hud";
  }
  function current() { var s = root.getAttribute("data-skin"); return SKINS.indexOf(s) >= 0 ? s : "hud"; }
  function next() { return SKINS[(SKINS.indexOf(current()) + 1) % SKINS.length]; }
  function label() {
    var n = next();
    // the button names the skin that is on; a press moves to the next one
    [].forEach.call(document.querySelectorAll("#theme, button.theme"), function (b) {
      b.textContent = NAMES[current()];
      b.title = "Switch to the " + NAMES[n] + " colours";
      b.setAttribute("aria-label", "Colours: " + NAMES[current()] + ". Switch to the " + NAMES[n] + " colours");
    });
  }
  function set(s, keep) {
    if (SKINS.indexOf(s) < 0) return;
    root.setAttribute("data-skin", s);
    if (keep !== false) { try { localStorage.setItem("skin", s); } catch (e) { /* storage blocked: lasts for this page only */ } }
    label();
  }
  function bind() {
    [].forEach.call(document.querySelectorAll("#theme, button.theme"), function (b) {
      if (b.hasAttribute("data-skin-bound")) return;
      b.setAttribute("data-skin-bound", "");
      b.addEventListener("click", function () { set(next()); });
    });
    label();
  }
  root.setAttribute("data-skin", saved());
  window.AIOSkin = { current: current, set: set, bind: bind };
  window.addEventListener("storage", function (e) { if (e.key === "skin") set(saved(), false); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
