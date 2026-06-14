import { app } from 'electron';
import { join, basename, extname, resolve } from 'path';
import { promises as fs, existsSync } from 'fs';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(execFileCb);

// macOS screenshot filename prefixes across common locales.
// Apple uses the system language at capture time, so we keep a broad list.
const SCREENSHOT_PREFIXES = [
  /^Screenshot[\s  ]/i,      // English
  /^Schermata[\s  ]/i,        // Italian
  /^Capture d.cran[\s  ]/i,   // French (apostrophe variants)
  /^Bildschirmfoto[\s  ]/i,   // German
  /^Captura de pantalla[\s  ]/i, // Spanish
  /^Captura de ecr.[\s  ]/i,  // Portuguese (ã)
  /^スクリーンショット/,                // Japanese
  /^스크린샷/,                          // Korean
  /^截屏/,                              // Chinese simplified
  /^截圖/,                              // Chinese traditional
];

function looksLikeScreenshot(filename) {
  if (!filename || !/\.(png|heic|jpg|jpeg)$/i.test(filename)) return false;
  return SCREENSHOT_PREFIXES.some(re => re.test(filename));
}

const DOC_EXTS   = new Set(['PDF','DOC','DOCX','ODT','RTF','TXT','MD','TEX','PAGES','EPUB']);
const IMG_EXTS   = new Set(['PNG','JPG','JPEG','GIF','WEBP','SVG','HEIC','HEIF','AVIF','TIFF','BMP','ICO','RAW','CR2','NEF']);
const OCR_EXTS   = new Set(['PNG','JPG','JPEG','WEBP','HEIC','HEIF','BMP','TIFF']);
const PRES_EXTS  = new Set(['PPT','PPTX','KEY','ODP']);
const SHEET_EXTS = new Set(['XLS','XLSX','CSV','NUMBERS','ODS','TSV']);
const AUDIO_EXTS = new Set(['MP3','M4A','WAV','FLAC','OGG','AAC','AIFF','OPUS','WMA']);
const VIDEO_EXTS = new Set(['MP4','MOV','AVI','MKV','WEBM','M4V','WMV','FLV']);
const CODE_EXTS  = new Set(['JS','JSX','TS','TSX','PY','RB','GO','RS','SWIFT','KT','JAVA','C','CPP','H','CSS','HTML','JSON','YAML','YML','TOML','SH','BASH','ZSH']);
const ARCH_EXTS  = new Set(['ZIP','TAR','GZ','RAR','7Z','DMG','PKG','ISO']);

// macOS Vision OCR helper — compiled once into userData/ocr-helper binary
const OCR_SWIFT_SRC = `import Vision
import AppKit
guard CommandLine.arguments.count > 1 else { exit(1) }
let imagePath = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: imagePath),
      let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { exit(1) }
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try? handler.perform([request])
if let obs = request.results {
  let text = obs.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\\n")
  print(text)
}
`;

