import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, dialog, systemPreferences, protocol, net, shell, clipboard, screen, session } from 'electron';
import { join, resolve } from 'path';
import { deflateSync, inflateSync } from 'zlib';
import { execFile } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import http from 'http';
import { Vault } from './vault.js';
import { ClipboardMonitor } from './clipboard-monitor.js';

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

protocol.registerSchemesAsPrivileged([
  { scheme: 'ac-file', privileges: { standard: false, secure: true, supportFetchAPI: true, corsEnabled: false } },
]);

let mainWindow = null;
let settingsWindow = null;
let tray = null;
let currentShortcut = 'Alt+Space';
let _launcherVisible = false; // true only while the launcher-sized window is showing
let _isQuitting = false; // true once app.quit() is in progress — lets close handler skip preventDefault
// Single source of truth for whether the main window is intentionally sticky
// (screen-saver level + visibleOnAllWorkspaces). We track this ourselves
// because Electron's `isAlwaysOnTop()` lies on macOS once the NSWindow level
// has been raised and the corresponding "release" calls don't actually lower
// the Cocoa level back to normal.
let _mainSticky = false;
const vault = new Vault();
const monitor = new ClipboardMonitor();

// ─── Window stick / unstick helpers ──────────────────────────────────────────
// macOS retains NSScreenSaverWindowLevel even after `setAlwaysOnTop(false)`.
// The reliable workaround is the "lower-then-disable" dance: first re-raise
// alwaysOnTop at the 'normal' level (which forces Cocoa to set the NSWindow
// level to NSNormalWindowLevel), THEN disable it. Without this, the window
// visually stays above everything even though Electron reports it as not
// always-on-top.
function _stickWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setAlwaysOnTop(true, 'screen-saver');
  } else {
    win.setAlwaysOnTop(true);
  }
}

function _unstickWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (process.platform === 'darwin') {
    // Clear sticky-across-spaces first (must precede level change on macOS).
    win.setVisibleOnAllWorkspaces(false);
    // The dance: re-raise on-top at 'normal' to force the Cocoa level down,
    // then disable on-top entirely.
    win.setAlwaysOnTop(true, 'normal');
    win.setAlwaysOnTop(false);
    // Belt-and-suspenders: explicitly set the level back to floating=false.
    // Some macOS releases need a paint cycle to commit the level change, so
    // we also ask the window to re-arrange itself.
    try { win.moveTop(); } catch {}
  } else {
    win.setAlwaysOnTop(false);
  }
}

function _stickMain()   { _mainSticky = true;  _stickWindow(mainWindow); }
function _unstickMain() { _mainSticky = false; _unstickWindow(mainWindow); }

// ─── Sequential-paste queue (FIFO, max 20 unique items) ──────────────────────
let _pasteQueue = [];
const PASTE_SHORTCUT = 'CommandOrControl+Alt+V';

// ─── Ignore-next clipboard entry (modifier copies: UPPER / lower) ────────────
// Set by renderer before writing a transformed variant; cleared after one match.
let _ignoreNextText = null;

// ─── Accumulation queue for Bundle & Composer feature ────────────────────────
// Option+Shift+A  →  add current clipboard to bundle
// Option+Shift+B  →  finalize bundle → save as 'bundle' clip
let _accQueue = [];
const ACCUM_ADD_SHORTCUT      = 'Alt+Shift+A';
const ACCUM_FINALIZE_SHORTCUT = 'Alt+Shift+B';

function _hideLauncher() {
  _launcherVisible = false;
  if (!mainWindow) return;
  _unstickMain();
  mainWindow.hide();
}

// Opens the full window directly (tray / second-instance) — never sticky.
function _showDirectly() {
  if (!mainWindow) return;
  _launcherVisible = false;
  _unstickMain();
  mainWindow.show();
  mainWindow.focus();
}

// ─── Quit ─────────────────────────────────────────────────────────────────────
function quitApp() {
  monitor.stop(); globalShortcut.unregisterAll();
  if (mainWindow) { mainWindow.destroy(); mainWindow = null; }
  app.quit();
}

