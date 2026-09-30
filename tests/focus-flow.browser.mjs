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
  const profile = await mkdtemp(join(tmpdir(), 'mahjongcalm-focus-chrome-'));
  const child = spawn(chromeBinary, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    `--remote-debugging-address=127.0.0.1`,
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

async function createIsolatedPage(devtools, origin, viewport, route) {
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
  const navigation = await devtools.send('Page.navigate', { url: `${origin}${route}` }, sessionId);
  if (navigation.errorText) throw new Error(`Navigation failed: ${navigation.errorText}`);
  return {
    sessionId,
    close: async () => {
      try { await devtools.send('Target.closeTarget', { targetId }); } catch {}
      try { await devtools.send('Target.disposeBrowserContext', { browserContextId }); } catch {}
    },
  };
}

async function waitForPage(devtools, sessionId, expression, description) {
  await waitUntil(async () => await evaluate(devtools, sessionId, expression), description);
}

async function pressKey(devtools, sessionId, key, shift = false) {
  const keyCode = key === 'Tab' ? 9 : 13;
  const code = key === 'Tab' ? 'Tab' : 'Enter';
  const modifiers = shift ? 8 : 0;
  const params = { key, code, modifiers, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode };
  await devtools.send('Input.dispatchKeyEvent', { ...params, type: 'keyDown' }, sessionId);
  await devtools.send('Input.dispatchKeyEvent', { ...params, type: 'keyUp' }, sessionId);
  await sleep(25);
}

async function clickSelector(devtools, sessionId, selector) {
  const point = await evaluate(devtools, sessionId, `(() => {
    const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await devtools.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point }, sessionId);
  await devtools.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 }, sessionId);
  await devtools.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 }, sessionId);
  await sleep(25);
}

async function activeId(devtools, sessionId) {
  return await evaluate(devtools, sessionId, 'document.activeElement?.id ?? ""');
}

async function inspectDialog(devtools, sessionId, selector) {
  return await evaluate(devtools, sessionId, `(() => {
    const dialog = document.querySelector(${JSON.stringify(selector)});
    if (!dialog) return { exists: false };
    const rect = dialog.getBoundingClientRect();
    const labelId = dialog.getAttribute('aria-labelledby');
    const label = labelId ? document.getElementById(labelId)?.textContent?.trim() ?? null : null;
    return {
      exists: true,
      focused: document.activeElement === dialog,
      role: dialog.getAttribute('role'),
      modal: dialog.getAttribute('aria-modal'),
      label,
      viewport: { width: innerWidth, height: innerHeight },
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      buttons: Array.from(dialog.querySelectorAll('button:not([disabled])')).map((button) => {
        const box = button.getBoundingClientRect();
        return { id: button.id, left: box.left, top: box.top, right: box.right, bottom: box.bottom };
      }),
    };
  })()`);
}

function assertDialogInViewport(state, expectedLabel, viewport, description) {
  assert.equal(state.exists, true, `${description}: dialog exists`);
  assert.equal(state.focused, true, `${description}: named dialog panel owns focus`);
  assert.equal(state.role, 'dialog', `${description}: semantic dialog role`);
  assert.equal(state.modal, 'true', `${description}: modal semantics`);
  assert.equal(state.label, expectedLabel, `${description}: accessible label from its heading`);
  assert.deepEqual(state.viewport, viewport, `${description}: browser viewport`);
  const withinViewport = (box) => box.left >= -0.5 && box.top >= -0.5 && box.right <= viewport.width + 0.5 && box.bottom <= viewport.height + 0.5;
  assert.ok(withinViewport(state.rect), `${description}: panel is within viewport (${JSON.stringify(state.rect)})`);
  for (const button of state.buttons) {
    assert.ok(withinViewport(button), `${description}: ${button.id} is within viewport (${JSON.stringify(button)})`);
  }
}

async function testActualAppInterstitial(devtools, origin, viewport) {
  const page = await createIsolatedPage(devtools, origin, viewport, '/mahjongcalm/');
  try {
    const { sessionId } = page;
    await waitForPage(devtools, sessionId, `document.querySelector('[data-screen="howto"]')?.hidden === false`, 'fresh app home/how-to screen');
    assert.equal(await evaluate(devtools, sessionId, 'localStorage.length'), 0, 'actual app test begins with empty disposable origin storage');
    await evaluate(devtools, sessionId, `document.querySelector('#btn-howto-ok').click()`);
    await waitForPage(devtools, sessionId, `document.querySelector('[data-screen="home"]')?.hidden === false`, 'home screen after How to play');
    await evaluate(devtools, sessionId, `document.querySelector('#btn-play').click()`);
    await waitForPage(devtools, sessionId, `document.querySelector('[data-screen="play"]')?.hidden === false`, 'play screen');
    await evaluate(devtools, sessionId, `document.querySelector('#btn-menu').click()`);
    await waitForPage(devtools, sessionId, `!document.querySelector('#overlay-interstitial').hidden && document.activeElement === document.querySelector('#overlay-interstitial .panel')`, 'real app menu interstitial focus');

    const state = await inspectDialog(devtools, sessionId, '#overlay-interstitial .panel');
    assertDialogInViewport(state, 'Ad placeholder (stub)', viewport, 'real app interstitial');
    assert.deepEqual(state.buttons.map((button) => button.id), ['btn-interstitial-continue', 'btn-interstitial-dismiss']);

    await pressKey(devtools, sessionId, 'Tab');
    assert.equal(await activeId(devtools, sessionId), 'btn-interstitial-continue', 'Tab from dialog panel enters first control');
    await pressKey(devtools, sessionId, 'Tab');
    assert.equal(await activeId(devtools, sessionId), 'btn-interstitial-dismiss', 'Tab advances within the dialog');
    await pressKey(devtools, sessionId, 'Tab');
    assert.equal(await activeId(devtools, sessionId), 'btn-interstitial-continue', 'forward Tab wraps to first control');
    await pressKey(devtools, sessionId, 'Tab', true);
    assert.equal(await activeId(devtools, sessionId), 'btn-interstitial-dismiss', 'reverse Tab wraps to last control');
    await evaluate(devtools, sessionId, `document.querySelector('#btn-interstitial-dismiss').click()`);
    await waitForPage(devtools, sessionId, `document.querySelector('#overlay-interstitial').hidden && document.querySelector('[data-screen="home"]').hidden === false`, 'dismissed app interstitial returns home');
  } finally {
    await page.close();
  }
}

async function testSyntheticDismissToCleared(devtools, origin, viewport) {
  const page = await createIsolatedPage(devtools, origin, viewport, '/mahjongcalm/tests/fixtures/focus-flow.html');
  try {
    const { sessionId } = page;
    await waitForPage(devtools, sessionId, 'window.fixtureReady === true', 'synthetic focus fixture');
    assert.equal(await evaluate(devtools, sessionId, 'localStorage.length'), 0, 'synthetic fixture uses a separate empty disposable storage context');
    await clickSelector(devtools, sessionId, '#finish-layout');
    await waitUntil(
      async () => await evaluate(devtools, sessionId, `!document.querySelector('#overlay-interstitial').hidden && document.activeElement === document.querySelector('#interstitial-dialog')`),
      'synthetic win interstitial receives initial focus after pointer activation',
      1_000,
    );

    const interstitial = await inspectDialog(devtools, sessionId, '#interstitial-dialog');
    assertDialogInViewport(interstitial, 'Ad placeholder (stub)', viewport, 'synthetic interstitial');
    assert.deepEqual(interstitial.buttons.map((button) => button.id), ['btn-interstitial-continue', 'btn-interstitial-dismiss']);

    await pressKey(devtools, sessionId, 'Tab');
    assert.equal(await activeId(devtools, sessionId), 'btn-interstitial-continue');
    await pressKey(devtools, sessionId, 'Tab');
    assert.equal(await activeId(devtools, sessionId), 'btn-interstitial-dismiss');
    await pressKey(devtools, sessionId, 'Tab');
    assert.equal(await activeId(devtools, sessionId), 'btn-interstitial-continue', 'forward Tab wraps inside synthetic interstitial');
    await pressKey(devtools, sessionId, 'Tab', true);
    assert.equal(await activeId(devtools, sessionId), 'btn-interstitial-dismiss', 'reverse Tab wraps inside synthetic interstitial');
    await evaluate(devtools, sessionId, `document.querySelector('#btn-interstitial-dismiss').click()`);
    await waitForPage(devtools, sessionId, `!document.querySelector('#overlay-win').hidden && document.activeElement === document.querySelector('#win-dialog')`, 'Dismiss moves focus to the Cleared result panel');

    const result = await inspectDialog(devtools, sessionId, '#win-dialog');
    assertDialogInViewport(result, 'Cleared!', viewport, 'Cleared result');
    assert.deepEqual(result.buttons.map((button) => button.id), ['btn-next', 'btn-win-share', 'btn-win-replay', 'btn-win-layouts', 'btn-win-home']);

    await pressKey(devtools, sessionId, 'Tab');
    assert.equal(await activeId(devtools, sessionId), 'btn-next', 'Tab from Cleared panel enters first result control');
    for (let index = 1; index < result.buttons.length; index += 1) await pressKey(devtools, sessionId, 'Tab');
    assert.equal(await activeId(devtools, sessionId), 'btn-win-home', 'forward Tab reaches final result control');
    await pressKey(devtools, sessionId, 'Tab');
    assert.equal(await activeId(devtools, sessionId), 'btn-next', 'forward Tab wraps inside Cleared result');
    await pressKey(devtools, sessionId, 'Tab', true);
    assert.equal(await activeId(devtools, sessionId), 'btn-win-home', 'reverse Tab wraps inside Cleared result');
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
      await testActualAppInterstitial(browser.devtools, origin, viewport);
      await testSyntheticDismissToCleared(browser.devtools, origin, viewport);
      console.log(`PASS ${viewport.width}x${viewport.height}: actual app interstitial focus/Tab containment; synthetic win interstitial initial focus and Dismiss-to-Cleared focus/Tab containment; named panels and controls fit viewport`);
    }
    console.log('PASS all focus-flow browser regressions (fresh isolated browser contexts; temporary Chromium profile and Vite server)');
  } finally {
    if (browser) {
      browser.devtools.close();
      browser.child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveClose) => browser.child.once('close', resolveClose)),
        sleep(2_000),
      ]);
      if (browser.child.exitCode === null) browser.child.kill('SIGKILL');
      await rm(browser.profile, { recursive: true, force: true });
    }
    vite.kill('SIGTERM');
    await Promise.race([
      new Promise((resolveClose) => vite.once('close', resolveClose)),
      sleep(2_000),
    ]);
    if (vite.exitCode === null) vite.kill('SIGKILL');
    if (vite.exitCode && vite.exitCode !== 0) console.error(viteOutput());
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