// macOS Share Sheet helper — opens NSSharingServicePicker anchored at the cursor.
// Compiled once into userData/share-helper. Receives file path(s) as arguments.
// Auto-dismisses when the helper loses focus (user clicks elsewhere or switches app).
const SHARE_SWIFT_SRC = `import Cocoa

let args = CommandLine.arguments
guard args.count > 1 else {
  FileHandle.standardError.write("share-helper: no file argument\\n".data(using: .utf8)!)
  exit(1)
}
let urls = args[1...].map { URL(fileURLWithPath: $0) }
for url in urls {
  if !FileManager.default.fileExists(atPath: url.path) {
    FileHandle.standardError.write("share-helper: file not found: \\(url.path)\\n".data(using: .utf8)!)
    exit(2)
  }
}

class AppDelegate: NSObject, NSApplicationDelegate, NSSharingServicePickerDelegate {
  let urls: [URL]
  var anchorWindow: NSWindow?
  var didFinishLaunch: Bool = false
  init(urls: [URL]) { self.urls = urls; super.init() }
  func applicationDidFinishLaunching(_ notification: Notification) {
    let mouseLoc = NSEvent.mouseLocation
    let win = NSWindow(
      contentRect: NSRect(x: mouseLoc.x - 1, y: mouseLoc.y - 1, width: 2, height: 2),
      styleMask: [.borderless],
      backing: .buffered,
      defer: false
    )
    win.alphaValue = 0
    win.isOpaque = false
    win.backgroundColor = .clear
    win.level = .popUpMenu
    win.makeKeyAndOrderFront(nil)
    self.anchorWindow = win
    NSApp.activate(ignoringOtherApps: true)
    let picker = NSSharingServicePicker(items: urls)
    picker.delegate = self
    if let view = win.contentView {
      picker.show(relativeTo: NSRect(x: 0, y: 0, width: 1, height: 1), of: view, preferredEdge: .minY)
    }

    // After the picker had a chance to appear, mark launch as done so deactivation triggers quit.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
      self.didFinishLaunch = true
    }

    // Auto-quit when the helper loses active status (user clicks elsewhere / switches app).
    NotificationCenter.default.addObserver(
      forName: NSApplication.didResignActiveNotification,
      object: nil, queue: .main
    ) { _ in
      guard self.didFinishLaunch else { return }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
        NSApp.terminate(nil)
      }
    }

    // Safety timeout: quit after 90 seconds if nothing else fires.
    DispatchQueue.main.asyncAfter(deadline: .now() + 90) { NSApp.terminate(nil) }
  }
  func sharingServicePicker(_ picker: NSSharingServicePicker, didChoose service: NSSharingService?) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { NSApp.terminate(nil) }
  }
}

let appNS = NSApplication.shared
appNS.setActivationPolicy(.accessory)
let delegate = AppDelegate(urls: urls)
appNS.delegate = delegate
appNS.run()
`;

// Atomic write helper: tmp → rename guarantees file integrity even if process crashes mid-write
async function atomicWriteJSON(filePath, data) {
  const tmp = filePath + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, filePath);
}

// Backup-on-corruption: if a JSON file fails to parse, copy it aside for forensic recovery
async function safeReadJSON(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    try { await fs.copyFile(filePath, filePath + '.corrupt'); } catch {}
    console.error(`Anarchive: corrupt ${basename(filePath)} backed up to .corrupt:`, err.message);
    return fallback;
  }
}

export class Vault {
  constructor() {
    this.settingsFile = join(app.getPath('userData'), 'settings.json');
    this.settings = {};

    const userData = app.getPath('userData');
    this.ocrSwiftPath  = join(userData, 'ocr-helper.swift');
    this.ocrHelperPath = join(userData, 'ocr-helper');
    this.ocrReady = false;

    // Native macOS Share Sheet helper (NSSharingServicePicker).
    // Versioned filename: bump suffix when SHARE_SWIFT_SRC changes to invalidate old cached binary.
    this.shareSwiftPath  = join(userData, 'share-helper-v2.swift');
    this.shareHelperPath = join(userData, 'share-helper-v2');
    this.shareReady = false;

    // System screenshot directory (resolved lazily during init via `defaults read`)
    this.screenshotsDir = null;

    this.dir      = join(app.getPath('home'), 'Anarchive');
    this.dropsDir = join(this.dir, 'drops');
    this.historyFile  = join(this.dir, 'clipboard-history.json');
    this.refsFile     = join(this.dir, 'drops-refs.json');
    this.indexFile    = join(this.dir, 'drops-index.json');
    this.snippetsFile = join(this.dir, 'snippets.json');

    this.clips      = [];
    this.files      = [];
    this.refs       = [];
    this.snippets   = [];
    this.dropsIndex = {};

    // Per-file write queue: serializes writes to prevent interleaving / data races
    this._queues = new Map();
  }

  _queue(file, work) {
    const prev = this._queues.get(file) || Promise.resolve();
    const next = prev.catch(() => {}).then(work);
    this._queues.set(file, next);
    return next;
  }