// ─── Icon generation: rounded square with "A" brand mark ─────────────────────
function buildIconBuffer(size = 22) {
  const w = size, h = size;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  const crc32 = (buf) => { let c = -1; for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  };

  const seg = (px, py, ax, ay, bx, by) => {
    const dx = bx-ax, dy = by-ay, l2 = dx*dx+dy*dy;
    if (l2 === 0) return Math.hypot(px-ax, py-ay);
    const t = Math.max(0, Math.min(1, ((px-ax)*dx+(py-ay)*dy)/l2));
    return Math.hypot(px-ax-t*dx, py-ay-t*dy);
  };

  const rr = size * 0.22, pad = size * 0.04;
  const cx = (w-1)/2, cy = (h-1)/2;
  const rrSDF = (x, y) => {
    const qx = Math.abs(x-cx) - ((w-1)/2 - pad - rr);
    const qy = Math.abs(y-cy) - ((h-1)/2 - pad - rr);
    return Math.hypot(Math.max(qx,0), Math.max(qy,0)) + Math.min(Math.max(qx,qy),0) - rr;
  };

  const sw  = size * 0.095;
  const csw = size * 0.068;
  const aMid = w * 0.500, aTop = h * 0.152, aBot = h * 0.842;
  const aL   = w * 0.163, aR   = w * 0.837;
  const aCY  = h * 0.570, aCL  = w * 0.302, aCR = w * 0.698;
  const sfW  = size * 0.120;
  const sfH  = size * 0.046;

  const inA = (px, py) => (
    seg(px, py, aMid, aTop, aL, aBot) < sw   ||
    seg(px, py, aMid, aTop, aR, aBot) < sw   ||
    seg(px, py, aCL, aCY, aCR, aCY)  < csw  ||
    (Math.abs(px - aL) < sfW && Math.abs(py - aBot) < sfH) ||
    (Math.abs(px - aR) < sfW && Math.abs(py - aBot) < sfH)
  );

  const ICON_SCALE = 0.80;
  const SS = [0.25, 0.75];

  const rows = [];
  for (let y = 0; y < h; y++) {
    rows.push(0);
    for (let x = 0; x < w; x++) {
      let bgN = 0, aN = 0;
      for (const sx of SS) {
        for (const sy of SS) {
          const lx = cx + (x + sx - cx) / ICON_SCALE;
          const ly = cy + (y + sy - cy) / ICON_SCALE;
          if (rrSDF(lx, ly) <= 0) {
            bgN++;
            if (inA(lx, ly)) aN++;
          }
        }
      }
      if (bgN === 0) { rows.push(0, 0, 0, 0); continue; }
      const alpha = Math.round(bgN / 4 * 255);
      const af = aN / bgN;
      const R = Math.round(74 * af + 255 * (1 - af));
      const G = Math.round(14 * af + 107 * (1 - af));
      const B = Math.round(122 * af +  0 * (1 - af));
      rows.push(R, G, B, alpha);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.from(rows))), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Converts any RGBA PNG buffer to grayscale while preserving the alpha channel.
// Used to turn tray.png (correct font + shape) into a monochrome menu-bar icon.
function pngToGrayscale(buf) {
  // Parse PNG chunks
  let pos = 8; // skip 8-byte signature
  let width = 0, height = 0, channels = 4;
  const idats = [];

  while (pos < buf.length - 4) {
    const len  = buf.readUInt32BE(pos);       pos += 4;
    const type = buf.slice(pos, pos + 4).toString('ascii'); pos += 4;
    const data = buf.slice(pos, pos + len);   pos += len;
    pos += 4; // skip CRC

    if (type === 'IHDR') {
      width    = data.readUInt32BE(0);
      height   = data.readUInt32BE(4);
      const ct = data[9]; // color type
      channels = ct === 2 ? 3 : ct === 6 ? 4 : 4; // RGB=3, RGBA=4
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  // Inflate all IDAT chunks concatenated
  const raw = inflateSync(Buffer.concat(idats));

  // Decode filtered scanlines and convert pixels to grayscale
  // We accumulate the decoded RGBA rows, then re-encode with filter=0 (None)
  const stride = 1 + width * channels;
  const decoded = Buffer.alloc(height * width * 4); // always output RGBA

  // PNG filter reconstruction — previous row starts as zeros
  let prev = Buffer.alloc(width * channels, 0);

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    const filter   = raw[rowStart];
    const row      = Buffer.from(raw.slice(rowStart + 1, rowStart + 1 + width * channels));

    // Apply filter to reconstruct absolute pixel values
    for (let i = 0; i < row.length; i++) {
      const a = i >= channels ? row[i - channels] : 0; // left pixel, same channel
      const b = prev[i];                                // pixel above, same channel
      const c = i >= channels ? prev[i - channels] : 0; // above-left
      if      (filter === 1) row[i] = (row[i] + a) & 0xff;
      else if (filter === 2) row[i] = (row[i] + b) & 0xff;
      else if (filter === 3) row[i] = (row[i] + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        // Paeth predictor
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        row[i] = (row[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      // filter 0: no-op
    }
    prev = row;

    // Convert to grayscale RGBA
    for (let x = 0; x < width; x++) {
      const si = x * channels;
      const di = (y * width + x) * 4;
      const R = row[si], G = row[si + 1], B = row[si + 2];
      const A = channels === 4 ? row[si + 3] : 255;
      const v = Math.round(0.299 * R + 0.587 * G + 0.114 * B);
      decoded[di] = v; decoded[di + 1] = v; decoded[di + 2] = v; decoded[di + 3] = A;
    }
  }

  // Re-encode as RGBA PNG with filter=0 (None) on every row
  const CRC_TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    CRC_TABLE[n] = c;
  }
  const crc32 = (b) => { let c = -1; for (const byte of b) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => {
    const L = Buffer.alloc(4); L.writeUInt32BE(d.length);
    const T = Buffer.from(t, 'ascii');
    const C = Buffer.alloc(4); C.writeUInt32BE(crc32(Buffer.concat([T, d])));
    return Buffer.concat([L, T, d, C]);
  };

  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(0); // filter=None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rows.push(decoded[i], decoded[i + 1], decoded[i + 2], decoded[i + 3]);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // bitDepth=8, colorType=RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.from(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Menu-bar icon — identical to buildIconBuffer in every way (same geometry, same
// ICON_SCALE, same anti-aliasing) but with the colours swapped to grayscale:
//   background (rounded-square area, outside "A") = white  (255, 255, 255)
//   "A" mark                                       = black  ( 20,  20,  20)
// Not a template image: renders as a fixed white-bg + black-A icon at any scale.
function buildTrayIconBuffer(size = 44) {
  const w = size, h = size;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  const crc32 = (buf) => { let c = -1; for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  };
  const seg = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  };

  // ── identical to buildIconBuffer from here down ──
  const rr = size * 0.22, pad = size * 0.04;
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  const rrSDF = (x, y) => {
    const qx = Math.abs(x - cx) - ((w - 1) / 2 - pad - rr);
    const qy = Math.abs(y - cy) - ((h - 1) / 2 - pad - rr);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
  };
  const sw  = size * 0.095, csw = size * 0.068;
  const aMid = w * 0.500, aTop = h * 0.152, aBot = h * 0.842;
  const aL   = w * 0.163, aR   = w * 0.837;
  const aCY  = h * 0.570, aCL  = w * 0.302, aCR = w * 0.698;
  const sfW  = size * 0.120, sfH = size * 0.046;
  const inA = (px, py) => (
    seg(px, py, aMid, aTop, aL, aBot) < sw   ||
    seg(px, py, aMid, aTop, aR, aBot) < sw   ||
    seg(px, py, aCL,  aCY,  aCR, aCY) < csw  ||
    (Math.abs(px - aL) < sfW && Math.abs(py - aBot) < sfH) ||
    (Math.abs(px - aR) < sfW && Math.abs(py - aBot) < sfH)
  );
  const ICON_SCALE = 0.80;
  const SS = [0.25, 0.75];

  const rows = [];
  for (let y = 0; y < h; y++) {
    rows.push(0);
    for (let x = 0; x < w; x++) {
      let bgN = 0, aN = 0;
      for (const sx of SS) for (const sy of SS) {
        const lx = cx + (x + sx - cx) / ICON_SCALE;
        const ly = cy + (y + sy - cy) / ICON_SCALE;
        if (rrSDF(lx, ly) <= 0) { bgN++; if (inA(lx, ly)) aN++; }
      }
      if (bgN === 0) { rows.push(0, 0, 0, 0); continue; }
      const alpha = Math.round(bgN / 4 * 255);
      const af    = aN / bgN;
      // bg=white(255,255,255)  A=near-black(20,20,20)
      const v = Math.round(20 * af + 255 * (1 - af));
      rows.push(v, v, v, alpha);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.from(rows))), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function loadIcon(size) {
  const resDir = app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources');
  const iconFile = join(resDir, 'icon.png');

  if (size <= 44) {
    // Convert tray.png to grayscale — preserves the exact same font and proportions
    // as the dock icon (Apple Garamond "A") while making it monochrome for the menu bar.
    const trayFile = join(resDir, 'tray.png');
    if (existsSync(trayFile)) {
      try {
        const gray = pngToGrayscale(readFileSync(trayFile));
        return nativeImage.createFromBuffer(gray, { scaleFactor: 2 });
      } catch {}
    }
    // Fallback: geometric construction
    return nativeImage.createFromBuffer(buildTrayIconBuffer(44), { scaleFactor: 2 });
  }

  // Dock / window icons — use readFileSync for reliable buffer loading
  if (existsSync(iconFile)) {
    try {
      const img = nativeImage.createFromBuffer(readFileSync(iconFile));
      if (!img.isEmpty()) return size < 256 ? img.resize({ width: size, height: size, quality: 'best' }) : img;
    } catch {}
  }
  return nativeImage.createFromBuffer(buildIconBuffer(size));
}

function getFrontApp() {
  return new Promise((resolveP) => {
    if (process.platform !== 'darwin') { resolveP(''); return; }
    execFile('osascript', ['-e','tell application "System Events" to get name of first process whose frontmost is true'],
      { timeout: 300 }, (err, stdout) => resolveP(err ? '' : stdout.trim()));
  });
}

function registerShortcut(accelerator) {
  globalShortcut.unregisterAll();
  const ok = globalShortcut.register(accelerator, () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      // Use the explicit flag — size-based heuristic breaks when columns widen the launcher
      if (_launcherVisible) { _hideLauncher(); return; }
      // Full-size window: close only when it has focus (otherwise fall through to open launcher)
      if (mainWindow.isFocused()) { _hideLauncher(); return; }
    }
    const winW = 560, winH = 560;
    mainWindow.setSize(winW, winH, false);
    const pt = screen.getCursorScreenPoint();
    const disp = screen.getDisplayNearestPoint(pt);
    const { x, y, width, height } = disp.workArea;
    const wx = Math.min(Math.max(pt.x - Math.round(winW / 2), x), x + width  - winW);
    const wy = Math.min(Math.max(pt.y - Math.round(winH / 3), y), y + height - winH);
    mainWindow.setPosition(wx, wy, false);
    _launcherVisible = true;
    // The launcher is always sticky (visible across spaces, screen-saver level).
    // We force-re-apply on every summon so it works even after the user has
    // toggled the pin off in the full window.
    _stickMain();
    if (process.platform === 'darwin') {
      mainWindow.showInactive(); // appear on the current space without switching to Anarchive's space
    } else {
      mainWindow.show();
    }
    mainWindow.webContents.focus();
    mainWindow.webContents.send('view:setView', { view: 'launcher' });
  });
  if (!ok) console.warn(`Anarchive: shortcut "${accelerator}" already taken`);

  if (accelerator !== PASTE_SHORTCUT) {
    globalShortcut.register(PASTE_SHORTCUT, async () => {
      if (_pasteQueue.length === 0) return;
      const text = _pasteQueue.shift();
      mainWindow?.webContents.send('clipboard:queue:changed', [..._pasteQueue]);
      monitor.pause();
      clipboard.writeText(text);
      await new Promise(r => setTimeout(r, 80));
      execFile('osascript', ['-e', 'tell application "System Events" to keystroke "v" using command down'], { timeout: 300 }, () => {});
      setTimeout(() => monitor.resume(), 200);
    });
  }

  if (accelerator !== ACCUM_ADD_SHORTCUT) {
    const okA = globalShortcut.register(ACCUM_ADD_SHORTCUT, async () => {
      // Simulate Cmd+C in the foreground app so the user only needs to select, not copy first
      if (process.platform === 'darwin') {
        await new Promise(resolve => {
          execFile('osascript', ['-e', 'tell application "System Events" to keystroke "c" using {command down}'], () => resolve());
        });
        await new Promise(r => setTimeout(r, 120));
      }
      const text = clipboard.readText();
      if (!text) return;
      // Skip if same as the last item already in queue (accidental double-press)
      if (_accQueue.length > 0 && _accQueue[_accQueue.length - 1] === text) return;
      _accQueue.push(text);
      mainWindow?.webContents.send('accum:added', { count: _accQueue.length, preview: text.slice(0, 60) });
      if (tray) tray.setContextMenu(buildTrayMenu());
    });
    if (!okA) console.warn(`Anarchive: accum-add shortcut "${ACCUM_ADD_SHORTCUT}" already taken`);
  }

  if (accelerator !== ACCUM_FINALIZE_SHORTCUT) {
    const okB = globalShortcut.register(ACCUM_FINALIZE_SHORTCUT, finalizeBundle);
    if (!okB) console.warn(`Anarchive: accum-finalize shortcut "${ACCUM_FINALIZE_SHORTCUT}" already taken`);
  }

  return ok;
}

// ─── Dev-mode Vite readiness guard ───────────────────────────────────────────
// Polls the Vite dev server until it returns a real HTTP response.
// Prevents loadURL from firing while Vite is still binding the port or
// running initial dep-optimization, which would leave a permanent purple screen.
function waitForViteServer(url, { maxAttempts = 60, intervalMs = 500 } = {}) {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(url, (res) => {
        res.resume(); // drain response body
        console.log(`[Anarchive] Vite ready (HTTP ${res.statusCode}) after ${attempts} poll(s)`);
        resolve();
      });
      req.on('error', () => {
        if (attempts < maxAttempts) return setTimeout(check, intervalMs);
        console.warn(`[Anarchive] Vite not ready after ${maxAttempts} polls — loading anyway`);
        resolve();
      });
      req.setTimeout(intervalMs, () => {
        req.destroy();
        if (attempts < maxAttempts) return setTimeout(check, intervalMs);
        console.warn(`[Anarchive] Vite timed out after ${maxAttempts} polls — loading anyway`);
        resolve();
      });
    };
    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980, height: 680, minWidth: 540, minHeight: 300,
    frame: false,
    backgroundColor: '#15101c', show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  });

  const devURL = process.env['ELECTRON_RENDERER_URL'];
  if (devURL) mainWindow.loadURL(devURL);
  else mainWindow.loadFile(join(__dirname, '../renderer/index.html'));

  // Dev-mode safety net: if loadURL fails (Vite not ready, dep-bundling mid-flight,
  // etc.), retry up to 10 times with 1 s gaps instead of leaving a permanent purple screen.
  if (devURL) {
    let _devRetries = 0;
    mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
      if (_devRetries >= 10) {
        console.error(`[Anarchive] Renderer still failing after 10 retries (${errorCode}: ${errorDescription})`);
        return;
      }
      _devRetries++;
      console.warn(`[Anarchive] Renderer load failed (${errorCode}), retry ${_devRetries}/10 in 1 s…`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(devURL);
      }, 1000);
    });
    // Reset retry counter on a successful load (e.g. HMR full-reload after a fix)
    mainWindow.webContents.on('did-finish-load', () => { _devRetries = 0; });
  }

  // B11: Block popup windows; route http(s) through openExternal allowlist
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    // Re-apply dock icon: macOS can reset it to the Electron default when the window first appears
    if (process.platform === 'darwin' && app.dock) {
      const icon = loadIcon(512);
      if (!icon.isEmpty()) app.dock.setIcon(icon);
    }
  });
  mainWindow.webContents.on('console-message', (_, level, msg, line, src) => {
    if (level >= 2) console.error('[RENDERER]', msg, `(${src}:${line})`);
  });
  mainWindow.webContents.on('render-process-gone', (_, details) => console.error('[RENDERER CRASH]', details));
  mainWindow.webContents.on('will-navigate', (e, url) => { if (url.startsWith('file://')) e.preventDefault(); });
  mainWindow.on('close', (e) => {
    if (_isQuitting) return; // allow window to close during app.quit()
    e.preventDefault();
    mainWindow.hide();
  });
}

