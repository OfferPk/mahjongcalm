import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '..');
const chromeBinary = process.env.CHROME_BIN || 'chromium';
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
];

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const { port } = server.address();
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function waitUntil(check, description, timeoutMs = 15_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(50);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
}

async function startVite(port) {
  const viteEntry = resolve(root, 'node_modules/vite/bin/vite.js');
  const child = spawn(process.execPath, [viteEntry, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => { output = (output + chunk).slice(-3000); });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { output = (output + chunk).slice(-3000); });
  child.once('error', (error) => { output += `\n${error.message}`; });
  try {
    await waitUntil(async () => {
      if (child.exitCode !== null) throw new Error(`Vite exited (${child.exitCode}): ${output}`);
      const response = await fetch(`http://127.0.0.1:${port}/mahjongcalm/`);
      return response.ok;
    }, 'Vite dev server');
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(`${error.message}\n${output}`);
  }
  return { child, output: () => output };
}

class DevTools {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.ready = new Promise((resolveOpen, reject) => {
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result ?? {});
    });
  }

  async send(method, params = {}, sessionId) {
    await this.ready;
    const id = ++this.nextId;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolveCommand, reject) => {
      this.pending.set(id, { resolve: resolveCommand, reject });
      this.socket.send(JSON.stringify(message));
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(devtools, sessionId, expression) {
  const response = await devtools.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text || 'Page evaluation failed');
  }
  return response.result.value;
}

async function openBrowser() {
  const port = await reservePort();
  const profile = await mkdtemp(join(tmpdir(), 'mahjongcalm-touch-chrome-'));
  const child = spawn(chromeBinary, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    const version = await waitUntil(async () => {
      if (child.exitCode !== null) throw new Error(`Chromium exited (${child.exitCode})`);
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      return response.ok ? response.json() : false;
    }, 'Chromium DevTools endpoint');
    return { child, profile, devtools: new DevTools(version.webSocketDebuggerUrl) };
  } catch (error) {
    child.kill('SIGTERM');
    await rm(profile, { recursive: true, force: true });
    throw error;
  }
}

async function createIsolatedPage(devtools, origin, viewport) {
  const { browserContextId } = await devtools.send('Target.createBrowserContext', { disposeOnDetach: true });
  const { targetId } = await devtools.send('Target.createTarget', {
    url: 'about:blank',
    browserContextId,
  });
  const { sessionId } = await devtools.send('Target.attachToTarget', { targetId, flatten: true });
  await devtools.send('Page.enable', {}, sessionId);
  await devtools.send('Runtime.enable', {}, sessionId);
  await devtools.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  }, sessionId);
  await devtools.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'Math.random = () => 0.37;',
  }, sessionId);
  const navigation = await devtools.send('Page.navigate', { url: `${origin}/mahjongcalm/` }, sessionId);
  if (navigation.errorText) throw new Error(`Navigation failed: ${navigation.errorText}`);
  return {
    sessionId,
    close: async () => {
      try { await devtools.send('Target.closeTarget', { targetId }); } catch {}
      try { await devtools.send('Target.disposeBrowserContext', { browserContextId }); } catch {}
    },
  };
}

async function waitForPage(devtools, sessionId, expression, description, timeoutMs = 15_000) {
  await waitUntil(async () => await evaluate(devtools, sessionId, expression), description, timeoutMs);
}

async function touchAt(devtools, sessionId, point) {
  await devtools.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: point.x, y: point.y, id: 1 }],
  }, sessionId);
  await devtools.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  }, sessionId);
  await sleep(90);
}

async function setViewport(devtools, sessionId, viewport) {
  await devtools.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  }, sessionId);
  await waitUntil(
    async () => await evaluate(devtools, sessionId, `innerWidth === ${viewport.width} && innerHeight === ${viewport.height}`),
    `viewport resize to ${viewport.width}x${viewport.height}`,
  );
  await sleep(100);
}

