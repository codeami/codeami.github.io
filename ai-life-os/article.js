/* Skin for the kit pages: the home page chat, Field Notes, the arena, the story,
   safety and about. Load it in the head, so the reader's last pick ("hud" or
   "matrix", kept in localStorage as "skin") is set before the body is drawn.
   It then loads hud.css and hud.js from this file's folder: hud.js draws the
   background graph and turns the header's #theme button into the skin toggle. */
(function () {
  var root = document.documentElement;
  var base = document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, "") : "";
  var s = null;
  try { s = localStorage.getItem("skin"); } catch (e) { /* storage blocked: use the default */ }
  root.setAttribute("data-skin", s === "matrix" ? "matrix" : "hud");
  var css = document.createElement("link");
  css.rel = "stylesheet"; css.href = base + "hud.css";
  document.head.appendChild(css);
  var js = document.createElement("script");
  js.src = base + "hud.js";
  document.head.appendChild(js);
})();
