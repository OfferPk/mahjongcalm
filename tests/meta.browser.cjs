// v2.1 headless test: how-to card, first-level coach, win -> achievements + challenge, daily reward,
// skin shop (preview, buy, persist), awards/stats, accessibility settings, no interstitial in session 1.
// Usage: node tests/meta.browser.cjs http://localhost:8785/ [outdir]
const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const URL = process.argv[2] || 'http://localhost:8785/';
const OUT = process.argv[3] || '/tmp';
const sleep = ms => new Promise(r => setTimeout(r, ms));
function ok(c, m) { if (!c) throw new Error(m); console.log('ok -', m); }
(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'],
    userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'mc-meta-')) });
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|sw\.js/.test(m.text())) errors.push(m.text()); });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0' }); await sleep(500);
  ok(await page.evaluate(() => AdGate.state().sessions === 1), 'first session counted');
  ok(await page.$eval('#howto', e => !e.classList.contains('hidden')), 'how-to card on first launch');
  ok(!!(await page.$('.home-panel #meta-bar #btn-shop')) && !(await page.$$eval('button', b => b.some(x => /remove ads/i.test(x.textContent)))), 'meta bar on home; fake remove-ads button gone');
  await page.screenshot({ path: path.join(OUT, 'mc-howto.png') });
  await page.click('#howto .howto-go'); await sleep(300);
  await page.evaluate(() => window.__mc.startLayout(0)); await sleep(900);
  ok(!!(await page.$('.coach')), 'first-puzzle coach starts');
  for (let i = 0; i < 8 && await page.$('.coach-next'); i++) { await page.click('.coach-next'); await sleep(150); }
  ok(!(await page.$('.coach')) && await page.evaluate(() => localStorage.getItem('mahjongcalm.meta.v1.coach') === '1'), 'coach finished and remembered');
  const c0 = await page.evaluate(() => Meta.coins());
  await page.evaluate(() => window.__mc.winForTest()); await sleep(400);
  ok(await page.evaluate(() => Meta.ach().get('wins') === 1 && Meta.ach().state().done.mc_first === 1), 'First Calm achievement unlocked');
  ok(await page.evaluate(() => Meta.state().chal && Meta.state().chal.day === MetaLogic.dateKey()), 'daily challenge progress tracked');
  ok((await page.evaluate(() => Meta.coins())) >= c0 + 15, 'win pays coins');
 const r = await page.evaluate(async () => [await Ads.showInterstitial(), AdGate.allow()]);
  ok(r[0] === false && r[1] === false, 'no interstitial possible in the first session');
  ok(!(await page.$eval('#overlay-win', e => e.hidden)), 'win card shown, no ad on win');
  await page.evaluate(() => document.querySelector('#btn-win-home').click()); await sleep(300);

  await page.click('#btn-daily'); await sleep(300);
  ok((await page.$$eval('.daily-day', l => l.length)) === 7, '7-day reward calendar');
  const c1 = await page.evaluate(() => Meta.coins());
  await page.screenshot({ path: path.join(OUT, 'mc-daily.png') });
  await page.evaluate(() => document.querySelector('.daily-claim').click()); await sleep(200);
  ok((await page.evaluate(() => Meta.coins())) >= c1 + 10, 'day-1 reward goes into the coin wallet');
  await page.click('.daily-x'); await sleep(200);

  await page.evaluate(() => Meta.addCoins(1000));
  await page.click('#btn-shop'); await sleep(300);
  ok((await page.$$('#shop .item')).length === 14, 'shop: 7 tile sets + 7 backdrops');
  await page.evaluate(() => document.querySelectorAll('#shop .shop-grid .item')[1].querySelector('.prev').click()); await sleep(100);
  ok(await page.evaluate(() => document.body.classList.contains('tiles-jade')), 'tile preview applies without buying');
  await page.evaluate(() => document.querySelector('#shop [data-close]').click()); await sleep(150);
  ok(await page.evaluate(() => !document.body.classList.contains('tiles-jade')), 'closing the shop ends the preview');
  await page.click('#btn-shop'); await sleep(200);
  await page.evaluate(() => document.querySelectorAll('#shop .shop-grid .item')[6].querySelector('.buy').click()); await sleep(150);
  ok(await page.evaluate(() => document.body.classList.contains('tiles-gold')), 'tile set bought and applied');
  await page.evaluate(() => document.querySelector('#shop [data-close]').click());
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(600);
  ok(await page.evaluate(() => document.body.classList.contains('tiles-gold')), 'skins persist across launches');
  ok(await page.evaluate(() => AdGate.state().sessions === 2), 'second session counted');
  ok(await page.$eval('#howto', e => e.classList.contains('hidden')), 'how-to card only on first launch');

  await page.click('#btn-awards'); await sleep(200);
  await page.evaluate(() => document.querySelector('.ach-tabs [data-t="stats"]').click()); await sleep(100);
  ok(/Layouts cleared/.test(await page.$eval('.ach-body', e => e.textContent)), 'stats tab shows layout stats');
  await page.evaluate(() => document.querySelector('.ach-x').click());

  await page.click('#btn-settings'); await sleep(200);
  for (const id of ['set-large', 'set-contrast', 'set-motion']) await page.evaluate(id => document.getElementById(id).click(), id);
  ok(await page.evaluate(() => ['a11y-large', 'a11y-contrast', 'a11y-reduce'].every(c => document.documentElement.classList.contains(c))), 'accessibility settings apply');
  await page.reload({ waitUntil: 'networkidle0' }); await sleep(500);
  ok(await page.evaluate(() => ['a11y-large', 'a11y-contrast', 'a11y-reduce'].every(c => document.documentElement.classList.contains(c))), 'accessibility settings persist');
  ok(errors.length === 0, 'no page errors ' + JSON.stringify(errors));
  console.log('ALL META BROWSER TESTS PASSED');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
