import { useState, useEffect } from 'react';
import { isDemoMode, clipboard, vault } from '../api.js';

const NOW = Date.now();
export const MOCK_CLIPS = [
  { id: '1', text: 'https://github.com/torvalds/linux', kind: 'url', app: 'Firefox', at: NOW - 120000, pinned: false, meta: '38 chars' },
  { id: '2', text: 'const anarchive = require(\'anarchive\')', kind: 'code', app: 'VS Code', at: NOW - 300000, pinned: true, meta: '38 chars' },
  { id: '3', text: 'Remember to call the plumber on Thursday', kind: 'text', app: 'Notes', at: NOW - 900000, pinned: false, meta: '40 chars' },
  { id: '4', text: 'npm install electron-vite @vitejs/plugin-react', kind: 'code', app: 'Terminal', at: NOW - 1800000, pinned: false, meta: '46 chars' },
  { id: '5', text: 'The archive is not the destination, it is the detour.', kind: 'text', app: 'iA Writer', at: NOW - 3600000, pinned: true, meta: '53 chars' },
  { id: '6', text: 'https://vitejs.dev/guide/', kind: 'url', app: 'Chrome', at: NOW - 7200000, pinned: false, meta: '25 chars' },
  { id: '7', text: 'SELECT * FROM clips WHERE pinned = 1 ORDER BY at DESC', kind: 'code', app: 'TablePlus', at: NOW - 86400000, pinned: false, meta: '53 chars' },
  { id: '8', text: 'borsifrancesco1@gmail.com', kind: 'text', app: 'Mail', at: NOW - 172800000, pinned: false, meta: '25 chars' },
  { id: '9', text: 'cd ~/Anarchive && npm run dev', kind: 'code', app: 'Terminal', at: NOW - 259200000, pinned: false, meta: '29 chars' },
  { id: '10', text: 'A quiet shelf for everything you copy.', kind: 'text', app: 'Notion', at: NOW - 345600000, pinned: true, meta: '38 chars' },
];
export const MOCK_FILES = [
  { id: 'f1', name: 'design-system.pdf',                    ext: 'PDF', kind: 'document', size: '4.2 MB', at: NOW - 3600000 },
  { id: 'f2', name: 'Screenshot 2026-05-27 at 14.32.11.png', ext: 'PNG', kind: 'image',    size: '1.1 MB', at: NOW - 7200000,   color: '#7c5ea0' },
  { id: 'f3', name: 'notes.md',                             ext: 'MD',  kind: 'document', size: '12 KB',  at: NOW - 86400000 },
  { id: 'f4', name: 'archive.zip',                          ext: 'ZIP', kind: 'file',     size: '38 MB',  at: NOW - 172800000 },
  { id: 'f5', name: 'voice-memo.m4a',                       ext: 'M4A', kind: 'audio',    size: '3.8 MB', at: NOW - 259200000 },
  { id: 'f6', name: 'Screenshot 2026-05-26 at 09.11.04.png', ext: 'PNG', kind: 'image',    size: '840 KB', at: NOW - 345600000, color: '#c75c2f' },
];

/**
 * Loads clipboard clips and vault files from IPC (Electron) or falls back to
 * mock data in demo/browser mode. Subscribes to new-clip events for live updates.
 *
 * @returns {{ clips: object[], setClips: Function, files: object[], setFiles: Function, ready: boolean }}
 */
export function useVault() {
  const [clips, setClips] = useState([]);
  const [trashedClips, setTrashedClips] = useState([]);
  const [files, setFiles] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isDemoMode()) {
      let cancelled = false;
      Promise.all([
        clipboard.list(),
        window.anarchive?.clipboard?.trash?.() ?? Promise.resolve([]),
        vault.listFiles(),
      ]).then(([c, t, f]) => {
        if (cancelled) return;
        setClips(c ?? []);
        setTrashedClips(t ?? []);
        setFiles(f ?? []);
        setReady(true);
      }).catch(() => {
        if (cancelled) return;
        setClips(MOCK_CLIPS);
        setTrashedClips([]);
        setFiles(MOCK_FILES);
        setReady(true);
      });

      const unsub = clipboard.onNew((clip) => {
        setClips(prev => {
          const existing = prev.find(c => c.id === clip.id);
          return existing
            ? prev.map(c => c.id === clip.id ? clip : c)
            : [clip, ...prev];
        });
      });
      return () => { cancelled = true; unsub(); };
    } else {
      setClips(MOCK_CLIPS);
      setTrashedClips([]);
      setFiles(MOCK_FILES);
      setReady(true);
    }
  }, []);

  return { clips, setClips, trashedClips, setTrashedClips, files, setFiles, ready };
}
