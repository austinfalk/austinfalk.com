/// <reference types="bun" />
/**
 * Drives the built site the way a visitor does: a local Cloudflare server
 * (`wrangler dev` on dist/, so _redirects and _headers apply) plus a headless
 * Chromium that stays up between commands.
 *
 *   bun .claude/skills/verify-site/scripts/site.ts <command> [args]
 *
 *   up                         start server + browser for a new run (build first)
 *   doctor                     is this run's instance worth driving?
 *   goto <path> [--width W] [--height H] [--as NAME]
 *   click --role ROLE --name NAME [--nth N]
 *   press <Key> [--times N] [--shift]   Tab, Enter, Escape, ...
 *   focus                      describe the focused element
 *   snapshot <NAME>            accessibility tree -> NAME.aria.txt
 *   shot <NAME> [--full]       screenshot -> NAME.png
 *   eval <expression>          read-only page inspection, prints JSON
 *   fetch <path> [--as NAME]   raw HTTP (no redirects followed)
 *   down                       stop server + browser; evidence stays
 *
 * Runs live in .verify/<run-id>/ (gitignored). Commands use $VERIFY_RUN, else
 * the run named in .verify/current.
 */

import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { join, relative } from 'node:path';

type State = {
  run: string;
  dir: string;
  base: string;
  serverPid: number;
  browserPid: number;
  cdpPort: number;
  head: string;
  distBuilt: number;
  viewport: { width: number; height: number };
};

const root = join(import.meta.dir, '../../../..');
const verifyRoot = join(root, '.verify');
const [command, ...rest] = process.argv.slice(2);

const flag = (name: string) => {
  const i = rest.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = rest[i + 1];
  rest.splice(i, 2);
  return value;
};
const bool = (name: string) => {
  const i = rest.indexOf(`--${name}`);
  if (i !== -1) rest.splice(i, 1);
  return i !== -1;
};
const die = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};
const print = (value: unknown) => console.log(JSON.stringify(value, null, 2));

const freePort = () =>
  new Promise<number>((resolve) => {
    const srv = createServer().listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
  });

const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const newestMtime = (dir: string): number =>
  readdirSync(dir, { withFileTypes: true }).reduce((max, e) => {
    const p = join(dir, e.name);
    return Math.max(max, e.isDirectory() ? newestMtime(p) : statSync(p).mtimeMs);
  }, 0);

const sourceNewerThanDist = () => {
  const dist = join(root, 'dist/index.html');
  const src = Math.max(newestMtime(join(root, 'src')), newestMtime(join(root, 'public')));
  return src > statSync(dist).mtimeMs;
};

const gitHead = async () =>
  (await Bun.$`git -C ${root} rev-parse --short HEAD`.text()).trim() +
  ((await Bun.$`git -C ${root} status --porcelain -- src public`.text()).trim() ? '+dirty' : '');

function loadState(): State {
  const run =
    process.env.VERIFY_RUN ||
    (existsSync(join(verifyRoot, 'current'))
      ? readFileSync(join(verifyRoot, 'current'), 'utf8').trim()
      : '');
  const file = join(verifyRoot, run, 'state.json');
  if (!run || !existsSync(file)) die('No active run. Start one with `up`.');
  return JSON.parse(readFileSync(file, 'utf8'));
}

const saveState = (state: State) =>
  Bun.write(join(state.dir, 'state.json'), JSON.stringify(state, null, 2));

// --- Chrome DevTools Protocol -------------------------------------------------

type Cdp = {
  send: (method: string, params?: object) => Promise<any>;
  on: (method: string, handler: (params: any) => void) => void;
  close: () => void;
};