async function finalizeBundle() {
  if (_accQueue.length === 0) return;
  const items = [..._accQueue];
  _accQueue = [];
  try {
    const bundleText = JSON.stringify(items);
    const appName = await getFrontApp();
    const clip = await vault.addClip(bundleText, 'bundle', appName);
    vault.pruneRetention().catch(() => {});
    mainWindow?.webContents.send('clipboard:new', clip);
    mainWindow?.webContents.send('accum:finalized', { count: items.length });
    if (tray) tray.setContextMenu(buildTrayMenu());
  } catch (err) {
    console.error('[finalizeBundle] failed:', err);
    _accQueue = [...items, ..._accQueue]; // restore queue on failure
  }
}

function buildTrayMenu() {
  const recentClips = vault.getClips()
    .filter(c => c.kind === 'text' || c.kind === 'url' || c.kind === 'code')
    .slice(0, 10)
    .map(c => ({
      label: c.text.length > 60 ? c.text.slice(0, 57).replace(/\n/g, ' ') + '…' : c.text.replace(/\n/g, ' '),
      click: () => clipboard.writeText(c.text),
    }));

  const bundleSection = _accQueue.length > 0 ? [
    { label: `Finalizza bundle (${_accQueue.length} ${_accQueue.length === 1 ? 'elemento' : 'elementi'})`, click: finalizeBundle },
    { type: 'separator' },
  ] : [];

  const nav = (tab, filter, fileFilter) => () => {
    _showDirectly();
    mainWindow?.webContents.send('view:setView', { view: 'full', tab, filter, fileFilter });
  };

  const recentSection = recentClips.length > 0
    ? [...recentClips, { type: 'separator' }]
    : [];

  return Menu.buildFromTemplate([
    { label: 'Open Anarchive', click: () => { _showDirectly(); } },
    { type: 'separator' },
    ...bundleSection,
    ...recentSection,
    {
      label: 'Clipboard', submenu: [
        { label: 'All Clips',  click: nav('clipboard', 'all') },
        { label: 'Pinned',     click: nav('clipboard', 'pinned') },
        { label: 'Text',       click: nav('clipboard', 'text') },
        { label: 'Links',      click: nav('clipboard', 'url') },
        { label: 'Code',       click: nav('clipboard', 'code') },
        { label: 'Bundle',     click: nav('clipboard', 'bundle') },
      ],
    },
    {
      label: 'Files Archive', submenu: [
        { label: 'All Files',      click: nav('drop', undefined, 'all') },
        { label: 'Documents',      click: nav('drop', undefined, 'document') },
        { label: 'Images',         click: nav('drop', undefined, 'image') },
        { label: 'Presentations',  click: nav('drop', undefined, 'presentation') },
        { label: 'Spreadsheets',   click: nav('drop', undefined, 'spreadsheet') },
        { label: 'Audio',          click: nav('drop', undefined, 'audio') },
        { label: 'Video',          click: nav('drop', undefined, 'video') },
      ],
    },
    { label: 'Snippets', click: nav('snippets') },
    { type: 'separator' },
    { label: 'Quit', click: quitApp },
  ]);
}