  async init() {
    try {
      const raw = await fs.readFile(this.settingsFile, 'utf8');
      this.settings = JSON.parse(raw);
      if (this.settings.vaultDir) {
        this.dir          = this.settings.vaultDir;
        this.dropsDir     = join(this.dir, 'drops');
        this.historyFile  = join(this.dir, 'clipboard-history.json');
        this.refsFile     = join(this.dir, 'drops-refs.json');
        this.indexFile    = join(this.dir, 'drops-index.json');
        this.snippetsFile = join(this.dir, 'snippets.json');
      }
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn('Anarchive: settings load failed:', err.message);
      this.settings = {};
    }

    await fs.mkdir(this.dir,      { recursive: true });
    await fs.mkdir(this.dropsDir, { recursive: true });

    this.clips      = await safeReadJSON(this.historyFile,  []);
    this.refs       = await safeReadJSON(this.refsFile,     []);
    this.dropsIndex = await safeReadJSON(this.indexFile,    {});
    this.snippets   = await safeReadJSON(this.snippetsFile, []);

    await this._scanDrops();

    if (process.platform === 'darwin') {
      this._ensureOcrHelper().catch(() => {});
      this._ensureShareHelper().catch(() => {});
      this._resolveScreencaptureLocation().then(p => { this.screenshotsDir = p; }).catch(() => {});
    }
  }

  // Path containment check for IPC security (used by main process protocol handler)
  isPathInVault(p) {
    if (!p) return false;
    const resolved = resolve(p);
    return resolved === this.dir
        || resolved === this.dropsDir
        || resolved.startsWith(this.dir + '/')
        || resolved.startsWith(this.dropsDir + '/');
  }

  // Broader allowlist: vault OR system screenshots dir (only for files matching the
  // screenshot naming pattern). Used by ac-file://, system:openPath, shareFile so
  // that recent OS screenshots can be displayed/opened/shared without being copied.
  isAllowedReadPath(p) {
    if (!p) return false;
    if (this.isPathInVault(p)) return true;
    if (process.platform !== 'darwin' || !this.screenshotsDir) return false;
    const resolved = resolve(p);
    const inDir = resolved === this.screenshotsDir
               || resolved.startsWith(this.screenshotsDir + '/');
    if (!inDir) return false;
    return looksLikeScreenshot(basename(resolved));
  }

  async _resolveScreencaptureLocation() {
    if (process.platform !== 'darwin') return null;
    // Read user's configured location; fall back to ~/Desktop
    let p = '';
    try {
      const { stdout } = await execFile('defaults', ['read', 'com.apple.screencapture', 'location'], { timeout: 1500 });
      p = stdout.trim();
    } catch {}
    if (!p) p = join(homedir(), 'Desktop');
    // Expand ~ if present
    if (p.startsWith('~')) p = join(homedir(), p.slice(1));
    return p;
  }

