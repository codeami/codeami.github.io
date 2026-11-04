/* The Menu button of the one top bar (header.tb). Loaded in the head: marking the page first means a phone
   never flashes the open link list. Without this script the links stay in view. */
document.documentElement.classList.add("tb-js");
document.addEventListener("click", function (ev) {
  var b = ev.target.closest ? ev.target.closest(".tb-menu") : null;
  if (!b) return;
  var bar = b.closest(".tb");
  b.setAttribute("aria-expanded", bar.classList.toggle("tb-open") ? "true" : "false");
});