function createTray() {
  const icon = loadIcon(22);
  tray = new Tray(icon);
  tray.setToolTip('Anarchive');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => {
    tray.setContextMenu(buildTrayMenu());
    tray.popUpContextMenu();
  });
}

// Apply launch-at-login / dock-visibility settings (consumes ac.launchAtLogin / ac.showInDock)
function applySystemSettings() {
  const s = vault.settings || {};
  if (typeof s.launchAtLogin === 'boolean') {
    try { app.setLoginItemSettings({ openAtLogin: s.launchAtLogin }); }
    catch (err) { console.warn('setLoginItemSettings failed:', err.message); }
  }
  if (process.platform === 'darwin' && app.dock) {
    if (s.showInDock === false) app.dock.hide();
    else app.dock.show().catch(() => {});
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // B12: explicit Content-Security-Policy for renderer responses
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: blob: ac-file:; " +
          "img-src 'self' data: blob: ac-file:; " +
          "media-src 'self' ac-file:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "font-src 'self' data:; " +
          "connect-src 'self' ws: ac-file:;"
        ],
      },
    });
  });

  // C5: ac-file:// must resolve inside an allowed read path (vault OR system screenshots).
  protocol.handle('ac-file', (request) => {
    try {
      const filePath = decodeURIComponent(new URL(request.url).pathname);
      const resolved = resolve(filePath);
      if (!vault.isAllowedReadPath(resolved)) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(`file://${resolved}`);
    } catch {
      return new Response('Bad request', { status: 400 });
    }
  });

  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(loadIcon(512));
  }

  await vault.init();
  currentShortcut = vault.settings?.shortcut || 'Alt+Space';

  // Wait for the Vite dev server to be fully ready before creating the window.
  // This is the primary defence against the purple-screen race condition.
  if (process.env['ELECTRON_RENDERER_URL']) {
    await waitForViteServer(process.env['ELECTRON_RENDERER_URL']);
  }

  createWindow();
  createTray();
  registerShortcut(currentShortcut);
  console.log(`[Anarchive] Shortcuts: launcher="${currentShortcut}" accum-add="${ACCUM_ADD_SHORTCUT}" accum-finalize="${ACCUM_FINALIZE_SHORTCUT}"`);
  applySystemSettings();

  monitor.on('change', async (text, kind) => {
    // Skip modifier-copy variants (AA/aa) when recycleModifiedClips is off
    if (_ignoreNextText !== null && text === _ignoreNextText) {
      _ignoreNextText = null;
      return;
    }
    // C14: respect excludePw — skip very-likely-password text (short, mixed alnum/symbol, single line)
    if (vault.settings?.excludePw && _looksLikePassword(text)) return;
    const appName = await getFrontApp();
    const clip = await vault.addClip(text, kind, appName);
    // Apply retention prune in background
    vault.pruneRetention().catch(() => {});
    mainWindow?.webContents.send('clipboard:new', clip);
    if (tray) tray.setContextMenu(buildTrayMenu());
    // Sequential-paste queue: add non-image clips (dedup, newest at back)
    if (kind !== 'image' && text) {
      _pasteQueue = [..._pasteQueue.filter(t => t !== text), text].slice(-20);
      mainWindow?.webContents.send('clipboard:queue:changed', [..._pasteQueue]);
    }
  });
  monitor.start();
});

