import { create } from 'zustand';
import { setCurrentLang } from '../utils.js';

/**
 * Global UI state: theme/lang preferences, OS detection, transient toasts.
 * Timer management for toasts stays in App.jsx (useRef) — only the visible state lives here.
 */
export const useAppStore = create((set) => ({
  // ── Theme ──────────────────────────────────────────────────
  theme: (() => { try { return localStorage.getItem('ac.theme') || 'light'; } catch { return 'light'; } })(),
  setTheme: (t) => {
    set({ theme: t });
    try { localStorage.setItem('ac.theme', t); } catch {}
  },

  // ── Language ───────────────────────────────────────────────
  lang: (() => { try { return localStorage.getItem('ac.lang') || 'en'; } catch { return 'en'; } })(),
  setLang: (l) => {
    set({ lang: l });
    setCurrentLang(l);
    try { localStorage.setItem('ac.lang', l); } catch {}
  },

  // ── OS / platform ──────────────────────────────────────────
  isMac: false,
  setIsMac: (v) => set({ isMac: v }),

  // ── Share error toast ──────────────────────────────────────
  shareToast: null,
  setShareToast: (msg) => set({ shareToast: msg }),

  // ── Easter egg toast + GIF ─────────────────────────────────
  // Timer IDs are kept in a useRef in App.jsx for cleanup; only visible state here.
  easterToast: null,
  setEasterToast: (msg) => set({ easterToast: msg }),
  easterGifVisible: false,
  setEasterGifVisible: (v) => set({ easterGifVisible: v }),
}));
