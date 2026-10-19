/// <reference types="bun" />
/**
 * Screenshots a page in headless Chromium.
 *
 *   bun run shot <url> <out.png> [width] [height] [--full]
 *
 * Defaults to 1440x900. `--full` captures the whole page while keeping the
 * viewport height, so full-screen (100dvh) sections render as they do live.
 */

import { rmSync } from 'node:fs';

const args = process.argv.slice(2);
const full = args.includes('--full');
const [url, out, w = '1440', h = '900'] = args.filter((a) => a !== '--full');
if (!url || !out) {
  console.error('usage: bun run shot <url> <out.png> [width] [height] [--full]');
  process.exit(1);
}

const port = 9300 + Math.floor(Math.random() * 500);
const profile = `/tmp/screenshot-${port}`;
const browser = Bun.spawn(
  [
    'chromium',
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdout: 'ignore', stderr: 'ignore' },
);
process.on('exit', () => {
  browser.kill();
  rmSync(profile, { recursive: true, force: true });
});

let wsUrl = '';
for (let i = 0; i < 50 && !wsUrl; i++) {
  await Bun.sleep(200);
  try {
    const targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as {
      type: string;
      webSocketDebuggerUrl: string;
    }[];
    wsUrl = targets.find((t) => t.type === 'page')?.webSocketDebuggerUrl ?? '';
  } catch {}
}

if (!wsUrl) {
  console.error('Chromium did not start; is `chromium` installed and on PATH?');
  process.exit(1);
}

const ws = new WebSocket(wsUrl);
await new Promise((resolve) => (ws.onopen = resolve));
let id = 0;
const pending = new Map<number, (value: any) => void>();
let onLoad = () => {};
ws.onmessage = (event) => {
  const msg = JSON.parse(String(event.data));
  if (msg.method === 'Page.loadEventFired') onLoad();
  pending.get(msg.id)?.(msg.result);
  pending.delete(msg.id);
};
const send = (method: string, params: object = {}) =>
  new Promise<any>((resolve) => {
    pending.set(++id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

const width = Number(w);
const height = Number(h);
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 600,
});
await send('Page.enable');
const loaded = new Promise<void>((resolve) => (onLoad = resolve));
await send('Page.navigate', { url });
await Promise.race([loaded, Bun.sleep(15000)]);
await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });

let clip;
if (full) {
  const metrics = await send('Page.getLayoutMetrics');
  clip = { x: 0, y: 0, width, height: Math.ceil(metrics.cssContentSize.height), scale: 1 };
}
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: full,
  ...(clip ? { clip } : {}),
});
await Bun.write(out, Buffer.from(shot.data, 'base64'));
console.log(`wrote ${out}`);
ws.close();
// Chromium writes to its profile while shutting down, so remove it after exit.
browser.kill();
await browser.exited;
rmSync(profile, { recursive: true, force: true });