async function touchSelector(devtools, sessionId, selector) {
  const point = await evaluate(devtools, sessionId, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error('Missing touch target: ' + ${JSON.stringify(selector)});
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await touchAt(devtools, sessionId, point);
}

async function measureControlClearance(devtools, sessionId) {
  return await evaluate(devtools, sessionId, `(() => {
    const banner = document.querySelector('#a2hs').getBoundingClientRect();
    return ['#btn-shuffle', '#btn-retry', '#btn-play-layouts'].map((selector) => {
      const button = document.querySelector(selector);
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const overlapY = Math.max(0, Math.min(rect.bottom, banner.bottom) - Math.max(rect.top, banner.top));
      return {
        id: button.id,
        visible: !!(rect.width && rect.height) && getComputedStyle(button).visibility === 'visible',
        withinViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
        overlapY,
        visibleHeight: rect.height - overlapY,
        centerHit: document.elementFromPoint(x, y) === button,
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      };
    });
  })()`);
}

function assertControlClearance(clearance, viewport) {
  for (const target of clearance) {
    assert.equal(target.visible, true, `${viewport.width}x${viewport.height} ${target.id} is visible: ${JSON.stringify(target.rect)}`);
    assert.equal(target.withinViewport, true, `${viewport.width}x${viewport.height} ${target.id} remains in the viewport: ${JSON.stringify(target.rect)}`);
    assert.equal(target.centerHit, true, `${viewport.width}x${viewport.height} ${target.id} has an unobstructed center hit target`);
    assert.ok(target.visibleHeight >= 40, `${viewport.width}x${viewport.height} ${target.id} retains at least 40px of exposed touch target: ${JSON.stringify(target)}`);
    if ((viewport.width === 320 && viewport.height === 568) || (viewport.width === 568 && viewport.height === 320)) {
      assert.equal(target.overlapY, 0, `${target.id} is fully clear of the banner at ${viewport.width}x${viewport.height}: ${JSON.stringify(target)}`);
    }
  }
}

async function selectedTilePosition(devtools, sessionId, tileId) {
  return await evaluate(devtools, sessionId, `(async () => {
    const [{ LAYOUTS }, { createGame }] = await Promise.all([
      import('/mahjongcalm/src/layouts/index.ts'),
      import('/mahjongcalm/src/game/engine.ts'),
    ]);
    const expected = createGame(LAYOUTS[0], () => 0.37);
    const tile = expected.tiles.find((candidate) => candidate.id === ${tileId});
    const b = expected.tiles.reduce((bounds, candidate) => ({
      minX: Math.min(bounds.minX, candidate.x), minY: Math.min(bounds.minY, candidate.y),
      maxX: Math.max(bounds.maxX, candidate.x + 2), maxY: Math.max(bounds.maxY, candidate.y + 2),
      maxZ: Math.max(bounds.maxZ, candidate.z),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: 0 });
    const canvas = document.querySelector('#board');
    const rect = canvas.getBoundingClientRect();
    const gw = b.maxX - b.minX;
    const gh = b.maxY - b.minY;
    const scale = Math.max(8, Math.min(
      (canvas.clientWidth - 32 - 4 * (b.maxZ + 1)) / gw,
      (canvas.clientHeight - 32 - 4 * (b.maxZ + 1)) / gh,
    ));
    const x = ((canvas.clientWidth - (gw * scale + 4 * (b.maxZ + 1))) / 2 - b.minX * scale) + tile.x * scale + tile.z * 4;
    const y = ((canvas.clientHeight - (gh * scale + 4 * (b.maxZ + 1))) / 2 - b.minY * scale) + tile.y * scale - tile.z * 4;
    const w = 2 * scale;
    return {
      screen: { x: rect.left + x + w / 2, y: rect.top + y + w / 2 },
      borderX: x + w / 2,
      borderY: y + 1,
    };
  })()`);
}

function isSelectedGold(pixel) {
  return pixel[0] > 220 && pixel[1] > 200 && pixel[2] < 180;
}

async function testControlClearanceAndGameTouches(devtools, origin, viewport) {
  const page = await createIsolatedPage(devtools, origin, viewport);
  try {
    const { sessionId } = page;
    await waitForPage(
      devtools,
      sessionId,
      `document.readyState === 'complete' && !document.querySelector('#a2hs').hidden && !document.querySelector('[data-screen="howto"]').hidden`,
      'fresh app with visible Add to Home Screen banner',
    );
    assert.equal(await evaluate(devtools, sessionId, 'localStorage.length'), 0, 'each viewport starts with a fresh isolated origin storage');
    assert.equal(await evaluate(devtools, sessionId, `localStorage.getItem('mahjongcalm:v1')`), null, 'no saved game profile exists at startup');

    await touchSelector(devtools, sessionId, '#btn-howto-ok');
    await waitForPage(devtools, sessionId, `!document.querySelector('[data-screen="home"]').hidden`, 'home screen after touch');
    await touchSelector(devtools, sessionId, '#btn-play');
    await waitForPage(devtools, sessionId, `!document.querySelector('[data-screen="play"]').hidden && !!document.querySelector('#board').getContext('2d')`, 'game board after touch');
    assert.equal(await evaluate(devtools, sessionId, `localStorage.getItem('mahjongcalm:v1')`), null, 'starting a game does not write saved progress');

    const bannerVisible = await evaluate(devtools, sessionId, `!document.querySelector('#a2hs').hidden`);
    assert.equal(bannerVisible, true, 'A2HS banner remains visible during the touch regression');

    assertControlClearance(await measureControlClearance(devtools, sessionId), viewport);

    const candidate = await evaluate(devtools, sessionId, `(async () => {
      const [{ LAYOUTS }, { createGame, isFree }] = await Promise.all([
        import('/mahjongcalm/src/layouts/index.ts'),
        import('/mahjongcalm/src/game/engine.ts'),
      ]);
      const expected = createGame(LAYOUTS[0], () => 0.37);
      const free = expected.tiles.filter((tile) => isFree(tile, expected.tiles));
      const first = free.find((tile) => free.some((other) => other.face !== tile.face));
      const second = first && free.find((tile) => tile.face !== first.face);
      if (!first || !second) throw new Error('Deterministic starting deal has no free mismatched pair');
      const matchFirst = free.find((tile) => free.some((other) => other.id !== tile.id && other.face === tile.face));
      const matchSecond = matchFirst && free.find((tile) => tile.id !== matchFirst.id && tile.face === matchFirst.face);
      if (!matchFirst || !matchSecond) throw new Error('Deterministic starting deal has no free matching pair');
      const historyProbe = free.find((tile) => tile.id !== matchFirst.id && tile.id !== matchSecond.id);
      if (!historyProbe) throw new Error('Deterministic starting deal has no extra free tile for Undo-history validation');
      const b = expected.tiles.reduce((bounds, tile) => ({
        minX: Math.min(bounds.minX, tile.x), minY: Math.min(bounds.minY, tile.y),
        maxX: Math.max(bounds.maxX, tile.x + 2), maxY: Math.max(bounds.maxY, tile.y + 2),
        maxZ: Math.max(bounds.maxZ, tile.z),
      }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: 0 });
      const canvas = document.querySelector('#board');
      const rect = canvas.getBoundingClientRect();
      const gw = b.maxX - b.minX;
      const gh = b.maxY - b.minY;
      const scale = Math.max(8, Math.min(
        (canvas.clientWidth - 32 - 4 * (b.maxZ + 1)) / gw,
        (canvas.clientHeight - 32 - 4 * (b.maxZ + 1)) / gh,
      ));
      const boardW = gw * scale + 4 * (b.maxZ + 1);
      const boardH = gh * scale + 4 * (b.maxZ + 1);
      const ox = (canvas.clientWidth - boardW) / 2 - b.minX * scale;
      const oy = (canvas.clientHeight - boardH) / 2 - b.minY * scale;
      const point = (tile) => {
        const x = ox + tile.x * scale + tile.z * 4;
        const y = oy + tile.y * scale - tile.z * 4;
        const w = 2 * scale;
        const h = 2 * scale;
        return {
          x: rect.left + x + w / 2,
          y: rect.top + y + h / 2,
          borderX: x + w / 2,
          borderY: y + 1,
        };
      };
      return {
        first: point(first),
        second: point(second),
        firstId: first.id,
        matchFirst: point(matchFirst),
        matchSecond: point(matchSecond),
        historyProbe: point(historyProbe),
      };
    })()`);

    const borderPixel = async (point) => await evaluate(devtools, sessionId, `(() => {
      const ctx = document.querySelector('#board').getContext('2d');
      return Array.from(ctx.getImageData(Math.round(${point.borderX}), Math.round(${point.borderY}), 1, 1).data);
    })()`);
    const firstBefore = await borderPixel(candidate.first);
    const secondBefore = await borderPixel(candidate.second);
    assert.equal(isSelectedGold(firstBefore), false, 'first candidate starts unselected');
    assert.equal(isSelectedGold(secondBefore), false, 'second candidate starts unselected');
    const beforeCounts = await evaluate(devtools, sessionId, `({ left: document.querySelector('#hud-left').textContent, moves: document.querySelector('#hud-moves').textContent })`);

    await touchAt(devtools, sessionId, candidate.first);
    await waitUntil(async () => isSelectedGold(await borderPixel(candidate.first)), `first free tile selection feedback at ${JSON.stringify(candidate.first)} (pixel ${JSON.stringify(await borderPixel(candidate.first))})`);
    assert.equal(isSelectedGold(await borderPixel(candidate.second)), false, 'unselected tile keeps normal border feedback');

    if (viewport.width === 320 && viewport.height === 568) {
      await setViewport(devtools, sessionId, { width: 568, height: 320 });
      const landscapeClearance = await measureControlClearance(devtools, sessionId);
      assertControlClearance(landscapeClearance, { width: 568, height: 320 });
      console.log(`PASS resized landscape footer geometry: ${JSON.stringify(landscapeClearance.map(({ id, rect, overlapY }) => ({ id, top: rect.top, bottom: rect.bottom, overlapY })))}`);
      const landscapeTile = await selectedTilePosition(devtools, sessionId, candidate.firstId);
      await waitUntil(async () => isSelectedGold(await borderPixel(landscapeTile)), 'selected tile remains highlighted after portrait-to-landscape resize');
      assert.deepEqual(
        await evaluate(devtools, sessionId, `({ left: document.querySelector('#hud-left').textContent, moves: document.querySelector('#hud-moves').textContent })`),
        beforeCounts,
        'portrait-to-landscape resize preserves tile and move counters',
      );

      await setViewport(devtools, sessionId, { width: 320, height: 568 });
      const returnedPortraitClearance = await measureControlClearance(devtools, sessionId);
      assertControlClearance(returnedPortraitClearance, { width: 320, height: 568 });
      console.log(`PASS returned portrait footer geometry: ${JSON.stringify(returnedPortraitClearance.map(({ id, rect, overlapY }) => ({ id, top: rect.top, bottom: rect.bottom, overlapY })))}`);
      const returnedTile = await selectedTilePosition(devtools, sessionId, candidate.firstId);
      await waitUntil(async () => isSelectedGold(await borderPixel(returnedTile)), 'selected tile remains highlighted after landscape-to-portrait resize');
      assert.deepEqual(
        await evaluate(devtools, sessionId, `({ left: document.querySelector('#hud-left').textContent, moves: document.querySelector('#hud-moves').textContent })`),
        beforeCounts,
        'return-to-portrait resize preserves tile and move counters',
      );
      await touchAt(devtools, sessionId, returnedTile.screen);
      await waitUntil(async () => !isSelectedGold(await borderPixel(returnedTile)), 'retapping the selected tile after resize clears selection');
      assert.deepEqual(
        await evaluate(devtools, sessionId, `({ left: document.querySelector('#hud-left').textContent, moves: document.querySelector('#hud-moves').textContent })`),
        beforeCounts,
        'canceling the resized selection keeps remaining tiles and moves unchanged',
      );
      await touchAt(devtools, sessionId, candidate.first);
      await waitUntil(async () => isSelectedGold(await borderPixel(candidate.first)), 'first free tile can be selected again after resize cancel');
    }

    await touchAt(devtools, sessionId, candidate.second);
    await waitUntil(async () => isSelectedGold(await borderPixel(candidate.second)), 'mismatch changes selection feedback to the second tile');
    assert.equal(isSelectedGold(await borderPixel(candidate.first)), false, 'mismatch clears selection feedback from the first tile');
    assert.deepEqual(
      await evaluate(devtools, sessionId, `({ left: document.querySelector('#hud-left').textContent, moves: document.querySelector('#hud-moves').textContent })`),
      beforeCounts,
      'deliberate mismatch leaves remaining tiles and move count unchanged',
    );
    assert.equal(await evaluate(devtools, sessionId, `localStorage.getItem('mahjongcalm:v1')`), null, 'mismatch does not write saved progress');

    await touchAt(devtools, sessionId, candidate.second);
    await waitUntil(async () => !isSelectedGold(await borderPixel(candidate.second)), 'second tap on selected tile clears selection feedback');
    assert.deepEqual(
      await evaluate(devtools, sessionId, `({ left: document.querySelector('#hud-left').textContent, moves: document.querySelector('#hud-moves').textContent })`),
      beforeCounts,
      'canceling selection keeps tiles and moves unchanged',
    );
    assert.equal(await evaluate(devtools, sessionId, `document.querySelector('#btn-undo').disabled`), true, 'Undo is unavailable before any match');

    await touchAt(devtools, sessionId, candidate.first);
    await waitUntil(async () => isSelectedGold(await borderPixel(candidate.first)), 'first tile can be selected before blank-board cancellation');
    const blankBoardPoint = await evaluate(devtools, sessionId, `(() => {
      const rect = document.querySelector('#board').getBoundingClientRect();
      return { x: rect.left + 8, y: rect.top + 8 };
    })()`);
    await touchAt(devtools, sessionId, blankBoardPoint);
    await waitUntil(async () => !isSelectedGold(await borderPixel(candidate.first)), 'tap on blank board space clears the selected tile');
    assert.deepEqual(
      await evaluate(devtools, sessionId, `({ left: document.querySelector('#hud-left').textContent, moves: document.querySelector('#hud-moves').textContent })`),
      beforeCounts,
      'blank-board deselection keeps remaining tiles and move count unchanged',
    );

    await touchAt(devtools, sessionId, candidate.matchFirst);
    await touchAt(devtools, sessionId, candidate.matchSecond);
    await waitForPage(
      devtools,
      sessionId,
      `!document.querySelector('#btn-undo').disabled && document.querySelector('#hud-left').textContent === String(Number(${JSON.stringify(beforeCounts.left)}) - 2) && document.querySelector('#hud-moves').textContent === String(Number(${JSON.stringify(beforeCounts.moves)}) + 1)`,
      'matched pair enables Undo and updates the HUD',
    );
    const matchedCounts = await evaluate(devtools, sessionId, `({ left: document.querySelector('#hud-left').textContent, moves: document.querySelector('#hud-moves').textContent })`);
    await touchAt(devtools, sessionId, candidate.historyProbe);
    await waitUntil(async () => isSelectedGold(await borderPixel(candidate.historyProbe)), 'remaining free tile can be selected while Undo history exists');
    await touchAt(devtools, sessionId, blankBoardPoint);
    await waitUntil(async () => !isSelectedGold(await borderPixel(candidate.historyProbe)), 'blank tap clears selection without discarding Undo history');
    assert.deepEqual(
      await evaluate(devtools, sessionId, `({ left: document.querySelector('#hud-left').textContent, moves: document.querySelector('#hud-moves').textContent })`),
      matchedCounts,
      'blank-tap deselection preserves board count and move count after a match',
    );
    assert.equal(await evaluate(devtools, sessionId, `document.querySelector('#btn-undo').disabled`), false, 'blank-tap deselection preserves the available Undo history');
    await touchSelector(devtools, sessionId, '#btn-undo');
    await waitForPage(
      devtools,
      sessionId,
      `document.querySelector('#btn-undo').disabled && document.querySelector('#hud-left').textContent === ${JSON.stringify(beforeCounts.left)} && document.querySelector('#hud-moves').textContent === ${JSON.stringify(beforeCounts.moves)} && document.querySelector('#toast').textContent === 'Last match undone'`,
      'Undo restores the matched pair and move count',
    );

    await touchSelector(devtools, sessionId, '#btn-shuffle');
    await waitForPage(devtools, sessionId, `!document.querySelector('#toast').hidden && document.querySelector('#toast').textContent.startsWith('Shuffled')`, 'Shuffle touch reaches its action');
    assert.equal(await evaluate(devtools, sessionId, `document.querySelector('#btn-undo').disabled`), true, 'Shuffle clears one-step undo history');
    await waitForPage(devtools, sessionId, `document.querySelector('#toast').hidden`, 'Shuffle feedback clears before next control touch', 5_000);

    await touchSelector(devtools, sessionId, '#btn-retry');
    await waitForPage(devtools, sessionId, `!document.querySelector('#overlay-interstitial').hidden`, 'Retry touch opens its existing interstitial');
    await touchSelector(devtools, sessionId, '#btn-interstitial-dismiss');
    await waitForPage(devtools, sessionId, `document.querySelector('#overlay-interstitial').hidden && !document.querySelector('[data-screen="play"]').hidden`, 'Retry returns to a fresh game after touch dismiss');

    await touchSelector(devtools, sessionId, '#btn-play-layouts');
    await waitForPage(devtools, sessionId, `!document.querySelector('[data-screen="layouts"]').hidden && document.querySelector('#layout-grid .layout-card')`, 'Layouts touch opens layout selection');
    await touchSelector(devtools, sessionId, '#layout-grid .layout-card');
    await waitForPage(devtools, sessionId, `!document.querySelector('[data-screen="play"]').hidden`, 'layout touch starts gameplay');
    assert.equal(await evaluate(devtools, sessionId, `localStorage.getItem('mahjongcalm:v1')`), null, 'the entire isolated regression leaves the saved progress blob untouched');

    console.log(`PASS ${viewport.width}x${viewport.height}: touch controls, blank-tap deselection, Undo and preserved Undo history verified; fresh isolated storage has no saved progress`);
  } finally {
    await page.close();
  }
}

async function main() {
  const vitePort = await reservePort();
  const { child: vite, output: viteOutput } = await startVite(vitePort);
  let browser;
  try {
    browser = await openBrowser();
    const origin = `http://127.0.0.1:${vitePort}`;
    for (const viewport of viewports) {
      await testControlClearanceAndGameTouches(browser.devtools, origin, viewport);
    }
    console.log('PASS all compact touch-layout regressions (fresh isolated storage contexts; temporary Chromium profile and Vite server)');
  } finally {
    if (browser) {
      browser.devtools.close();
      browser.child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveClose) => browser.child.once('close', resolveClose)),
        sleep(2_000),
      ]);
      if (browser.child.exitCode === null) {
        browser.child.kill('SIGKILL');
        await Promise.race([
          new Promise((resolveClose) => browser.child.once('close', resolveClose)),
          sleep(2_000),
        ]);
      }
      await rm(browser.profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
    vite.kill('SIGTERM');
    await Promise.race([
      new Promise((resolveClose) => vite.once('close', resolveClose)),
      sleep(2_000),
    ]);
    if (vite.exitCode === null) {
      vite.kill('SIGKILL');
      await Promise.race([
        new Promise((resolveClose) => vite.once('close', resolveClose)),
        sleep(2_000),
      ]);
    }
    if (vite.exitCode && vite.exitCode !== 0) console.error(viteOutput());
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