function _looksLikePassword(text) {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 6 || t.length > 64) return false;
  if (t.includes('\n')) return false;
  // Mixed character classes typical of generated passwords
  const hasUpper = /[A-Z]/.test(t);
  const hasLower = /[a-z]/.test(t);
  const hasDigit = /\d/.test(t);
  const hasSym   = /[^A-Za-z0-9]/.test(t);
  return (hasUpper + hasLower + hasDigit + hasSym) >= 3;
}

app.on('before-quit', () => { _isQuitting = true; });

// Ensure SIGTERM (sent by electron-vite on Ctrl+C) properly quits the process.
// Without this, app.quit() gets blocked by the close-event preventDefault above.
process.on('SIGTERM', () => quitApp());
process.on('SIGINT',  () => quitApp());

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  _showDirectly();
});
// macOS: re-show the main window when the user clicks the dock icon.
// Without this, the dock click is a no-op once the window has been hidden
// (which happens on close, since we intercept `close` and hide instead).
app.on('activate', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  _showDirectly();
});
app.on('window-all-closed', () => {});
app.on('will-quit', () => { globalShortcut.unregisterAll(); monitor.stop(); });

// ─── IPC — Clipboard ─────────────────────────────────────────────────────────
ipcMain.handle('clipboard:list',          ()                    => vault.getClips());
ipcMain.handle('clipboard:trash',         ()                    => vault.getTrashedClips());
ipcMain.handle('clipboard:trashCount',    ()                    => vault.getTrashCount());
ipcMain.handle('clipboard:add',           (_, text, kind, name) => vault.addClip(text, kind, name));
ipcMain.handle('clipboard:pin',           (_, id, pinned)       => vault.pinClip(id, pinned));
ipcMain.handle('clipboard:delete',        (_, id)               => vault.deleteClip(id));
ipcMain.handle('clipboard:lock',          (_, id, locked)       => vault.lockClip(id, locked));
ipcMain.handle('clipboard:restore',       (_, id)               => vault.restoreClip(id));
ipcMain.handle('clipboard:permanentDelete', (_, id)             => vault.permanentDeleteClip(id));

