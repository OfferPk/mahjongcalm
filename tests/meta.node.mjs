// v0.2 meta + ad-placement unit tests (plain node): challenge seeding, achievements, shop CSS, ad rules, policy words.
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const R = p => path.join(path.dirname(new URL(import.meta.url).pathname), '..', p);
// public/js files are classic scripts with a CommonJS export; load them in a sandbox (package is type: module)
function load(f) { const module = { exports: {} }; vm.runInNewContext(fs.readFileSync(R(f), 'utf8'), { module, exports: module.exports, globalThis: {}, console, Date, Math, JSON }); return module.exports; }
const ML = load('public/js/metakit.js');
const DailyLogic = load('public/js/daily.js');
const G = load('public/js/adgate.js');
const ctx = { window: { ACH_DEFS: [], Meta: { init() {} } } };
vm.runInNewContext(fs.readFileSync(R('public/js/meta-config.js'), 'utf8'), ctx);
ctx.window.__mc = { showScreen() {}, cleared: () => 0, layoutCount: 12 }; ctx.window.MC_META_BOOT();
const C = ctx.window.MC_META;
assert.ok(C && C.challenges.length >= 5);
const ids = new Set(); for (let d = 1; d <= 30; d++) ids.add(ML.challengeFor('2026-11-' + String(d).padStart(2, '0'), C.challenges, C.salt).id);
assert.ok(ids.size >= 3, 'challenge rotates');
const by = Object.fromEntries(C.challenges.map(c => [c.id, c]));
assert.equal(by.triple.test({ stars: 3 }), true); assert.equal(by.triple.test({ stars: 2 }), false);
assert.equal(by.late.test({ level: 6 }), true); assert.equal(by.late.test({ level: 5 }), false);
assert.equal(by.big.test({ tiles: 60 }), true); assert.equal(by.big.test({ tiles: 58 }), false);
assert.equal(ML.winCoins({ stars: 3, clean: true }), 30);
assert.equal(DailyLogic.REWARDS.length, 7);
const actx = { window: {} }; vm.runInNewContext(fs.readFileSync(R('public/js/ach-defs.js'), 'utf8'), actx);
const defs = actx.window.ACH_DEFS; assert.equal(new Set(defs.map(d => d.id)).size, defs.length);
defs.forEach(d => assert.ok(d.goal > 0 && d.reward > 0 && d.reward <= 250));
const css = fs.readFileSync(R('public/css/meta.css'), 'utf8');
C.shop.forEach(g => { assert.equal(g.items[0].price, 0); g.items.forEach(it => assert.ok(css.includes((g.prefix === 'tiles-' ? '.tiles-' : '.bgsw-') + it.id), 'css for ' + g.prefix + it.id)); });
// ad gate
function mem() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; }
const g = G.make(mem()); g.startSession(); for (let i = 0; i < 9; i++) g.levelDone(); assert.equal(g.allow(), false); g.startSession(); assert.equal(g.allow(), true);
// ad placement in main.ts
const app = fs.readFileSync(R('src/main.ts'), 'utf8');
assert.equal((app.match(/showInterstitial\(/g) || []).length, 1, 'one interstitial call site');
assert.match(app, /showInterstitial\('after-level'\)/);
assert.equal((app.match(/afterLayoutAd\(\);/g) || []).length, 4, 'only from the win card buttons');
for (const fn of ['function onWin', 'function startLayout', 'function wireUi']) {
  const i = app.indexOf(fn); const body = app.slice(i, app.indexOf('\n  }\n', i));
  assert.ok(!/showInterstitial/.test(body), 'no interstitial in ' + fn);
}
assert.ok(!/purchaseRemoveAds|Remove ads/.test(app), 'no fake purchase');
// road themes in the renderer match the shop
const board = fs.readFileSync(R('src/ui/canvas.ts'), 'utf8');
C.shop[0].items.forEach(it => assert.ok(new RegExp('\\b' + it.id + ': \\{').test(board), 'tile set ' + it.id));

// policy words
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').toLowerCase();
const ui = ['index.html', 'public/js/metakit.js', 'public/js/meta-config.js', 'public/js/ach-defs.js', 'src/main.ts'].map(f => strip(fs.readFileSync(R(f), 'utf8'))).join('\n');
['withdraw', 'paypal', 'real money', 'loot box', 'lootbox', 'wager', 'gamble', 'buy coins', '(stub)', 'remove ads'].forEach(w => assert.ok(!ui.includes(w), 'policy word: ' + w));
console.log('ALL META TESTS PASSED');
