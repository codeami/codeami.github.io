/* Shared shell for every page: sidebar nav, header with day/night toggle,
   draft banner, byline and previous/next links. No build step, no network.
   To add or rename a page, edit one line in PAGES or MORE. Order here is reading order.
   PAGES are the main pages. MORE holds every other page, behind a "More" fold. */
var DRAFT = false; // false removes the draft banner on every page
window.navPending = true; // hud.js waits for the shell (see start() below)

var PAGES = [
  ["blog/index.html", "Field Notes"],
  ["arena.html",     "Harness arena"],
  ["safety.html",    "Safety by design"],
  ["story.html",     "The story"],
  ["core.html",      "Core logic"],
  ["maps/skills.html", "Skill map"],
  ["maps/flow.html", "Harness flow map"],
  ["brain/index.html", "Second Brain"]
];

var MORE = [
  ["tour/index.html", "Guided tour"],
  ["changelog.html", "Changelog"],
  ["about.html",     "About"]
];

var SITE = "The Chart Room";

/* Skin: the HUD look (warm accent) or Matrix green, as the reader last picked
   ("skin" in localStorage). This runs in the head, before the body is drawn, so
   there is no flash. hud.css colours the page (linked in the page's head, or
   added here when it is not); hud.js draws the background graph and turns the
   header's theme button into the skin toggle. Both sit next to this file, as
   article.js loads them for the kit pages. */
(function () {
  var root = document.documentElement;
  var base = document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, "") : "";
  var s = null;
  try { s = localStorage.getItem("skin"); } catch (e) { /* storage blocked: use the default */ }
  root.setAttribute("data-skin", s === "matrix" ? "matrix" : "hud");
  if (!document.querySelector('link[href$="hud.css"]')) {
    var css = document.createElement("link");
    css.rel = "stylesheet"; css.href = base + "hud.css";
    document.head.appendChild(css);
  }
  var js = document.createElement("script");
  js.src = base + "hud.js";
  document.head.appendChild(js);
})();

function meta(name) {
  var m = document.querySelector('meta[name="' + name + '"]');
  return m ? m.getAttribute("content") : "";
}

function el(tag, attrs, text) {
  var n = document.createElement(tag);
  for (var k in attrs) n.setAttribute(k, attrs[k]);
  if (text) n.textContent = text;
  return n;
}