// ─── IPC — Accumulation queue ────────────────────────────────────────────────
ipcMain.handle('accum:queue',      ()        => [..._accQueue]);
ipcMain.handle('accum:finalize',   ()        => finalizeBundle());
ipcMain.handle('accum:clear',      ()        => { _accQueue = []; return true; });
ipcMain.handle('accum:removeItem', (_, idx)  => {
  if (idx >= 0 && idx < _accQueue.length) _accQueue.splice(idx, 1);
  mainWindow?.webContents.send('accum:queueChanged', [..._accQueue]);
  return true;
});

// ─── IPC — Modifier-copy bypass ──────────────────────────────────────────────
ipcMain.handle('clipboard:ignoreNext', (_, text) => {
  _ignoreNextText = typeof text === 'string' ? text : null;
  if (_ignoreNextText) setTimeout(() => { if (_ignoreNextText === text) _ignoreNextText = null; }, 2000);
  return true;
});

// ─── IPC — Paste queue ───────────────────────────────────────────────────────
ipcMain.handle('clipboard:queue:list',  () => [..._pasteQueue]);
ipcMain.handle('clipboard:queue:clear', () => {
  _pasteQueue = [];
  mainWindow?.webContents.send('clipboard:queue:changed', []);
  return true;
});

// ─── IPC — Monitor ───────────────────────────────────────────────────────────
ipcMain.handle('monitor:pause',  () => { monitor.pause();  return true; });
ipcMain.handle('monitor:resume', () => { monitor.resume(); return true; });

