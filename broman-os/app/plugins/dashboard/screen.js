// dashboard: the first screen. One tile per plugin in this variant (from the build's registry), then the products row.
// A live count shows only where that plugin's own data is in the page; no other plugin's data is read at build time.
BromanOS.screens['dashboard/home'] = function (el, data, h) {
  const e = h.esc, B = window.BromanOS, D = B.data;
  const ico = function (n) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + e(n) + '"/></svg>'; };
  const counts = {
    inbox: function (d) { return d && d.stream ? { n: d.stream.length, label: 'items' } : null; },
    decisions: function (d) { return d && d.items ? { n: d.total, label: 'waiting', needs: d.total > 0 } : null; },
  };

  const tiles = B.registry.plugins.filter(function (p) { return p.id !== 'dashboard'; }).map(function (p) {
    const s = p.screens[0], c = counts[p.id] && counts[p.id](D[p.id]);
    return '<a class="dash-tile card" href="#' + e(p.id + '/' + s.id) + '">' +
      '<span class="dash-ico">' + ico(s.icon) + '</span>' +
      '<span class="dash-body"><b>' + e(p.title) + '</b><span>' + e(p.summary || '') + '</span></span>' +
      (c ? '<span class="chip ' + (c.needs ? 'is-needs' : '') + '">' + e(c.n) + ' ' + e(c.label) + '</span>' : '') + '</a>';
  }).join('');

  // data.products is null for a variant with no products row: no section at all
  const products = (data.products || []).map(function (p) {
    const link = p.demo ? '<a class="chip is-working" href="' + h.href(p.demo) + '" target="_blank" rel="noopener">Open demo</a>' : '<span class="chip">demo coming</span>';
    return '<div class="dash-tile card"><span class="dash-body"><b>' + e(p.title) + '</b><span>' + e(p.about) + '</span></span>' + link + '</div>';
  }).join('');

  el.innerHTML = '<div class="page-head"><div><h1>' + e(B.registry.display) + '</h1><p>Everything in this build. Pick a tile to open it.</p></div></div>' +
    '<section aria-label="Plugins"><div class="card-head"><h3>Plugins</h3></div><div class="dash-grid">' + tiles + '</div></section>' +
    (data.products === null ? '' : '<section aria-label="Products"><div class="card-head"><h3>Products</h3></div><div class="dash-grid">' +
    (products || h.empty('No products yet', 'Add one to products.json.')) + '</div></section>');
};