  // Return recent macOS screenshots (by mtime desc), filtered by filename pattern.
  // limit caps the result; default is 30 which is plenty for the launcher column.
  async listRecentScreenshots(limit = 30) {
    if (process.platform !== 'darwin') return [];
    if (!this.screenshotsDir) this.screenshotsDir = await this._resolveScreencaptureLocation();
    if (!this.screenshotsDir || !existsSync(this.screenshotsDir)) return [];
    try {
      const names = await fs.readdir(this.screenshotsDir);
      const candidates = names.filter(looksLikeScreenshot);
      const entries = await Promise.all(candidates.map(async (name) => {
        const p = join(this.screenshotsDir, name);
        try {
          const st = await fs.stat(p);
          if (!st.isFile()) return null;
          return { path: p, name, mtime: st.mtimeMs, size: st.size };
        } catch { return null; }
      }));
      return entries
        .filter(Boolean)
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, Math.max(1, Math.min(200, limit)));
    } catch (err) {
      console.warn('Anarchive: listRecentScreenshots failed:', err.message);
      return [];
    }
  }

  // ── Vault path migration ────────────────────────────────────────────────────
  // Move existing vault contents to a new directory; preserves all data.
  async migrateVault(newDir) {
    if (!newDir || newDir === this.dir) return { ok: false, reason: 'same-path' };
    const oldDir = this.dir;
    try {
      await fs.mkdir(newDir, { recursive: true });
      const newDropsDir     = join(newDir, 'drops');
      const newHistoryFile  = join(newDir, 'clipboard-history.json');
      const newRefsFile     = join(newDir, 'drops-refs.json');
      const newIndexFile    = join(newDir, 'drops-index.json');
      const newSnippetsFile = join(newDir, 'snippets.json');

      await fs.mkdir(newDropsDir, { recursive: true });

      // Copy each top-level file if it exists
      const copyIfExists = async (src, dst) => {
        if (existsSync(src)) await fs.copyFile(src, dst);
      };
      await copyIfExists(this.historyFile,  newHistoryFile);
      await copyIfExists(this.refsFile,     newRefsFile);
      await copyIfExists(this.indexFile,    newIndexFile);
      await copyIfExists(this.snippetsFile, newSnippetsFile);

      // Copy drop files
      if (existsSync(this.dropsDir)) {
        const drops = await fs.readdir(this.dropsDir);
        for (const name of drops) {
          const srcP = join(this.dropsDir, name);
          const dstP = join(newDropsDir, name);
          try {
            const st = await fs.stat(srcP);
            if (st.isFile()) await fs.copyFile(srcP, dstP);
          } catch (err) { console.warn('migrate: skip', name, err.message); }
        }
      }

      // Switch live paths atomically
      this.dir          = newDir;
      this.dropsDir     = newDropsDir;
      this.historyFile  = newHistoryFile;
      this.refsFile     = newRefsFile;
      this.indexFile    = newIndexFile;
      this.snippetsFile = newSnippetsFile;
      this.settings.vaultDir = newDir;
      await this.saveSettings({});

      // Update file paths in-memory so renderer doesn't need a restart
      for (const f of this.files) {
        f.path = join(newDropsDir, f.name);
      }

      return { ok: true, oldDir, newDir };
    } catch (err) {
      console.error('Vault migration failed:', err.message);
      return { ok: false, reason: 'error', message: err.message };
    }
  }

  // ── OCR ─────────────────────────────────────────────────────────────────────

  async _ensureOcrHelper() {
    if (existsSync(this.ocrHelperPath)) { this.ocrReady = true; return; }
    try {
      await fs.writeFile(this.ocrSwiftPath, OCR_SWIFT_SRC, 'utf8');
      await execFile('swiftc', ['-O', '-o', this.ocrHelperPath, this.ocrSwiftPath], { timeout: 120000 });
      this.ocrReady = true;
    } catch (err) {
      console.warn('Anarchive: OCR helper compile failed (swiftc unavailable?):', err.message);
    }
  }

  async runOcr(fileId) {
    if (!this.ocrReady) await this._ensureOcrHelper().catch(() => {});
    if (!existsSync(this.ocrHelperPath)) return { ok: false, reason: 'no-helper' };

    const file = this.files.find(f => f.id === fileId);
    if (!file || !OCR_EXTS.has(file.ext)) return { ok: false, reason: 'unsupported' };

    try {
      const { stdout } = await execFile(this.ocrHelperPath, [file.path], { timeout: 30000 });
      const text = stdout.trim() || null;
      if (this.dropsIndex[fileId]) {
        this.dropsIndex[fileId].ocrText = text;
        await this._saveIndex();
      }
      if (file) file.ocrText = text;
      return { ok: true, text };
    } catch (err) {
      console.warn('Anarchive: OCR failed for', file.name, ':', err.message);
      return { ok: false, reason: 'error', message: err.message };
    }
  }

  // ── Share Sheet (macOS) ─────────────────────────────────────────────────────

  async _ensureShareHelper() {
    if (process.platform !== 'darwin') return;
    if (existsSync(this.shareHelperPath)) { this.shareReady = true; return; }
    try {
      await fs.writeFile(this.shareSwiftPath, SHARE_SWIFT_SRC, 'utf8');
      await execFile('swiftc', ['-O', '-o', this.shareHelperPath, this.shareSwiftPath], { timeout: 120000 });
      this.shareReady = true;
    } catch (err) {
      console.warn('Anarchive: share helper compile failed (swiftc unavailable?):', err.message);
    }
  }

  // Open the native macOS Share Sheet for a single file path.
  // Returns { success, error? }
  async shareFile(filePath) {
    if (process.platform !== 'darwin') return { success: false, error: 'unsupported-platform' };
    if (!filePath || typeof filePath !== 'string') return { success: false, error: 'invalid-path' };
    if (!this.isAllowedReadPath(filePath)) return { success: false, error: 'forbidden' };
    if (!existsSync(filePath)) return { success: false, error: 'file-not-found' };

    if (!this.shareReady) await this._ensureShareHelper().catch(() => {});
    if (!existsSync(this.shareHelperPath)) return { success: false, error: 'helper-unavailable' };

    // Fire-and-forget: the picker is modal at OS level, no need to await its exit.
    try {
      const { spawn } = await import('child_process');
      const child = spawn(this.shareHelperPath, [filePath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return { success: true };
    } catch (err) {
      console.error('Anarchive: share spawn failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ── Drops ───────────────────────────────────────────────────────────────────

  async _saveIndex() {
    return this._queue(this.indexFile, () => atomicWriteJSON(this.indexFile, this.dropsIndex));
  }

  async _saveRefs() {
    return this._queue(this.refsFile, () => atomicWriteJSON(this.refsFile, this.refs));
  }

  async _save() {
    return this._queue(this.historyFile, () => atomicWriteJSON(this.historyFile, this.clips));
  }

  async _saveSnippets() {
    return this._queue(this.snippetsFile, () => atomicWriteJSON(this.snippetsFile, this.snippets));
  }

  async _scanDrops() {
    try {
      const names = await fs.readdir(this.dropsDir);
      const nameToId = {};
      for (const [id, meta] of Object.entries(this.dropsIndex)) {
        nameToId[meta.name] = id;
      }

      let changed = false;
      this.files = await Promise.all(names.map(async (name) => {
        const p    = join(this.dropsDir, name);
        const stat = await fs.stat(p);
        const ext  = extname(name).slice(1).toUpperCase() || 'FILE';
        let id = nameToId[name];
        if (!id) {
          id = randomUUID();
          this.dropsIndex[id] = { name, at: stat.mtimeMs };
          changed = true;
        }
        return {
          id, name, path: p, ext, kind: _fileKind(ext),
          size: _bytes(stat.size),
          at:       this.dropsIndex[id]?.at       ?? stat.mtimeMs,
          ocrText:  this.dropsIndex[id]?.ocrText  ?? null,
          tags:     this.dropsIndex[id]?.tags     ?? [],
          locked:   this.dropsIndex[id]?.locked   ?? false,
          category: this.dropsIndex[id]?.category ?? null,
        };
      }));

      const foundNames = new Set(names);
      for (const [id, meta] of Object.entries(this.dropsIndex)) {
        if (!foundNames.has(meta.name)) { delete this.dropsIndex[id]; changed = true; }
      }

      this.files.sort((a, b) => b.at - a.at);
      if (changed) await this._saveIndex();
    } catch (err) {
      console.warn('Anarchive: drop scan failed:', err.message);
      this.files = [];
    }
  }

  async saveSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    return this._queue(this.settingsFile, () => atomicWriteJSON(this.settingsFile, this.settings));
  }

  getSettings() { return this.settings; }

  getClips()        { return this.clips.filter(c => !c.deleted); }
  getTrashedClips() { return this.clips.filter(c =>  c.deleted); }
  getTrashCount()   { return this.clips.filter(c =>  c.deleted).length; }

  async restoreClip(id) {
    const clip = this.clips.find(c => c.id === id && c.deleted);
    if (!clip) return;
    delete clip.deleted;
    delete clip.deletedAt;
    await this._save();
    return clip;
  }

  async permanentDeleteClip(id) {
    const clip = this.clips.find(c => c.id === id && c.deleted);
    if (!clip) return;
    this.clips = this.clips.filter(c => c.id !== id);
    await this._save();
  }

  async addClip(text, kind, appName = '') {
    // Serialize via history queue so concurrent invocations don't race on existing-check + unshift
    return this._queue(this.historyFile, async () => {
      const existing = this.clips.find(c => c.text === text && !c.deleted);
      if (existing) {
        existing.at = Date.now();
        existing.capCount = (existing.capCount || 1) + 1;
        await atomicWriteJSON(this.historyFile, this.clips);
        return existing;
      }
      const clip = {
        id:       randomUUID(),
        text,
        kind:     kind || _clipKind(text),
        app:      appName || '',
        at:       Date.now(),
        pinned:   false,
        meta:     `${text.length} chars`,
        capCount: 1,
        locked:   false,
      };
      this.clips.unshift(clip);
      // Cap applies only to active (non-deleted) clips
      const cap = Math.max(50, parseInt(this.settings.maxItems, 10) || 5000);
      const active = this.clips.filter(c => !c.deleted);
      if (active.length > cap) {
        const kept = active.filter(c => c.pinned || c.locked);
        const tail = active.filter(c => !c.pinned && !c.locked).slice(0, Math.max(0, cap - kept.length));
        const trimmed = [...kept.slice(0, cap), ...tail].sort((a, b) => b.at - a.at).slice(0, cap);
        this.clips = [...this.clips.filter(c => c.deleted), ...trimmed];
      }
      await atomicWriteJSON(this.historyFile, this.clips);
      return clip;
    });
  }

  async pinClip(id, pinned) {
    const clip = this.clips.find(c => c.id === id);
    if (clip) { clip.pinned = pinned; await this._save(); }
  }

  async lockClip(id, locked) {
    const clip = this.clips.find(c => c.id === id);
    if (clip) { clip.locked = locked; await this._save(); }
  }

  async deleteClip(id) {
    const clip = this.clips.find(c => c.id === id);
    if (!clip || clip.locked || clip.deleted) return;
    clip.deleted = true;
    clip.deletedAt = Date.now();
    await this._save();
  }

  getFiles() {
    return [...this.refs, ...this.files].sort((a, b) => b.at - a.at);
  }

  // Resolve destination with collision avoidance: report.pdf, report (1).pdf, report (2).pdf ...
  _uniqueDest(name) {
    let dest = join(this.dropsDir, name);
    if (!existsSync(dest)) return { dest, finalName: name };
    const ext  = extname(name);
    const base = ext ? name.slice(0, -ext.length) : name;
    for (let i = 1; i < 1000; i++) {
      const candidate = `${base} (${i})${ext}`;
      const p = join(this.dropsDir, candidate);
      if (!existsSync(p)) return { dest: p, finalName: candidate };
    }
    // Fallback to UUID prefix
    const uuidName = `${randomUUID()}-${name}`;
    return { dest: join(this.dropsDir, uuidName), finalName: uuidName };
  }

  async addFile(srcPath) {
    try {
      const stat = await fs.stat(srcPath);
      const name = basename(srcPath);
      const ext  = extname(name).slice(1).toUpperCase() || 'FILE';

      if (stat.isDirectory()) {
        const ref = {
          id:       randomUUID(),
          name,
          path:     srcPath,
          ext:      ext || 'APP',
          kind:     'app',
          size:     '—',
          at:       Date.now(),
          isRef:    true,
          tags:     [],
          locked:   false,
          category: null,
        };
        this.refs.unshift(ref);
        await this._saveRefs();
        return ref;
      }

      const { dest, finalName } = this._uniqueDest(name);
      await fs.copyFile(srcPath, dest);
      const destStat = await fs.stat(dest);
      const id = randomUUID();
      const file = {
        id,
        name:     finalName,
        path:     dest,
        ext,
        kind:     _fileKind(ext),
        size:     _bytes(destStat.size),
        at:       Date.now(),
        ocrText:  null,
        tags:     [],
        locked:   false,
        category: null,
      };
      this.dropsIndex[id] = { name: finalName, at: file.at };
      await this._saveIndex();
      this.files.unshift(file);
      return file;
    } catch (err) {
      console.error('Anarchive: addFile failed:', err.message);
      return { error: err.message };
    }
  }

  async updateFileTags(id, tags) {
    const meta = this.dropsIndex[id];
    if (meta) { meta.tags = tags; await this._saveIndex(); }
    const file = this.files.find(f => f.id === id);
    if (file) file.tags = tags;
  }

  async setFileCategory(id, category) {
    const meta = this.dropsIndex[id];
    if (meta) { meta.category = category; await this._saveIndex(); }
    const file = this.files.find(f => f.id === id);
    if (file) file.category = category;
  }

  async lockFile(id, locked) {
    const ref = this.refs.find(r => r.id === id);
    if (ref) { ref.locked = locked; await this._saveRefs(); return; }
    const meta = this.dropsIndex[id];
    if (meta) { meta.locked = locked; await this._saveIndex(); }
    const file = this.files.find(f => f.id === id);
    if (file) file.locked = locked;
  }

  async deleteFile(id) {
    const ref = this.refs.find(r => r.id === id);
    if (ref) {
      if (ref.locked) return { ok: false, reason: 'locked' };
      this.refs = this.refs.filter(r => r.id !== id);
      await this._saveRefs();
      return { ok: true };
    }
    const file = this.files.find(f => f.id === id);
    if (!file) return { ok: false, reason: 'not-found' };
    if (file.locked) return { ok: false, reason: 'locked' };
    try { await fs.unlink(file.path); }
    catch (err) { console.warn('Anarchive: file unlink failed:', err.message); }
    delete this.dropsIndex[id];
    await this._saveIndex();
    this.files = this.files.filter(f => f.id !== id);
    return { ok: true };
  }

  async renameFile(id, newName) {
    const sanitized = newName.replace(/[/\\:*?"<>|]/g, '-').trim().slice(0, 200);
    if (!sanitized) return null;

    const ref = this.refs.find(r => r.id === id);
    if (ref) {
      ref.name = sanitized;
      await this._saveRefs();
      return ref;
    }

    const file = this.files.find(f => f.id === id);
    if (!file) return null;

    const origExt  = extname(file.name);
    const newExt   = extname(sanitized);
    const finalName = newExt ? sanitized : (origExt ? sanitized + origExt : sanitized);
    const newPath  = join(this.dropsDir, finalName);

    // Guard: refuse to rename onto an existing different file
    if (existsSync(newPath) && newPath !== file.path) {
      return { error: 'A file with that name already exists.' };
    }

    try { await fs.rename(file.path, newPath); }
    catch (err) { console.error('renameFile failed:', err.message); return null; }

    file.name = finalName;
    file.path = newPath;
    file.ext  = extname(finalName).slice(1).toUpperCase() || file.ext;

    if (this.dropsIndex[id]) {
      this.dropsIndex[id].name = finalName;
      await this._saveIndex();
    }
    return file;
  }

  // Retention: prune clips older than N days (configurable via settings.retention)
  // Always preserves pinned + locked. Called from clipboard-monitor after each add.
  async pruneRetention() {
    const days = parseInt(this.settings.retention, 10);
    if (!days || days <= 0) return 0;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const before = this.clips.length;
    // Retention prunes old active clips permanently; deleted (trash) clips are untouched
    this.clips = this.clips.filter(c => c.deleted || c.pinned || c.locked || c.at >= cutoff);
    if (this.clips.length !== before) await this._save();
    return before - this.clips.length;
  }

  // ── Snippets ────────────────────────────────────────────────────────────────

  getSnippets() { return this.snippets; }

  async addSnippet(title, text, kind = 'text') {
    const snippet = {
      id:     randomUUID(),
      title:  title || text.slice(0, 60),
      text,
      kind,
      at:     Date.now(),
      locked: false,
    };
    this.snippets.unshift(snippet);
    await this._saveSnippets();
    return snippet;
  }

  async updateSnippet(id, patch) {
    const s = this.snippets.find(x => x.id === id);
    if (s) {
      Object.assign(s, patch);
      await this._saveSnippets();
    }
    return s || null;
  }

  async lockSnippet(id, locked) {
    const s = this.snippets.find(x => x.id === id);
    if (s) { s.locked = locked; await this._saveSnippets(); }
  }

  async deleteSnippet(id) {
    const s = this.snippets.find(x => x.id === id);
    if (s?.locked) return;
    this.snippets = this.snippets.filter(s => s.id !== id);
    await this._saveSnippets();
  }

  // Permanently removes all soft-deleted clips.
  async emptyTrash() {
    const removed = this.clips.filter(c => c.deleted).length;
    this.clips = this.clips.filter(c => !c.deleted);
    await this._save();
    return { removed };
  }
}

function _clipKind(text) {
  const t = text.trim();
  if (/^https?:\/\//i.test(t)) return 'url';
  if (/[{}();]/.test(t) && t.includes('\n')) return 'code';
  return 'text';
}

function _fileKind(ext) {
  if (IMG_EXTS.has(ext))   return 'image';
  if (DOC_EXTS.has(ext))   return 'document';
  if (PRES_EXTS.has(ext))  return 'presentation';
  if (SHEET_EXTS.has(ext)) return 'spreadsheet';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (CODE_EXTS.has(ext))  return 'code';
  if (ARCH_EXTS.has(ext))  return 'archive';
  if (ext === 'APP')       return 'app';
  return 'file';
}

function _bytes(n) {
  if (n < 1024)            return n + ' B';
  if (n < 1024 * 1024)     return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}