// ─── IPC — Vault ─────────────────────────────────────────────────────────────
ipcMain.handle('vault:listFiles',  ()       => vault.getFiles());
ipcMain.handle('vault:addFile',    (_,p)    => vault.addFile(p));
ipcMain.handle('vault:deleteFile', (_,id)   => vault.deleteFile(id));
ipcMain.handle('vault:runOcr',     (_,id)   => vault.runOcr(id));
ipcMain.handle('vault:getPath',    ()       => vault.dir);

ipcMain.handle('vault:updateFileTags',  (_, id, tags)     => vault.updateFileTags(id, tags));
ipcMain.handle('vault:renameFile',      (_, id, newName)  => vault.renameFile(id, newName));
ipcMain.handle('vault:setFileCategory', (_, id, category) => vault.setFileCategory(id, category));
ipcMain.handle('vault:lockFile',        (_, id, locked)   => vault.lockFile(id, locked));
ipcMain.handle('vault:emptyTrash',      ()                => vault.emptyTrash());
ipcMain.handle('vault:shareFile',       (_, filePath)     => vault.shareFile(filePath));

// ─── IPC — Snippets ──────────────────────────────────────────────────────────
ipcMain.handle('snippets:list',   ()                      => vault.getSnippets());
ipcMain.handle('snippets:add',    (_,title,text,kind)     => vault.addSnippet(title, text, kind));
ipcMain.handle('snippets:update', (_,id,patch)            => vault.updateSnippet(id, patch));
ipcMain.handle('snippets:delete', (_,id)                  => vault.deleteSnippet(id));
ipcMain.handle('snippets:lock',   (_, id, locked)         => vault.lockSnippet(id, locked));

ipcMain.handle('vault:choosePath', async () => {
  // 'createDirectory' enables the native "New Folder" button inside the macOS picker
  // so the user can create a vault folder without leaving the dialog.
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  return res.canceled ? null : res.filePaths[0];
});
// Multi-select file picker for the Drop Zone "click to add" UX
ipcMain.handle('vault:chooseFiles', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: 'Add files to Anarchive',
  });
  return res.canceled ? [] : res.filePaths;
});

// ─── IPC — Settings ──────────────────────────────────────────────────────────
// C1: vault path change now migrates existing data instead of orphaning it
ipcMain.handle('settings:setVaultPath', async (_, newDir, opts = {}) => {
  if (!newDir || typeof newDir !== 'string') return { ok: false, reason: 'invalid' };
  if (newDir === vault.dir) return { ok: false, reason: 'same-path' };
  if (opts.migrate === false) {
    await vault.saveSettings({ vaultDir: newDir });
    return { ok: true, migrated: false, restartRequired: true };
  }
  const result = await vault.migrateVault(newDir);
  return result;
});
ipcMain.handle('settings:setShortcut', async (_, accelerator) => {
  const ok = registerShortcut(accelerator);
  if (ok) { currentShortcut = accelerator; await vault.saveSettings({ shortcut: accelerator }); }
  return ok;
});
ipcMain.handle('settings:get', () => vault.getSettings());
ipcMain.handle('settings:set', async (_, patch) => {
  if (!patch || typeof patch !== 'object') return false;
  await vault.saveSettings(patch);
  // Re-apply system-side settings if any of those keys changed
  if ('launchAtLogin' in patch || 'showInDock' in patch) applySystemSettings();
  return true;
});

// ─── IPC — System ────────────────────────────────────────────────────────────
ipcMain.handle('system:requestAccessibility', () => {
  if (process.platform === 'darwin') return systemPreferences.isTrustedAccessibilityClient(true);
  return true;
});
ipcMain.handle('system:openExternal', (_, url) => {
  const u = typeof url === 'string' ? url.trim() : '';
  if (/^(https?:\/\/|mailto:)/i.test(u)) { shell.openExternal(u).catch(() => {}); return true; }
  return false;
});
// C6: openPath restricted to vault subtree or allowed system screenshots
ipcMain.handle('system:openPath', (_, path) => {
  const p = typeof path === 'string' ? path.trim() : '';
  if (!p) return 'no path';
  if (!vault.isAllowedReadPath(p)) return 'forbidden';
  return shell.openPath(p);
});
ipcMain.handle('system:getVersion', () => app.getVersion());
ipcMain.handle('system:isMac',      () => process.platform === 'darwin');
ipcMain.handle('system:listRecentScreenshots', (_, limit) => vault.listRecentScreenshots(limit));

// ─── IPC — Window ────────────────────────────────────────────────────────────
ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});
ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) win.unmaximize(); else win.maximize();
});
ipcMain.on('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win === mainWindow) _hideLauncher();
  else win?.close();
});
ipcMain.on('window:quit',     () => quitApp());
ipcMain.on('window:setSize',  (_, w, h) => mainWindow?.setSize(w, h, false));

