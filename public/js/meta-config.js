/* MahjongCalm v0.2 meta wiring: how-to card, daily reward + challenge, skin shop (tile sets + table backdrops),
   achievements + stats, level-1 coach, accessibility. Coins are cosmetic only: earned by playing, never sold or cashed out. */
(function () {
  'use strict';
  window.MC_META_BOOT = function () {
    var S = window.__mc;
    if (!S || !window.Meta || window.MC_META) return;
    var FACES = [['#2dd4bf', '●'], ['#f472b6', '▲'], ['#fbbf24', '◆']];
    function tileThumb(it) {
      var w = document.createElement('div'); w.className = 'tile-prev tiles-' + it.id;
      FACES.forEach(function (f) { var t = document.createElement('div'); t.className = 'mtile'; t.style.color = f[0]; t.textContent = f[1]; w.appendChild(t); });
      return w;
    }
    function bgThumb(it) { var e = document.createElement('div'); e.className = 'bg-swatch bgsw-' + it.id; return e; }
    var tt = null;
    function toast(msg, ms) {
      var t = document.getElementById('meta-toast'); if (!t || !msg) return;
      t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('show'); }, ms || 1800);
    }
    window.MC_META = {
      key: 'mahjongcalm.meta.v1', salt: 'mahjongcalm', barAfter: '.home-panel #btn-layouts', settingsAnchor: '[data-screen="settings"] .settings-end', previewBar: false,
      toast: toast,
      rewarded: function (ok) { window.Ads.showRewarded(ok); },
      closeSettings: function () { S.showScreen('home'); },
      isFirstLevel: function () { return S.isFirstLayout(); },
      onA11y: function () { S.repaint(); },
      howtoNote: 'Coins are cosmetic only: earned by playing and spent on tile sets and table backdrops. They can never be bought with money or cashed out.',
      howto: [
        'Match two tiles with the same face to remove them. Clear every tile to finish the layout.',
        'Only free tiles can be picked: nothing stacked on top, and at least the left or right side open.',
        'Undo reverses your last match and Redo restores it. Shuffle rearranges the faces if you get stuck.',
        'Hint highlights a matching free pair. The first few are free, after that a short ad gives one more.',
        'Clear a layout without spare moves or help for 3 stars. Every clear earns cosmetic coins.',
        'Claim the Daily reward and finish the Daily challenge for bonus coins, then spend them in the Skin Shop.'
      ],
      coach: [
        { target: '#board', text: 'Tap two free tiles with the same face to match them.' },
        { target: '#btn-hint', text: 'Stuck? Hint highlights a free pair.' },
        { target: '.play-bar', text: 'Shuffle, Undo and Retry live down here. Take your time.' }
      ],
      challenges: [
        { id: 'triple', title: 'Perfect Flow', desc: 'Clear a layout with 3 stars', count: 1, test: function (d) { return d.stars >= 3; } },
        { id: 'two', title: 'Calm Pair', desc: 'Clear 2 layouts', count: 2, test: function () { return true; } },
        { id: 'clean', title: 'Unaided', desc: 'Clear a layout without Hint, Shuffle or Undo', count: 1, test: function (d) { return d.clean; } },
        { id: 'big', title: 'Big Board', desc: 'Clear a layout with 60 or more tiles', count: 1, test: function (d) { return d.tiles >= 60; } },
        { id: 'late', title: 'Deep Garden', desc: 'Clear layout 6 or later', count: 1, test: function (d) { return d.level >= 6; } }
      ],
      playChallenge: function () { var n = S.cleared(); S.startLayout(n < S.layoutCount ? n : 0); },
      achDefs: window.ACH_DEFS || [],
      stats: function (st) {
        var g = function (k) { return st.m[k] || 0; };
        return [['Layouts cleared', String(g('wins'))], ['Different layouts', String(S.cleared()) + ' / ' + S.layoutCount],
          ['3-star clears', String(g('stars3'))], ['Clears without help', String(g('clean_wins'))], ['Pairs matched', String(g('moves'))]];
      },
      shop: [
        { title: 'Tile sets', kind: 'tiles', prefix: 'tiles-', thumb: tileThumb, items: [
          { id: 'ivory', name: 'Ivory', price: 0 }, { id: 'jade', name: 'Jade', price: 150 },
          { id: 'bamboo', name: 'Bamboo', price: 200 }, { id: 'rose', name: 'Rose Quartz', price: 250 },
          { id: 'sky', name: 'Sky', price: 250 }, { id: 'slate', name: 'Slate', price: 300 },
          { id: 'gold', name: 'Gold Leaf', price: 500 }] },
        { title: 'Table backdrops', kind: 'bg', prefix: 'bgx-', thumb: bgThumb, items: [
          { id: 'lagoon', name: 'Lagoon', price: 0 }, { id: 'forest', name: 'Forest', price: 150 },
          { id: 'dusk', name: 'Dusk', price: 200 }, { id: 'sand', name: 'Sandstone', price: 250 },
          { id: 'ink', name: 'Ink', price: 300 }, { id: 'sakura', name: 'Sakura', price: 350 },
          { id: 'aurora', name: 'Aurora', price: 500 }] }
      ]
    };
    window.Meta.init(window.MC_META);
  };
})();