async function connect(state: State): Promise<Cdp> {
  const targets = (await (await fetch(`http://127.0.0.1:${state.cdpPort}/json`)).json()) as {
    type: string;
    webSocketDebuggerUrl: string;
  }[];
  const page = targets.find((t) => t.type === 'page') ?? die('Browser has no page.');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  const handlers = new Map<string, ((p: any) => void)[]>();
  ws.onmessage = (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p?.reject(new Error(`${msg.error.message}`)) : p?.resolve(msg.result);
    } else handlers.get(msg.method)?.forEach((h) => h(msg.params));
  };
  const cdp: Cdp = {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        pending.set(++id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      }),
    on: (method, handler) => handlers.set(method, [...(handlers.get(method) ?? []), handler]),
    close: () => ws.close(),
  };
  const { width, height } = state.viewport;
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  // The browser starts with a mouse (see `up`); phone widths swap it for a
  // touch screen, so (hover: none) rules apply there as on a real phone.
  const touch = width < 600;
  if (touch)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  return cdp;
}

const evaluate = async (cdp: Cdp, expression: string) => {
  const res = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) die(`eval failed: ${res.exceptionDetails.exception?.description}`);
  return res.result.value;
};

const settle = (cdp: Cdp) =>
  evaluate(cdp, 'document.fonts.ready.then(() => new Promise(r => setTimeout(r, 300)))');

const where = (cdp: Cdp) =>
  evaluate(
    cdp,
    `(() => {
      const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      return {
        url: location.href,
        title: document.title,
        h1: document.querySelector('h1')?.textContent.trim() ?? null,
        scrollY: Math.round(scrollY),
        hashTarget: location.hash
          ? target
            ? { id: target.id, text: target.textContent.trim(), top: Math.round(target.getBoundingClientRect().top) }
            : 'missing'
          : null,
      };
    })()`,
  );

const describeFocus = (cdp: Cdp) =>
  evaluate(
    cdp,
    `(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { focused: 'body' };
      const s = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        name: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 80),
        href: el.getAttribute('href'),
        focusVisible: el.matches(':focus-visible'),
        outline: s.outlineStyle === 'none' ? 'none' : s.outlineWidth + ' ' + s.outlineStyle + ' ' + s.outlineColor,
        boxShadow: s.boxShadow,
        inViewport: (() => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; })(),
      };
    })()`,
  );

// --- commands -------------------------------------------------------------------

async function up() {
  if (!existsSync(join(root, 'dist/index.html'))) die('No build. Run `bun run build` first.');
  if (sourceNewerThanDist())
    die('src/ or public/ changed after the last build. Run `bun run build`.');
  const run = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')}-${Math.random().toString(36).slice(2, 6)}`;
  const dir = join(verifyRoot, run);
  mkdirSync(dir, { recursive: true });

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  // Detached so each process leads its own group; `down` kills the group,
  // which takes wrangler's workerd and Chromium's helpers with it.
  const server = spawn(
    join(root, 'node_modules/.bin/wrangler'),
    ['dev', '--port', String(port), '--ip', '127.0.0.1'],
    {
      cwd: root,
      detached: true,
      stdio: [
        'ignore',
        openSync(join(dir, 'wrangler.log'), 'a'),
        openSync(join(dir, 'wrangler.log'), 'a'),
      ],
    },
  );
  server.unref();

  const cdpPort = await freePort();
  const browser = spawn(
    'chromium',
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--disable-extensions',
      // Headless Chromium has no pointer, so it matches (hover: none) and hides
      // hover-only UI like the heading anchors. Give it a mouse.
      '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4',
      '--no-first-run',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${join(dir, '.profile')}`,
      'about:blank',
    ],
    { detached: true, stdio: 'ignore' },
  );
  browser.unref();

  const state: State = {
    run,
    dir,
    base,
    serverPid: server.pid!,
    browserPid: browser.pid!,
    cdpPort,
    head: await gitHead(),
    distBuilt: statSync(join(root, 'dist/index.html')).mtimeMs,
    viewport: { width: 1440, height: 900 },
  };
  await saveState(state);
  await Bun.write(join(verifyRoot, 'current'), run);

  // Ready means the home page is served, not just that the port answers.
  let ready = false;
  for (let i = 0; i < 240 && !ready; i++) {
    try {
      const res = await fetch(base, { redirect: 'manual' });
      ready = res.status === 200 && (await res.text()).includes('<h1');
    } catch {}
    if (!ready) await Bun.sleep(250);
  }
  let cdpReady = false;
  for (let i = 0; i < 50 && !cdpReady; i++) {
    try {
      cdpReady = (await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).ok;
    } catch {
      await Bun.sleep(200);
    }
  }
  if (!ready || !cdpReady) {
    await down(state);
    die(
      `Not ready (server: ${ready}, browser: ${cdpReady}). See ${relative(root, dir)}/wrangler.log`,
    );
  }
  print({ run, base, evidence: relative(root, dir), hint: `export VERIFY_RUN=${run}` });
}

async function doctor(state: State) {
  const checks: Record<string, boolean | string> = {};
  checks.serverProcess = alive(state.serverPid);
  checks.browserProcess = alive(state.browserPid);
  try {
    const res = await fetch(state.base, { redirect: 'manual' });
    const html = await res.text();
    checks.homeServed = res.status === 200 && html.includes('<title>Austin Falk');
  } catch {
    checks.homeServed = false;
  }
  try {
    checks.browser = (
      (await (await fetch(`http://127.0.0.1:${state.cdpPort}/json/version`)).json()) as any
    ).Browser;
  } catch {
    checks.browser = false;
  }
  const distBuilt = existsSync(join(root, 'dist/index.html'))
    ? statSync(join(root, 'dist/index.html')).mtimeMs
    : 0;
  checks.sameBuildAsUp = distBuilt === state.distBuilt;
  checks.buildCurrent = distBuilt > 0 && !sourceNewerThanDist();
  const head = await gitHead();
  checks.sameCommitAsUp = head === state.head || `${state.head} -> ${head}`;
  const ok = Object.values(checks).every(
    (v) => v === true || (typeof v === 'string' && !v.includes('->')),
  );
  print({ run: state.run, base: state.base, ok, checks });
  if (!ok) process.exit(1);
}

