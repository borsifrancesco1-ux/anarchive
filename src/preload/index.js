import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('anarchive', {
  clipboard: {
    list:            ()                => ipcRenderer.invoke('clipboard:list'),
    trash:           ()                => ipcRenderer.invoke('clipboard:trash'),
    trashCount:      ()                => ipcRenderer.invoke('clipboard:trashCount'),
    add:             (text, kind, app) => ipcRenderer.invoke('clipboard:add', text, kind, app),
    pin:             (id, pinned)      => ipcRenderer.invoke('clipboard:pin', id, pinned),
    delete:          (id)              => ipcRenderer.invoke('clipboard:delete', id),
    lock:            (id, locked)      => ipcRenderer.invoke('clipboard:lock', id, locked),
    restore:         (id)              => ipcRenderer.invoke('clipboard:restore', id),
    permanentDelete: (id)              => ipcRenderer.invoke('clipboard:permanentDelete', id),
    onNew:  (cb) => {
      const handler = (_, clip) => cb(clip);
      ipcRenderer.on('clipboard:new', handler);
      return () => ipcRenderer.removeListener('clipboard:new', handler);
    },
    ignoreNext: (text) => ipcRenderer.invoke('clipboard:ignoreNext', text),
    queue: {
      list:  ()   => ipcRenderer.invoke('clipboard:queue:list'),
      clear: ()   => ipcRenderer.invoke('clipboard:queue:clear'),
      onChanged: (cb) => {
        const handler = (_, q) => cb(q);
        ipcRenderer.on('clipboard:queue:changed', handler);
        return () => ipcRenderer.removeListener('clipboard:queue:changed', handler);
      },
    },
  },
  vault: {
    listFiles:       ()              => ipcRenderer.invoke('vault:listFiles'),
    addFile:         (path)          => ipcRenderer.invoke('vault:addFile', path),
    deleteFile:      (id)            => ipcRenderer.invoke('vault:deleteFile', id),
    runOcr:          (id)            => ipcRenderer.invoke('vault:runOcr', id),
    choosePath:      ()              => ipcRenderer.invoke('vault:choosePath'),
    chooseFiles:     ()              => ipcRenderer.invoke('vault:chooseFiles'),
    getPath:         ()              => ipcRenderer.invoke('vault:getPath'),
    updateFileTags:  (id, tags)      => ipcRenderer.invoke('vault:updateFileTags', id, tags),
    setFileCategory: (id, category)  => ipcRenderer.invoke('vault:setFileCategory', id, category),
    lockFile:        (id, locked)    => ipcRenderer.invoke('vault:lockFile', id, locked),
    renameFile:      (id, newName)   => ipcRenderer.invoke('vault:renameFile', id, newName),
    emptyTrash:      ()              => ipcRenderer.invoke('vault:emptyTrash'),
    trashCount:      ()              => ipcRenderer.invoke('clipboard:trashCount'),
    shareFile:       (filePath)      => ipcRenderer.invoke('vault:shareFile', filePath),
  },
  snippets: {
    list:   ()                   => ipcRenderer.invoke('snippets:list'),
    add:    (title, text, kind)  => ipcRenderer.invoke('snippets:add', title, text, kind),
    update: (id, patch)          => ipcRenderer.invoke('snippets:update', id, patch),
    delete: (id)                 => ipcRenderer.invoke('snippets:delete', id),
    lock:   (id, locked)         => ipcRenderer.invoke('snippets:lock', id, locked),
  },
  accum: {
    queue:      ()      => ipcRenderer.invoke('accum:queue'),
    finalize:   ()      => ipcRenderer.invoke('accum:finalize'),
    clear:      ()      => ipcRenderer.invoke('accum:clear'),
    removeItem: (idx)   => ipcRenderer.invoke('accum:removeItem', idx),
    onAdded: (cb) => {
      const handler = (_, data) => cb(data);
      ipcRenderer.on('accum:added', handler);
      return () => ipcRenderer.removeListener('accum:added', handler);
    },
    onFinalized: (cb) => {
      const handler = (_, data) => cb(data);
      ipcRenderer.on('accum:finalized', handler);
      return () => ipcRenderer.removeListener('accum:finalized', handler);
    },
    onQueueChanged: (cb) => {
      const handler = (_, q) => cb(q);
      ipcRenderer.on('accum:queueChanged', handler);
      return () => ipcRenderer.removeListener('accum:queueChanged', handler);
    },
  },
  monitor: {
    pause:  () => ipcRenderer.invoke('monitor:pause'),
    resume: () => ipcRenderer.invoke('monitor:resume'),
  },
  settings: {
    setVaultPath: (dir, opts) => ipcRenderer.invoke('settings:setVaultPath', dir, opts),
    setShortcut:  (accel)     => ipcRenderer.invoke('settings:setShortcut', accel),
    get:          ()          => ipcRenderer.invoke('settings:get'),
    set:          (patch)     => ipcRenderer.invoke('settings:set', patch),
  },
  system: {
    requestAccessibility: ()    => ipcRenderer.invoke('system:requestAccessibility'),
    openExternal:         (url) => ipcRenderer.invoke('system:openExternal', url),
    openPath:             (path)=> ipcRenderer.invoke('system:openPath', path),
    getVersion:           ()    => ipcRenderer.invoke('system:getVersion'),
    isMac:                ()    => ipcRenderer.invoke('system:isMac'),
    listRecentScreenshots:(limit) => ipcRenderer.invoke('system:listRecentScreenshots', limit),
  },
  window: {
    minimize:           () => ipcRenderer.send('window:minimize'),
    maximize:           () => ipcRenderer.send('window:maximize'),
    close:              () => ipcRenderer.send('window:close'),
    quit:               () => ipcRenderer.send('window:quit'),
    setSize:            (w, h) => ipcRenderer.send('window:setSize', w, h),
    openSettingsWindow: () => ipcRenderer.send('settings:openWindow'),
    setAlwaysOnTop:     (enabled) => ipcRenderer.send('window:setAlwaysOnTop', enabled),
    broadcast:          (patch) => ipcRenderer.send('window:broadcast', patch),
    onBroadcast: (cb) => {
      const handler = (_, patch) => cb(patch);
      ipcRenderer.on('window:broadcast', handler);
      return () => ipcRenderer.removeListener('window:broadcast', handler);
    },
    onSetView: (cb) => {
      // B14: forward the full payload object {view, tab} as expected by renderer
      const handler = (_, payload) => cb(payload);
      ipcRenderer.on('view:setView', handler);
      return () => ipcRenderer.removeListener('view:setView', handler);
    },
  },
  getFilePath: (file) => { try { return webUtils.getPathForFile(file); } catch { return ''; } },
  dragout: (filePath) => ipcRenderer.send('file:dragout', filePath),
});