function buildShell() {
  // A page in a subfolder sets <meta name="site-root" content="../">. Links are
  // then prefixed with it, and "here" keeps the folder, such as "tour/index.html".
  var root = meta("site-root");
  var parts = location.pathname.split("/");
  var here = parts.pop() || "index.html";
  for (var d = root.split("../").length - 1; d > 0; d--) here = parts.pop() + "/" + here;
  // The pager walks the list the page is in: main pages, or the More pages.
  var list = PAGES, idx = -1;
  for (var i = 0; i < PAGES.length; i++) if (PAGES[i][0] === here) idx = i;
  if (idx < 0) {
    list = MORE;
    for (var j = 0; j < MORE.length; j++) if (MORE[j][0] === here) idx = j;
  }
  var main = document.querySelector("main");
  if (!main) return;

  var app = el("div", { "class": "app" });
  var side = el("aside", { "class": "side", id: "side" });
  var brand = el("a", { "class": "brand", href: root + "index.html" }, SITE);
  side.appendChild(brand);
  side.appendChild(el("div", { "class": "lbl side-sub" }, DRAFT ? "Private draft" : "Notes"));
  var nav = el("nav", { "aria-label": "Pages" });
  function link(into, p, n, inList) {
    var a = el("a", { "class": "nav", href: root + p[0] }, p[1]);
    if (inList === list && n === idx) a.setAttribute("aria-current", "page");
    into.appendChild(a);
  }
  PAGES.forEach(function (p, n) { link(nav, p, n, PAGES); });
  var more = el("details", { "class": "more" });
  if (list === MORE && idx >= 0) more.open = true;
  more.appendChild(el("summary", { "class": "nav" }, "More"));
  MORE.forEach(function (p, n) { link(more, p, n, MORE); });
  nav.appendChild(more);
  side.appendChild(nav);

  var col = el("div", { "class": "col" });
  var top = el("header", { "class": "top" });
  var menu = el("button", { "class": "menu", type: "button", "aria-controls": "side", "aria-expanded": "false" }, "Menu");
  menu.addEventListener("click", function () {
    var open = app.classList.toggle("nav-open");
    menu.setAttribute("aria-expanded", open ? "true" : "false");
  });
  var where = el("span", { "class": "lbl where" }, idx >= 0 ? list[idx][1] : "");
  var toggle = el("button", { "class": "theme", type: "button" }, "Matrix"); // hud.js runs it
  top.appendChild(menu); top.appendChild(where); top.appendChild(toggle);
  col.appendChild(top);

  if (DRAFT) col.appendChild(el("div", { "class": "banner", role: "note" },
    "Private draft. Not published. Do not share."));

  main.parentNode.insertBefore(app, main);
  app.appendChild(side);
  app.appendChild(col);
  col.appendChild(main);

  var h1 = main.querySelector("h1");
  if (h1 && meta("date")) {
    var by = el("p", { "class": "byline lbl" },
      "Written " + meta("date") + (meta("last-updated") ? " · Updated " + meta("last-updated") : ""));
    h1.parentNode.insertBefore(by, h1.nextSibling);
  }

  if (idx >= 0) {
    var pager = el("nav", { "class": "pager", "aria-label": "Previous and next" });
    pager.appendChild(idx > 0 ? el("a", { href: root + list[idx - 1][0], rel: "prev" }, "← " + list[idx - 1][1]) : el("span"));
    pager.appendChild(idx < list.length - 1 ? el("a", { href: root + list[idx + 1][0], rel: "next" }, list[idx + 1][1] + " →") : el("span"));
    main.appendChild(pager);
  }
}

/* In-page links: scroll with JS, with a smooth scroll and the same behaviour everywhere. */
function scrollToId(id) {
  var t = id && document.getElementById(id);
  if (!t) return false;
  t.scrollIntoView({ behavior: "smooth", block: "start" });
  try { history.replaceState(null, "", "#" + id); } catch (e) { /* sandbox may refuse */ }
  return true;
}
function samePageHash(a) {
  var href = a.getAttribute("href") || "";
  var i = href.indexOf("#");
  if (i < 0) return "";
  var page = href.slice(0, i).split("?")[0];
  var here = location.pathname.split("/").pop() || "index.html";
  return (page === "" || page === here) ? href.slice(i + 1) : "";
}
document.addEventListener("click", function (ev) {
  var a = ev.target.closest ? ev.target.closest("a[href]") : null;
  if (!a) return;
  var id = samePageHash(a);
  if (id && scrollToId(id)) ev.preventDefault();
});

/* Pages listed in retired.json at the site root are left out of the nav and the pager.
   If the file cannot be read, the nav shows everything. */
var RETIRED_URL = document.currentScript ? document.currentScript.src.replace(/[^\/]*$/, "") + "../retired.json" : "";
function dropRetired(list, gone) {
  return list.filter(function (p) { return gone.indexOf("ai-life-os/" + p[0]) < 0; });
}
function start() {
  var done = false;
  function go(gone) {
    if (done) return;
    done = true;
    if (gone) { PAGES = dropRetired(PAGES, gone); MORE = dropRetired(MORE, gone); }
    buildShell();
    if (location.hash) scrollToId(decodeURIComponent(location.hash.slice(1)));
    window.navPending = false;
    document.dispatchEvent(new Event("navbuilt")); // hud.js frames the page once the shell is there
  }
  if (!RETIRED_URL || !window.fetch) return go(null);
  fetch(RETIRED_URL).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { go(j && j.retired ? j.retired.map(function (e) { return e.path; }) : null); })
    .catch(function () { go(null); });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