async function goto(state: State) {
  const [path = '/'] = rest;
  const name = flag('as');
  const width = flag('width');
  const height = flag('height');
  if (width)
    state.viewport = {
      width: Number(width),
      height: Number(height ?? (Number(width) < 600 ? 844 : 900)),
    };
  await saveState(state);

  const cdp = await connect(state);
  const errors: string[] = [];
  const scripts: string[] = [];
  const failed: string[] = [];
  cdp.on('Runtime.exceptionThrown', (p) =>
    errors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text),
  );
  cdp.on(
    'Runtime.consoleAPICalled',
    (p) =>
      p.type === 'error' && errors.push(p.args.map((a: any) => a.value ?? a.description).join(' ')),
  );
  cdp.on(
    'Log.entryAdded',
    (p) => p.entry.level === 'error' && errors.push(`${p.entry.text} ${p.entry.url ?? ''}`.trim()),
  );
  cdp.on(
    'Network.requestWillBeSent',
    (p) =>
      p.type === 'Script' &&
      !p.request.url.startsWith('chrome-extension://') &&
      scripts.push(p.request.url),
  );
  cdp.on(
    'Network.responseReceived',
    (p) => p.response.status >= 400 && failed.push(`${p.response.status} ${p.response.url}`),
  );
  cdp.on(
    'Network.loadingFailed',
    (p) => !p.canceled && failed.push(`${p.errorText} ${p.requestId}`),
  );
  await Promise.all(
    ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable'].map((m) => cdp.send(m)),
  );
  const loaded = new Promise((resolve) => cdp.on('Page.loadEventFired', resolve));
  const nav = await cdp.send('Page.navigate', { url: new URL(path, state.base).href });
  if (nav.errorText) die(`navigation failed: ${nav.errorText}`);
  await Promise.race([loaded, Bun.sleep(15000)]);
  await settle(cdp);
  const result = {
    ...(await where(cdp)),
    viewport: state.viewport,
    errors,
    failedRequests: failed,
    scripts,
  };
  cdp.close();
  if (name) await Bun.write(join(state.dir, `${name}.load.json`), JSON.stringify(result, null, 2));
  print(result);
}

