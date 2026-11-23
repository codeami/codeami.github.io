/* Frame for the kit pages: the Home, the factory, the arena and the course. Load it in the head, so the
   reader's saved skin (skin.js) is set before the body is drawn.
   It then loads hud.js from this file's folder, and hud.css too when the page
   does not link it above this script (posts built outside this repo may not):
   hud.js draws the background graph and turns the header's #theme button into
   the skin toggle. */
(function () {
  var root = document.documentElement;
  var base = document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, "") : "";
  // skin.js sets the saved skin and runs the toggle; written in place so it runs before the body is drawn
  document.write('<script src="' + base + 'skin.js"><\/script>');
  if (!document.querySelector('link[href$="hud.css"]')) {
    var css = document.createElement("link");
    css.rel = "stylesheet"; css.href = base + "hud.css";
    document.head.appendChild(css);
  }
  var js = document.createElement("script");
  js.src = base + "hud.js";
  document.head.appendChild(js);
})();
