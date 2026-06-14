// =============================================================
// api.js — single abstraction layer over all window.anarchive IPC calls.
// All renderer code should import from here instead of calling
// window.anarchive.* directly. Gracefully handles demo mode (no preload).
// =============================================================

const ac = () => window.anarchive;
const hasAc = () => !!window.anarchive;

// ── Clipboard ────────────────────────────────────────────────
export const clipboard = {
  list:   ()                  => ac()?.clipboard.list(),
  pin:    (id, pinned)        => ac()?.clipboard.pin(id, pinned),
  delete: (id)                => ac()?.clipboard.delete(id),
  lock:   (id, locked)        => ac()?.clipboard.lock(id, locked),
  /** @param {(clip: object) => void} cb @returns {() => void} unsub */
  onNew:  (cb)                => ac()?.clipboard.onNew(cb) ?? (() => {}),
};

// ── Vault / Files ────────────────────────────────────────────
export const vault = {
  listFiles:       ()                    => ac()?.vault.listFiles(),
  addFile:         (path)                => ac()?.vault.addFile(path),
  deleteFile:      (id)                  => ac()?.vault.deleteFile(id),
  lockFile:        (id, locked)          => ac()?.vault.lockFile(id, locked),
  runOcr:          (id)                  => ac()?.vault.runOcr(id),
  updateFileTags:  (id, tags)            => ac()?.vault.updateFileTags(id, tags),
  renameFile:      (id, newName)         => ac()?.vault.renameFile(id, newName),
  setFileCategory: (id, category)        => ac()?.vault.setFileCategory(id, category),
  shareFile:       (filePath)            => ac()?.vault.shareFile(filePath),
  chooseFiles:     ()                    => ac()?.vault.chooseFiles(),
  getPath:         ()                    => ac()?.vault.getPath(),
};

// ── Snippets ─────────────────────────────────────────────────
export const snippets = {
  list:   ()                       => ac()?.snippets.list?.(),
  add:    (title, text, kind)      => ac()?.snippets.add(title, text, kind),
  update: (id, patch)              => ac()?.snippets.update(id, patch),
  delete: (id)                     => ac()?.snippets.delete(id),
};

// ── System ───────────────────────────────────────────────────
export const system = {
  isMac:                 ()      => ac()?.system.isMac(),
  openExternal:          (url)   => ac()?.system.openExternal(url),
  openPath:              (path)  => ac()?.system.openPath(path),
  listRecentScreenshots: ()      => ac()?.system.listRecentScreenshots(),
};

// ── Window / Monitor ─────────────────────────────────────────
export const win = {
  setSize:    (w, h)   => ac()?.window.setSize(w, h),
  close:      ()       => ac()?.window.close(),
  /** @param {(payload: any) => void} cb @returns {() => void} unsub */
  onSetView:  (cb)     => ac()?.window.onSetView(cb) ?? (() => {}),
};

export const monitor = {
  pause:  () => ac()?.monitor.pause(),
  resume: () => ac()?.monitor.resume(),
};

// ── Drag-out ─────────────────────────────────────────────────
export const dragout = (filePath) => ac()?.dragout(filePath);

// ── File path (from DataTransfer File object) ─────────────────
export const getFilePath = (f) => {
  try { return ac()?.getFilePath(f) || ''; } catch { return ''; }
};

// ── Demo mode guard ───────────────────────────────────────────
export const isDemoMode = () => !hasAc();