async function click(state: State) {
  const role = flag('role') ?? die('--role is required (link, button, ...)');
  const name = flag('name') ?? die('--name is required (the accessible name)');
  const nth = Number(flag('nth') ?? 0);
  const cdp = await connect(state);
  await Promise.all(['Page.enable', 'DOM.enable', 'Accessibility.enable'].map((m) => cdp.send(m)));
  const { root: doc } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodes } = await cdp.send('Accessibility.queryAXTree', {
    nodeId: doc.nodeId,
    role,
    accessibleName: name,
  });
  const matches = nodes.filter((n: any) => !n.ignored && n.backendDOMNodeId);
  if (!matches[nth]) die(`No ${role} named "${name}" (found ${matches.length}).`);
  const backendNodeId = matches[nth].backendDOMNodeId;

  // Links that leave the site are checked, not followed.
  const { object } = await cdp.send('DOM.resolveNode', { backendNodeId });
  const attrs = (
    await cdp.send('Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration:
        'function () { return { href: this.href || null, target: this.target || null, rel: this.rel || null }; }',
      returnByValue: true,
    })
  ).result.value;
  if (
    attrs.href &&
    (attrs.target === '_blank' || new URL(attrs.href).origin !== new URL(state.base).origin)
  ) {
    cdp.close();
    print({
      clicked: false,
      reason: 'leaves the site; not followed',
      matches: matches.length,
      ...attrs,
    });
    return;
  }

  await cdp.send('DOM.scrollIntoViewIfNeeded', { backendNodeId });
  const { quads } = await cdp.send('DOM.getContentQuads', { backendNodeId });
  const q = quads[0];
  const x = (q[0] + q[2] + q[4] + q[6]) / 4;
  const y = (q[1] + q[3] + q[5] + q[7]) / 4;
  const navigated = new Promise((resolve) => {
    cdp.on('Page.loadEventFired', resolve);
    cdp.on('Page.navigatedWithinDocument', resolve);
  });
  for (const type of ['mousePressed', 'mouseReleased'])
    await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  await Promise.race([navigated, Bun.sleep(5000)]);
  await settle(cdp);
  print({ clicked: true, matches: matches.length, ...attrs, now: await where(cdp) });
  cdp.close();
}

async function press(state: State) {
  const times = Number(flag('times') ?? 1);
  const shift = bool('shift');
  const [key = 'Tab'] = rest;
  const codes: Record<string, number> = {
    Tab: 9,
    Enter: 13,
    Escape: 27,
    Space: 32,
    ArrowDown: 40,
    ArrowUp: 38,
  };
  const cdp = await connect(state);
  await cdp.send('Page.enable');
  const navigated = new Promise((resolve) => {
    cdp.on('Page.loadEventFired', resolve);
    cdp.on('Page.navigatedWithinDocument', resolve);
  });
  for (let i = 0; i < times; i++) {
    for (const type of ['rawKeyDown', 'keyUp'])
      await cdp.send('Input.dispatchKeyEvent', {
        type,
        key: key === 'Space' ? ' ' : key,
        code: key,
        windowsVirtualKeyCode: codes[key],
        modifiers: shift ? 8 : 0,
        ...(key === 'Enter' && type === 'rawKeyDown' ? { text: '\r' } : {}),
      });
    if (key === 'Enter') await cdp.send('Input.dispatchKeyEvent', { type: 'char', text: '\r' });
  }
  if (key === 'Enter') await Promise.race([navigated, Bun.sleep(3000)]);
  await settle(cdp);
  print({
    pressed: `${shift ? 'Shift+' : ''}${key} x${times}`,
    focus: await describeFocus(cdp),
    now: await where(cdp),
  });
  cdp.close();
}

async function focus(state: State) {
  const cdp = await connect(state);
  print(await describeFocus(cdp));
  cdp.close();
}