// ─── IPC — Settings window ───────────────────────────────────────────────────
ipcMain.on('settings:openWindow', () => {
  console.log('[SETTINGS] open requested. mainSticky=%s, settingsExisting=%s',
    _mainSticky, !!(settingsWindow && !settingsWindow.isDestroyed()));

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    settingsWindow.moveTop();
    return;
  }

  // Center over the main window so it always appears in a visible spot.
  const mainBounds = mainWindow?.getBounds();
  const sw = 760, sh = 560;
  const x = mainBounds ? Math.round(mainBounds.x + (mainBounds.width  - sw) / 2) : undefined;
  const y = mainBounds ? Math.round(mainBounds.y + (mainBounds.height - sh) / 2) : undefined;

  settingsWindow = new BrowserWindow({
    width: sw, height: sh,
    ...(x != null && y != null ? { x, y } : {}),
    frame: false,
    resizable: false, minimizable: true, maximizable: false,
    show: false,
    backgroundColor: '#15101c',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  });

  // On macOS, set the level to MATCH the main window's actual visual level.
  // We use our own `_mainSticky` flag — `mainWindow.isAlwaysOnTop()` lies
  // here because Cocoa retains the NSWindow level after Electron thinks it's
  // been released. If main is sticky at screen-saver, settings must also be
  // at screen-saver (or higher) to render in front of it.
  if (process.platform === 'darwin') {
    const level = _mainSticky ? 'screen-saver' : 'floating';
    settingsWindow.setAlwaysOnTop(true, level);
    settingsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    console.log('[SETTINGS] created window at level=%s', level);
  }

  // Register ready-to-show BEFORE loadURL to avoid any race where the event
  // fires before the listener is attached.
  let _showFallback;
  const _showAndRaise = () => {
    if (!settingsWindow || settingsWindow.isDestroyed()) return;
    settingsWindow.show();
    settingsWindow.moveTop();
    settingsWindow.focus();
    console.log('[SETTINGS] window shown. visible=%s, bounds=%o',
      settingsWindow.isVisible(), settingsWindow.getBounds());
  };

  settingsWindow.once('ready-to-show', () => {
    clearTimeout(_showFallback);
    console.log('[SETTINGS] ready-to-show fired');
    _showAndRaise();
  });
  settingsWindow.webContents.once('did-finish-load', () => {
    console.log('[SETTINGS] did-finish-load fired');
    if (settingsWindow && !settingsWindow.isDestroyed() && !settingsWindow.isVisible()) {
      _showAndRaise();
    }
  });
  settingsWindow.webContents.on('render-process-gone', (_, details) =>
    console.error('[SETTINGS RENDERER CRASH]', details));
  settingsWindow.webContents.on('did-fail-load', (_, code, desc, url) =>
    console.error('[SETTINGS LOAD FAIL]', code, desc, url));

  const targetURL = process.env['ELECTRON_RENDERER_URL']
    ? process.env['ELECTRON_RENDERER_URL'] + '#/settings'
    : null;
  console.log('[SETTINGS] loading url=%s (or local file)', targetURL || 'file');
  if (targetURL) settingsWindow.loadURL(targetURL);
  else settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/settings' });

  // Emergency fallback: force-show after 500 ms.
  _showFallback = setTimeout(() => {
    if (settingsWindow && !settingsWindow.isDestroyed() && !settingsWindow.isVisible()) {
      console.warn('[SETTINGS] fallback timer firing — neither ready-to-show nor did-finish-load happened');
      _showAndRaise();
    }
  }, 500);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    clearTimeout(_showFallback);
    console.log('[SETTINGS] window closed');
  });
});

// ─── IPC — Window always-on-top pin ──────────────────────────────────────────
ipcMain.on('window:setAlwaysOnTop', (_, enabled) => {
  console.log('[PIN] toggle requested: enabled=%s (prev sticky=%s)', enabled, _mainSticky);
  if (!mainWindow) return;
  if (enabled) _stickMain(); else _unstickMain();
  console.log('[PIN] applied. now sticky=%s, isAlwaysOnTop()=%s',
    _mainSticky, mainWindow.isAlwaysOnTop());
});

// Relay renderer→renderer broadcasts (settings window → main window).
ipcMain.on('window:broadcast', (_, patch) => {
  mainWindow?.webContents.send('window:broadcast', patch);
});

// ─── IPC — File drag-out ─────────────────────────────────────────────────────
let DRAG_ICON = null;
ipcMain.on('file:dragout', (event, filePath) => {
  if (!filePath || !existsSync(filePath)) { console.warn('dragout: file not found:', filePath); return; }
  if (!DRAG_ICON || DRAG_ICON.isEmpty()) DRAG_ICON = loadIcon(32);
  if (!DRAG_ICON || DRAG_ICON.isEmpty()) DRAG_ICON = nativeImage.createFromBuffer(buildIconBuffer(32));
  try { event.sender.startDrag({ file: filePath, icon: DRAG_ICON }); }
  catch (err) { console.error('startDrag failed:', err); }
});
