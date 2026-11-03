/* A small scripted chat, for pages that walk a visitor through a fixed script.
   The script is in the tour.json chat format: nodes with an id, a chip (the reply that
   leads to the node), a fact (the bot's line), optional more (extra lines in the same
   bubble), see (a link), card (a small table) and next (the replies offered after it).
   An entry in next is a node id, or {label, step: N} to leave the chat for step N,
   or {label, href} to open a page. {if: "x"} / {unless: "x"} show an entry only on the
   path x (ctx.path). No model answers here: the bot only says what is written.

   EAChat.mount(box, { nodes, start, avatar, ctx, onStep }) draws the start node in box;
   a node can also carry "you", the words shown in the visitor's bubble instead of the chip. */
(function () {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function mount(box, o) {
    var byId = {}, busy = false;
    o.nodes.forEach(function (n) { byId[n.id] = n; });
    box.className += " k-chat";
    box.setAttribute("aria-live", "polite");

    function botRow(node) {
      var row = el("div", "k-row"), b = el("div", "k-bubble"), img = el("img", "k-avatar");
      img.src = o.avatar; img.alt = "EA-bot";
      b.appendChild(el("p", "", node.fact));
      (node.more || []).forEach(function (t) { b.appendChild(el("p", "", t)); });
      if (node.card) {
        var c = el("div", "chat-card"), dl = el("dl");
        c.appendChild(el("h4", "", node.card.title));
        node.card.rows.forEach(function (r) { dl.appendChild(el("dt", "", r[0])); dl.appendChild(el("dd", "", r[1])); });
        c.appendChild(dl);
        b.appendChild(c);
      }
      if (node.see) {
        var a = el("a", "see", node.see.label);
        a.href = node.see.href;
        b.appendChild(a);
      }
      row.appendChild(img); row.appendChild(b);
      return row;
    }
    function meRow(text) {
      var row = el("div", "k-row");
      row.appendChild(el("div", "k-bubble me", text));
      return row;
    }
    function shown(item) {
      return (!item.if || item.if === o.ctx.path) && (!item.unless || item.unless !== o.ctx.path);
    }
    function chips(node) {
      var row = el("div", "k-chips");
      (node.next || []).forEach(function (item) {
        if (typeof item !== "string" && !shown(item)) return;
        var label = typeof item === "string" ? byId[item].chip : item.label;
        var c = el("button", "k-chip", label);
        c.type = "button";
        c.addEventListener("click", function () { pick(row, c, item); });
        row.appendChild(c);
      });
      return row.childNodes.length ? row : null;
    }
    function show(node) {
      box.appendChild(botRow(node));
      var c = chips(node);
      if (c) box.appendChild(c);
      return c || box.lastChild;
    }
    function pick(row, chip, item) {
      if (busy) return;
      // Leaving the chat (a step or a page) keeps the buttons, so a visitor who comes back can pick again.
      if (typeof item !== "string") {
        if (item.href) { location.href = item.href; return; }
        if (item.step && o.onStep) o.onStep(item.step, item.path);
        return;
      }
      // The visitor's bubble records the pick, so the buttons go.
      row.parentNode.removeChild(row);
      busy = true;
      var n = byId[item];
      box.appendChild(meRow(n.you || n.chip));
      var wait = el("div", "k-row"), dots = el("div", "k-bubble typing");
      dots.setAttribute("aria-label", "EA-bot is typing");
      dots.innerHTML = "<i></i><i></i><i></i>";
      wait.appendChild(dots);
      box.appendChild(wait);
      setTimeout(function () {
        box.removeChild(wait);
        var last = show(n);
        busy = false;
        if (last.scrollIntoView) last.scrollIntoView({ block: "nearest" });
      }, calm ? 0 : 450);
    }
    show(byId[o.start]);
  }

  window.EAChat = { mount: mount };
})();