async function snapshot(state: State) {
  const [name] = rest;
  if (!name) die('usage: snapshot <NAME>');
  const cdp = await connect(state);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  cdp.close();
  const byId = new Map<string, any>(nodes.map((n: any) => [n.nodeId, n]));
  const skip = new Set(['generic', 'none', 'InlineTextBox', 'LineBreak']);
  const lines: string[] = [];
  const walk = (node: any, depth: number) => {
    const role = node.role?.value;
    const label = node.name?.value?.trim();
    const shown = !node.ignored && !(skip.has(role) && !label) && role !== 'InlineTextBox';
    if (shown) {
      const level =
        role === 'heading' && node.properties?.find((p: any) => p.name === 'level')?.value.value;
      lines.push(
        `${'  '.repeat(depth)}${role}${level ? ` (h${level})` : ''}${label ? ` "${label}"` : ''}`,
      );
    }
    for (const child of node.childIds ?? []) {
      const c = byId.get(child);
      if (c) walk(c, shown ? depth + 1 : depth);
    }
  };
  nodes.filter((n: any) => !n.parentId).forEach((n: any) => walk(n, 0));
  const out = join(state.dir, `${name}.aria.txt`);
  await Bun.write(out, lines.join('\n') + '\n');
  console.log(`wrote ${relative(root, out)} (${lines.length} nodes)`);
}

async function shot(state: State) {
  const full = bool('full');
  const [name] = rest;
  if (!name) die('usage: shot <NAME> [--full]');
  const cdp = await connect(state);
  await settle(cdp);
  let clip;
  if (full) {
    const metrics = await cdp.send('Page.getLayoutMetrics');
    clip = {
      x: 0,
      y: 0,
      width: state.viewport.width,
      height: Math.ceil(metrics.cssContentSize.height),
      scale: 1,
    };
  }
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: full,
    ...(clip ? { clip } : {}),
  });
  cdp.close();
  const out = join(state.dir, `${name}.png`);
  await Bun.write(out, Buffer.from(data, 'base64'));
  console.log(
    `wrote ${relative(root, out)} (${state.viewport.width}x${state.viewport.height}${full ? ', full page' : ''})`,
  );
}

async function evalCommand(state: State) {
  const expression = rest.join(' ');
  if (!expression) die('usage: eval <expression>');
  const cdp = await connect(state);
  print(await evaluate(cdp, expression));
  cdp.close();
}

async function fetchCommand(state: State) {
  const name = flag('as');
  const [path = '/'] = rest;
  const res = await fetch(new URL(path, state.base), { redirect: 'manual' });
  const body = await res.text();
  const origin = new URL(state.base).origin;
  const result = {
    path,
    status: res.status,
    location: res.headers.get('location')?.replace(origin, '') ?? null,
    // wrangler dev rewrites https://austinfalk.com in headers to its own origin.
    headers: Object.fromEntries(
      [...res.headers].map(([k, v]) => [k, v.replaceAll(origin, 'https://austinfalk.com')]),
    ),
    bodyStart: body.slice(0, 400),
    bodyLength: body.length,
  };
  if (name) {
    await Bun.write(
      join(state.dir, `${name}.http.json`),
      JSON.stringify({ ...result, body }, null, 2),
    );
  }
  print(result);
}

async function down(state: State) {
  for (const pid of [state.serverPid, state.browserPid]) {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {}
  }
  await Bun.sleep(500);
  for (const pid of [state.serverPid, state.browserPid]) {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {}
  }
  rmSync(join(state.dir, '.profile'), { recursive: true, force: true });
  const current = join(verifyRoot, 'current');
  if (existsSync(current) && (await Bun.file(current).text()).trim() === state.run) rmSync(current);
  print({
    stopped: state.run,
    serverRunning: alive(state.serverPid),
    browserRunning: alive(state.browserPid),
    evidence: relative(root, state.dir),
    files: readdirSync(state.dir),
  });
}

const commands: Record<string, (s: State) => Promise<void>> = {
  doctor,
  goto,
  click,
  press,
  focus,
  snapshot,
  shot,
  eval: evalCommand,
  fetch: fetchCommand,
  down,
};

if (command === 'up') await up();
else if (command && commands[command]) await commands[command](loadState());
else
  die(
    'usage: site.ts up|doctor|goto|click|press|focus|snapshot|shot|eval|fetch|down (see the header of this file)',
  );
process.exit(0);
