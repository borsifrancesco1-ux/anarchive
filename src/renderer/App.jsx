import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import {
  Icon, TrafficLights, BackButton, ForwardButton, AnarchiveWordmark, AnarchiveMark,
  Kbd, KindBadge, ClipRow, FileTile, SearchInput, EmptyState, DropOverlay, KindThumb,
} from './components.jsx';
import { formatAgo, setCurrentLang } from './utils.js';
import { OnboardingView } from './views-onboarding.jsx';
import { MenuBarView }    from './views-menubar.jsx';
import { SettingsView }   from './views-settings.jsx';
import { LangContext, useT, t, LANG_OPTIONS } from './i18n.js';
import { EASTER_EGGS, pickMessage, pickEmptyStateQuote, readShownMilestones, persistShownMilestones, milestonesCrossed } from './easterEggs.js';
import jarEasterGif from './assets/jar-easter.gif';
import { useVault } from './hooks/useVault.js';
import { useProjects, useProjectAssignments } from './hooks/useProjects.js';
import { useWorkspace } from './hooks/useWorkspace.js';
import { useRouter } from './hooks/useRouter.js';
import { useAppStore } from './store/useAppStore.js';
import { BrandLogoEgg } from './easter/BrandLogoEgg.jsx';
import { EmptyStateQuoteOverlay } from './easter/EmptyStateQuoteOverlay.jsx';
import { SpecialAggResult } from './easter/SpecialAggResult.jsx';
import { BundleComposer, BundleToast } from './BundleComposer.jsx';

// =============================================================
// Screenshot filename detection
// =============================================================
function isScreenshot(file) {
  return file.kind === 'image' && /^screenshot/i.test(file.name);
}

const OCR_IMG_EXTS = new Set(['PNG','JPG','JPEG','WEBP','HEIC','HEIF','BMP','TIFF']);

function askConfirm(msg) {
  const stored = localStorage.getItem('ac.confirmDelete');
  const confirmOn = stored === null || JSON.parse(stored) === true;
  if (!confirmOn) return true;
  return window.confirm(msg);
}

function _newUUID() { return crypto.randomUUID?.() ?? ('id-' + Date.now() + '-' + Math.random().toString(36).slice(2)); }

// M4: minimal schema versioning — runs once per browser to migrate stale formats
const _AC_SCHEMA = 1;
(function _migrateSchema() {
  try {
    const v = parseInt(localStorage.getItem('ac.schemaVersion') || '0', 10);
    if (v >= _AC_SCHEMA) return;
    // v0 → v1: ensure ac.shortcut is an array (some old builds stored a string)
    try {
      const raw = localStorage.getItem('ac.shortcut');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) && typeof parsed === 'string') {
          localStorage.setItem('ac.shortcut', JSON.stringify(parsed.split('+').map(s => s.trim())));
        }
      }
    } catch {}
    // Ensure workspaces array shape
    try {
      const raw = localStorage.getItem('ac.workspaces');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) localStorage.removeItem('ac.workspaces');
      }
    } catch { localStorage.removeItem('ac.workspaces'); }
    localStorage.setItem('ac.schemaVersion', String(_AC_SCHEMA));
  } catch (err) { console.warn('Anarchive schema migration failed:', err.message); }
})();

// =============================================================
// Launcher — compact file tile (drag-out enabled)
// =============================================================
function LauncherFileTile({ file, onOpen }) {
  const [hovered, setHovered] = useState(false);
  const canDrag = window.anarchive && file.path;
  const iconName =
    file.kind === 'document'     ? 'fileText'
    : file.kind === 'audio'      ? 'fileAudio'
    : file.kind === 'image'      ? 'image'
    : file.kind === 'video'      ? 'film'
    : file.kind === 'presentation' || file.kind === 'spreadsheet' ? 'fileText'
    : file.kind === 'app'        ? 'folder'
    : 'file';
  const bg = file.kind === 'image' && file.color ? file.color
    : file.kind === 'document'     ? '#2a1810'
    : file.kind === 'audio'        ? '#2e2440'
    : file.kind === 'video'        ? '#1a2440'
    : file.kind === 'app'          ? '#1e1a30'
    : '#261e36';
  const fg = (file.kind === 'document' || file.kind === 'audio' || file.kind === 'video') ? '#FF8A33' : '#80738f';

  return (
    <div
      draggable={!!canDrag}
      onDragStart={canDrag ? (e) => {
        e.preventDefault();
        window.anarchive.dragout(file.path);
      } : undefined}
      onDoubleClick={() => onOpen?.(file)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={file.name + (onOpen ? '\nDouble-click to open' : '')}
      style={{
        // Reduced base width so scaled-up + glow stays inside the launcher column.
        width: 58, borderRadius: 10, overflow: 'hidden', flex: 'none',
        border: '1px solid ' + (hovered ? '#FF8A33' : '#2e2440'),
        background: bg, position: 'relative',
        cursor: onOpen ? 'pointer' : (canDrag ? (hovered ? 'grab' : 'default') : 'default'),
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        zIndex: hovered ? 2 : 1,
        // Contained glow — smaller spread so it doesn't get clipped by the launcher container
        boxShadow: hovered
          ? '0 0 0 1px rgba(255,138,51,0.55), 0 0 12px 2px rgba(255,138,51,0.32)'
          : 'none',
        transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 220ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms ease',
      }}>
      <div style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', color: fg }}>
        <Icon name={iconName} size={18} strokeWidth={1.5} />
      </div>
      <div style={{
        padding: '4px 6px 6px', background: '#1d1729',
        borderTop: '1px solid #2e2440',
        fontFamily: 'var(--ac-font-ui)', fontSize: 9.5, color: '#80738f',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center',
      }}>{file.name}</div>
      {hovered && canDrag && (
        <div style={{
          position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: 3,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}><Icon name="externalLink" size={9} strokeWidth={2.5} /></div>
      )}
    </div>
  );
}

// =============================================================
// Launcher screenshot thumbnail
// =============================================================
function LauncherScreenshotThumb({ file, onOpen, isPinned = false, onTogglePin, dark = true }) {
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const canDrag = window.anarchive && file.path;
  const hasPath = !!file.path;
  const at = file.mtime ?? file.at;

  return (
    <div
      draggable={!!canDrag}
      onDragStart={canDrag ? (e) => {
        e.preventDefault();
        window.anarchive.dragout(file.path);
      } : undefined}
      onDoubleClick={() => onOpen?.(file)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={file.name}
      style={{
        borderRadius: 7, overflow: 'hidden', flex: 'none',
        border: '1px solid ' + (hovered ? '#FF8A33' : (isPinned ? 'rgba(255,138,51,0.45)' : (dark ? '#2e2440' : 'var(--ac-dust)'))),
        background: dark ? '#261e36' : '#fffdf6', position: 'relative', width: '100%',
        cursor: onOpen ? 'pointer' : (canDrag ? (hovered ? 'grab' : 'default') : 'default'),
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        zIndex: hovered ? 2 : 1,
        boxShadow: hovered
          ? '0 0 0 1px rgba(255,138,51,0.55), 0 0 10px 0 rgba(255,138,51,0.40)'
          : 'none',
        transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 220ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms ease',
      }}>
      <div style={{ height: 52, position: 'relative', overflow: 'hidden' }}>
        {hasPath ? (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: dark ? '#80738f' : 'var(--ac-fg-3)',
              opacity: imgLoaded ? 0 : 1, transition: 'opacity 150ms',
              pointerEvents: 'none',
            }}>
              <Icon name="image" size={16} strokeWidth={1.5} />
            </div>
            <img
              src={`ac-file://${file.path}`}
              alt={file.name}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                opacity: imgLoaded ? 1 : 0, transition: 'opacity 150ms',
              }}
            />
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: file.color || '#3d2f56',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: dark ? '#80738f' : 'var(--ac-fg-3)',
          }}>
            <Icon name="image" size={16} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div style={{
        padding: '3px 5px 4px',
        fontFamily: 'var(--ac-font-mono)', fontSize: 8.5,
        color: dark ? '#5a4f6c' : 'var(--ac-fg-4, rgba(74,14,122,0.55))',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        background: dark ? '#1d1729' : '#faf3e0', borderTop: '1px solid ' + (dark ? '#2e2440' : 'var(--ac-dust)'),
      }}>{at ? formatAgo(at) : ''}</div>

      {/* Pin/unpin button — bottom-left when hovered OR always when pinned */}
      {onTogglePin && (hovered || isPinned) && (
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(file.path); }}
          title={isPinned ? 'Rimuovi dai fissati' : 'Fissa screenshot'}
          style={{
            position: 'absolute', bottom: 4, left: 4,
            width: 16, height: 16, borderRadius: 3,
            background: isPinned ? '#FF6B00' : 'rgba(0,0,0,0.60)',
            border: 0, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            transition: 'background 160ms ease, transform 140ms ease',
          }}>
          <Icon name="pin" size={9} strokeWidth={2.5} />
        </button>
      )}

      {/* Drag-out hint (top-right, hover only) */}
      {hovered && canDrag && (
        <div style={{
          position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 3,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          pointerEvents: 'none',
        }}><Icon name="externalLink" size={8} strokeWidth={2.5} /></div>
      )}
    </div>
  );
}

// =============================================================
// Launcher view — small floating window
// =============================================================
function LauncherView({ clips, files, onExpand, onAddFile, onOpenProject, onOpenTag, onOpenFile, onOpenBundle, projects = [], tags = [], pinnedPrompts = [], lang, theme = 'dark' }) {
  const T = useT();
  const dark = theme !== 'light';
  // Theme tokens centralized here so the launcher follows the app theme.
  const tk = dark ? {
    bg: '#15101c', bgDragOver: '#1d1420',
    panel: '#1d1729', panelAlt: '#110b1a', divider: '#2e2440',
    fg1: '#f3eef9', fg2: '#b9accd', fg3: '#80738f', fg4: '#5a4f6c', fg5: '#3d2f56',
    inputBg: '#110b1a', inputFg: '#f3eef9',
    accent: '#FF6B00', accentSoft: '#FF8A33',
    purpleDim: '#4A0E7A',
  } : {
    bg: '#fffdf6', bgDragOver: '#fff7e8',
    panel: '#faf3e0', panelAlt: '#fffdf6', divider: 'var(--ac-dust)',
    fg1: 'var(--ac-fg-1)', fg2: 'var(--ac-fg-2)', fg3: 'var(--ac-fg-3)',
    fg4: 'rgba(74,14,122,0.55)', fg5: 'rgba(74,14,122,0.30)',
    inputBg: '#fffdf6', inputFg: 'var(--ac-fg-1)',
    accent: '#FF6B00', accentSoft: '#b34a02',
    purpleDim: '#4A0E7A',
  };
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropMsg, setDropMsg] = useState(null);
  const [copiedPromptId, setCopiedPromptId] = useState(null);
  const [showScreenshots, setShowScreenshots] = useState(() => { try { return localStorage.getItem('ac.launcher.showSS') === 'true'; } catch { return false; } });
  const [showPromptCol, setShowPromptCol] = useState(() => { try { return localStorage.getItem('ac.launcher.showPrompts') === 'true'; } catch { return false; } });
  const recentFiles = useMemo(() => files.filter(f => !isScreenshot(f)).slice(0, 5), [files]);

  // ── Screenshots column (pinned + recent OS captures) ───────────────────────
  // Recent OS screenshots fetched from ~/Desktop (or wherever macOS stores them).
  const [osScreenshots, setOsScreenshots] = useState([]);
  useEffect(() => {
    if (!window.anarchive?.system?.listRecentScreenshots) return;
    let cancelled = false;
    const load = () => {
      window.anarchive.system.listRecentScreenshots(30).then((list) => {
        if (!cancelled) setOsScreenshots(Array.isArray(list) ? list : []);
      }).catch(() => {});
    };
    load();
    // Refresh on window focus (e.g. user took new screenshot while away)
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { cancelled = true; window.removeEventListener('focus', onFocus); };
  }, []);

  // Pinned paths persisted across sessions
  const [pinnedScreenshotPaths, setPinnedScreenshotPaths] = useState(() => {
    try {
      const raw = localStorage.getItem('ac.launcher.pinnedScreenshots');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  });
  const savePinnedScreenshots = (arr) => {
    setPinnedScreenshotPaths(arr);
    try { localStorage.setItem('ac.launcher.pinnedScreenshots', JSON.stringify(arr)); } catch {}
  };
  const togglePinScreenshot = (path) => {
    if (pinnedScreenshotPaths.includes(path)) {
      savePinnedScreenshots(pinnedScreenshotPaths.filter(p => p !== path));
    } else {
      savePinnedScreenshots([path, ...pinnedScreenshotPaths].slice(0, 12));
    }
  };

  // Build the column contents:
  // - Pinned section: items whose path is in pinnedScreenshotPaths (in pin order),
  //   enriched with metadata from osScreenshots when available.
  // - Recent section: osScreenshots minus pinned, top 8.
  const pinnedScreenshots = useMemo(() => {
    return pinnedScreenshotPaths
      .map(path => osScreenshots.find(s => s.path === path) || { path, name: path.split('/').pop() })
      .filter(Boolean);
  }, [pinnedScreenshotPaths, osScreenshots]);
  const recentOsScreenshots = useMemo(() => {
    const pinnedSet = new Set(pinnedScreenshotPaths);
    return osScreenshots.filter(s => !pinnedSet.has(s.path)).slice(0, 8);
  }, [osScreenshots, pinnedScreenshotPaths]);
  // Back-compat: keep `screenshots` for the column-toggle "has content" check
  const screenshots = useMemo(
    () => [...pinnedScreenshots, ...recentOsScreenshots],
    [pinnedScreenshots, recentOsScreenshots]
  );
  // Columns visible if toggle on (independent of contents — empty state shown when none)
  const hasScreenshots = showScreenshots;
  const hasPrompts = showPromptCol;

  const toggleScreenshots = () => { const v = !showScreenshots; setShowScreenshots(v); try { localStorage.setItem('ac.launcher.showSS', String(v)); } catch {} };
  const togglePrompts = () => { const v = !showPromptCol; setShowPromptCol(v); try { localStorage.setItem('ac.launcher.showPrompts', String(v)); } catch {} };

  // Resize window when columns change
  useEffect(() => {
    if (!window.anarchive) return;
    const cols = (hasScreenshots ? 1 : 0) + (hasPrompts ? 1 : 0);
    const w = 540 + cols * 110 + 10;
    window.anarchive.window.setSize(w, 560);
  }, [hasScreenshots, hasPrompts]);

  const filtered = useMemo(() => {
    if (!query.trim()) return clips.slice(0, 5);
    const q = query.toLowerCase();
    return clips.filter(c =>
      (c.text || '').toLowerCase().includes(q) ||
      (c.app  || '').toLowerCase().includes(q)
    ).slice(0, 5);
  }, [clips, query]);

  useEffect(() => { setSel(0); }, [query]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s+1, filtered.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel(s => Math.max(s-1, 0)); }
    // Cmd/Ctrl + 1..9: jump-paste the Nth result
    if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      const clip = filtered[idx];
      if (clip) {
        e.preventDefault();
        navigator.clipboard.writeText(clip.text)
          .then(() => window.anarchive?.window.close())
          .catch(() => {});
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const clip = filtered[sel];
      if (!clip) return;
      navigator.clipboard.writeText(clip.text)
        .then(() => window.anarchive?.window.close())
        .catch(() => {});
    }
    if (e.key === 'Escape') window.anarchive?.window.close();
  };

  const handleDragOver = (e) => {
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };
  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
  };
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f || !window.anarchive) return;
    let filePath = '';
    try { filePath = window.anarchive.getFilePath(f) || ''; } catch {}
    if (!filePath) filePath = f.path || '';
    if (!filePath) return;
    const vaultFile = await window.anarchive.vault.addFile(filePath).catch(() => null);
    if (vaultFile) {
      onAddFile?.(vaultFile);
      setDropMsg(vaultFile.name);
      setTimeout(() => setDropMsg(null), 2000);
    }
  };

  const cols = (hasScreenshots ? 1 : 0) + (hasPrompts ? 1 : 0);
  const totalWidth = 540 + cols * 110 + 10;

  return (
    <div data-screen-label="01 Launcher"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: totalWidth, borderRadius: 16, overflow: 'hidden',
        maxHeight: 'calc(100vh - 64px)',
        background: isDragOver ? tk.bgDragOver : tk.bg,
        boxShadow: isDragOver
          ? `0 0 0 2px ${tk.accent}, 0 28px 70px rgba(15,8,28,0.55)`
          : `0 0 0 1px ${dark ? 'rgba(0,0,0,0.45)' : 'rgba(74,14,122,0.18)'}, 0 28px 70px rgba(15,8,28,${dark ? 0.55 : 0.18})`,
        display: 'flex', flexDirection: 'column', position: 'relative',
        fontFamily: 'var(--ac-font-ui)',
        // Make the whole launcher draggable (children mark themselves no-drag)
        WebkitAppRegion: 'drag',
        transition: 'box-shadow 120ms, background 120ms, width 200ms cubic-bezier(0.22,0.61,0.36,1)',
      }}>

      {/* Draggable title bar — full width */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', background: tk.panel, borderBottom: '1px solid ' + tk.divider,
        WebkitAppRegion: 'drag', userSelect: 'none',
      }}>
        <div style={{ WebkitAppRegion: 'no-drag' }}>
          <TrafficLights dark={dark} onClose={() => window.anarchive?.window.close()} onMinimize={() => {}} onZoom={() => {}} />
        </div>
        <div style={{ flex: 1 }} />
        <AnarchiveWordmark size={14} color={tk.fg1} />
        <div style={{ flex: 1 }} />
        {/* Column toggles — always visible, independent of contents */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
          <button onClick={toggleScreenshots} title={showScreenshots ? 'Nascondi screenshot' : 'Mostra screenshot'} style={{
            background: showScreenshots ? (dark ? 'rgba(74,14,122,0.35)' : 'rgba(74,14,122,0.10)') : 'transparent',
            border: '1px solid ' + (showScreenshots ? tk.purpleDim : tk.divider),
            color: showScreenshots ? (dark ? '#c4a9e8' : tk.purpleDim) : tk.fg5,
            borderRadius: 4, padding: '3px 6px', cursor: 'pointer',
            fontFamily: 'var(--ac-font-ui)', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 3,
            transition: 'background 160ms, color 160ms, border-color 160ms',
          }}>
            <Icon name="camera" size={9} strokeWidth={2} />SS
          </button>
          <button onClick={togglePrompts} title={showPromptCol ? 'Nascondi prompt' : 'Mostra prompt'} style={{
            background: showPromptCol ? 'rgba(255,107,0,0.2)' : 'transparent',
            border: '1px solid ' + (showPromptCol ? '#FF6B00' : tk.divider),
            color: showPromptCol ? '#FF8A33' : tk.fg5,
            borderRadius: 4, padding: '3px 6px', cursor: 'pointer',
            fontFamily: 'var(--ac-font-ui)', fontSize: 9, fontWeight: 600,
            letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 3,
            transition: 'background 160ms, color 160ms, border-color 160ms',
          }}>
            <Icon name="pin" size={9} strokeWidth={2} />PT
          </button>
        </div>
        <ExpandWindowButton onClick={onExpand} tk={tk} />
      </div>

      {/* Body row: left (clips) + right (screenshots) — mark no-drag so interactive elements work */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, WebkitAppRegion: 'no-drag' }}>

        {/* Left column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* Search */}
          <div style={{ padding: '12px 14px 8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 10, background: tk.inputBg, border: '1px solid ' + tk.divider,
            }}>
              <span style={{ color: tk.accent, display: 'flex' }}>
                <Icon name="search" size={18} strokeWidth={2.25} />
              </span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={T('search.placeholder')}
                style={{
                  flex: 1, background: 'transparent', border: 0, outline: 'none',
                  fontFamily: 'var(--ac-font-ui)', fontSize: 17, fontWeight: 400, color: tk.inputFg,
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{
                  background: 'transparent', border: 0, color: tk.fg3,
                  fontFamily: 'var(--ac-font-mono)', fontSize: 11, cursor: 'pointer',
                }}>{T('search.clear')}</button>
              )}
            </div>
          </div>

          {/* Recent files — shown only when not searching */}
          {!query.trim() && recentFiles.length > 0 && (
            <div style={{ padding: '2px 14px 10px' }}>
              <div style={{
                fontFamily: 'var(--ac-font-ui)', fontSize: 9.5, fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: tk.fg4, marginBottom: 8,
              }}>{T('launcher.recentFiles')}</div>
              {/* overflowY changed to visible so file tile hover glow doesn't get clipped */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxHeight: 200 }}>
                {recentFiles.map(f => <LauncherFileTile key={f.id} file={f} onOpen={onOpenFile} />)}
              </div>
            </div>
          )}

          {/* Clip list label */}
          {(!query.trim() && recentFiles.length > 0) && (
            <div style={{
              fontFamily: 'var(--ac-font-ui)', fontSize: 9.5, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: tk.fg4, padding: '2px 14px 6px',
            }}>{T('launcher.recentClips')}</div>
          )}

          {/* Clip list — flex:1 fills remaining space; overflowY scrolls within the window */}
          <div style={{ padding: '8px 8px 10px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <SpecialAggResult query={query} dark={dark} />
            {query !== EASTER_EGGS.specialSearchAGG.trigger && filtered.length === 0 ? (
              <div style={{
                padding: '24px 20px', textAlign: 'center',
                fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
                fontSize: 13, color: tk.fg3,
              }}>{T('launcher.noMatches')}</div>
            ) : filtered.map((clip, i) => (
              <ClipRow key={clip.id} clip={clip} idx={i} selected={i === sel} onSelect={() => setSel(i)}
                onPreview={(c) => { setSel(i); if (c?.kind === 'bundle') onOpenBundle?.(c); }}
                dark={dark} compact />
            ))}
          </div>

          {/* Projects strip — quick navigation */}
          {!query.trim() && projects.length > 0 && (
            <div style={{ padding: '6px 14px 4px', borderTop: '1px solid ' + tk.divider }}>
              <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: tk.fg3, marginBottom: 6 }}>{T('launcher.projects')}</div>
              {/* padding gives chips room for the glow halo (since this strip lives inside a column with overflow) */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxHeight: 64, overflowY: 'auto', padding: '4px 2px' }}>
                {projects.map(p => (
                  <GlowChip key={p.id} dark={dark} variant="project" onClick={() => onOpenProject?.(p.id)} title={p.name}>
                    <span style={{ fontSize: 12, lineHeight: 1 }}>{p.emoji || '📁'}</span>
                    {p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name}
                  </GlowChip>
                ))}
              </div>
            </div>
          )}

          {/* Tags strip */}
          {!query.trim() && tags.length > 0 && (
            <div style={{ padding: '4px 14px 8px', borderTop: projects.length > 0 ? 'none' : '1px solid #2e2440' }}>
              <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: tk.fg3, marginBottom: 6 }}>{T('launcher.tags')}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxHeight: 56, overflowY: 'auto', padding: '4px 2px' }}>
                {tags.map(tag => (
                  <GlowChip key={tag} dark={dark} variant="tag" onClick={() => onOpenTag?.(tag)} title={`#${tag}`}>
                    <span style={{ color: tk.fg4, fontSize: 9 }}>#</span>{tag}
                  </GlowChip>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
            background: tk.panel, borderTop: '1px solid ' + tk.divider,
            fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: tk.fg3,
          }}>
            <Kbd dark={dark}>↵</Kbd><span>{T('launcher.paste')}</span>
            <Kbd dark={dark}>Esc</Kbd><span>{T('launcher.close')}</span>
            <div style={{ flex: 1 }} />
            <span style={{ color: tk.fg4 }}>{filtered.length} of {clips.length}</span>
          </div>
        </div>

        {/* Screenshots column — pinned section + recent OS captures */}
        {hasScreenshots && (
          <div style={{
            width: 110, flex: 'none',
            borderLeft: '1px solid ' + tk.divider,
            background: tk.panelAlt,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '10px 8px 6px',
              fontFamily: 'var(--ac-font-ui)', fontSize: 9, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: tk.fg5,
              borderBottom: '1px solid ' + tk.divider,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Icon name="camera" size={9} strokeWidth={2.5} />
              Screenshot
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pinnedScreenshots.length === 0 && recentOsScreenshots.length === 0 && (
                <div style={{
                  padding: '12px 6px', textAlign: 'center',
                  fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
                  fontSize: 10, color: tk.fg5, lineHeight: 1.4,
                }}>Nessuno screenshot recente.</div>
              )}

              {/* Pinned section */}
              {pinnedScreenshots.length > 0 && (
                <>
                  <div style={{
                    fontFamily: 'var(--ac-font-mono)', fontSize: 8, fontWeight: 600,
                    letterSpacing: '0.10em', textTransform: 'uppercase',
                    color: '#FF8A33', padding: '0 1px',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <Icon name="pin" size={7} strokeWidth={2.5} />
                    Fissati
                  </div>
                  {pinnedScreenshots.map(f => (
                    <LauncherScreenshotThumb
                      key={`pin-${f.path}`}
                      file={f} dark={dark}
                      onOpen={onOpenFile}
                      isPinned
                      onTogglePin={togglePinScreenshot}
                    />
                  ))}
                </>
              )}

              {/* Recent section */}
              {recentOsScreenshots.length > 0 && (
                <>
                  {pinnedScreenshots.length > 0 && (
                    <div style={{
                      fontFamily: 'var(--ac-font-mono)', fontSize: 8, fontWeight: 600,
                      letterSpacing: '0.10em', textTransform: 'uppercase',
                      color: tk.fg5, padding: '4px 1px 0',
                    }}>Recenti</div>
                  )}
                  {recentOsScreenshots.map(f => (
                    <LauncherScreenshotThumb
                      key={`rec-${f.path}`}
                      file={f} dark={dark}
                      onOpen={onOpenFile}
                      onTogglePin={togglePinScreenshot}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Pinned prompts column */}
        {hasPrompts && (
          <div style={{
            width: 110, flex: 'none',
            borderLeft: '1px solid ' + tk.divider,
            background: tk.panelAlt,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '10px 8px 6px',
              fontFamily: 'var(--ac-font-ui)', fontSize: 9, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#FF6B00',
              borderBottom: '1px solid ' + tk.divider,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Icon name="pin" size={8} strokeWidth={2.5} color="#FF6B00" />
              Prompt
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {pinnedPrompts.length === 0 && (
                <div style={{
                  padding: '12px 6px', textAlign: 'center',
                  fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
                  fontSize: 10, color: tk.fg5, lineHeight: 1.4,
                }}>Nessun prompt fissato. Aprine uno in un progetto e fissalo.</div>
              )}
              {pinnedPrompts.slice(0, 6).map(p => (
                <div key={p.id} style={{
                  background: tk.panel, borderRadius: 6,
                  border: '1px solid ' + tk.divider,
                  padding: '6px 7px',
                  display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                  {(p.title || p.text) && (
                    <div style={{
                      fontFamily: p.title ? 'var(--ac-font-ui)' : 'var(--ac-font-mono)',
                      fontSize: 9.5, fontWeight: p.title ? 600 : 400,
                      color: '#b9accd', lineHeight: 1.3,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>{p.title || p.text}</div>
                  )}
                  {p.title && (
                    <div style={{
                      fontFamily: 'var(--ac-font-mono)', fontSize: 8.5,
                      color: '#5a4f6c', lineHeight: 1.3,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                    }}>{p.text}</div>
                  )}
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(p.text).catch(() => {});
                      setCopiedPromptId(p.id);
                      setTimeout(() => setCopiedPromptId(null), 1400);
                    }}
                    style={{
                      marginTop: 2, padding: '3px 0', borderRadius: 4, border: 0, cursor: 'pointer',
                      background: copiedPromptId === p.id ? '#1f2e1f' : '#FF6B00',
                      color: copiedPromptId === p.id ? '#a3c777' : '#fff',
                      fontFamily: 'var(--ac-font-ui)', fontSize: 9, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                    }}>
                    <Icon name={copiedPromptId === p.id ? 'check' : 'copy'} size={8} strokeWidth={2.5} />
                    {copiedPromptId === p.id ? 'Copiato' : 'Copia'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drag-in overlay */}
      {isDragOver && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 16,
          background: 'rgba(255,107,0,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            color: '#FF8A33',
          }}>
            <Icon name="inbox" size={32} strokeWidth={1.5} />
            <span style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 15 }}>{T('launcher.dropToArchive')}</span>
          </div>
        </div>
      )}

      {/* Drop success toast */}
      {dropMsg && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 52, transform: 'translateX(-50%)',
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px',
          background: '#1d1729', color: '#fff', borderRadius: 999,
          fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          border: '1px solid #3d2f56', whiteSpace: 'nowrap',
        }}>
          <Icon name="check" size={13} strokeWidth={2.5} color="#FF8A33" />
          {T('misc.archived')}: {dropMsg}
        </div>
      )}
    </div>
  );
}

// =============================================================
// Screenshot auto-categorization (local, keyword-based)
// =============================================================
function classifyScreenshot(ocrText) {
  if (!ocrText || ocrText.length < 10) return null;
  const t = ocrText.toLowerCase();
  const scores = {
    code:     (t.match(/function|const |let |var |def |import |class |return |=>|\{\s|\}|;\s/g) || []).length,
    error:    (t.match(/error|exception|failed|warning|traceback|undefined|null pointer|stack trace|crash/g) || []).length,
    receipt:  (t.match(/total|subtotal|\$|€|£|quantity|price|invoice|payment|order #|tax|vat/g) || []).length,
    chat:     (t.match(/@|message|reply|sent|delivered|read|typing|pm|dm|reaction/g) || []).length,
    design:   (t.match(/frame|layer|artboard|component|figma|sketch|typography|spacing|grid|fill|stroke/g) || []).length,
    document: (t.match(/page \d|chapter|section|paragraph|abstract|references|introduction|figure \d/g) || []).length,
  };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 2 ? best[0] : null;
}

// =============================================================
// Clip full-content preview modal
// =============================================================
function ClipPreviewModal({ clip, dark, onClose, onPin, onDelete, onLock, projects = [], projectAssignments = {}, onAssignItem }) {
  const bg     = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const fg1    = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2    = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';
  const panel  = dark ? '#261e36' : '#f3ecda';
  const [copied, setCopied] = useState(false);
  const isUrl  = clip.kind === 'url';
  const isMono = clip.kind === 'code' || isUrl;

  const copy = () => {
    navigator.clipboard?.writeText(clip.text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(15,8,28,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 560, maxHeight: '75vh', display: 'flex', flexDirection: 'column',
        background: bg, border: '1px solid ' + border, borderRadius: 14,
        boxShadow: '0 32px 80px rgba(15,8,28,0.45)', overflow: 'hidden',
        fontFamily: 'var(--ac-font-ui)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          padding: '14px 16px 12px', borderBottom: '1px solid ' + border, flex: 'none',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)', marginBottom: 3 }}>Full preview</div>
            <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 12, color: fg3 }}>
              {clip.app && <span style={{ color: dark ? '#9d8fb8' : 'var(--ac-plum-600)' }}>{clip.app} · </span>}
              {clip.text.length} chars · {clip.kind}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flex: 'none', alignItems: 'center' }}>
            {isUrl && (
              <button onClick={() => {
                if (window.anarchive?.system?.openExternal) window.anarchive.system.openExternal(clip.text.trim());
                else window.open(clip.text.trim(), '_blank', 'noopener');
              }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6,
                background: 'transparent', color: dark ? '#f3eef9' : 'var(--ac-plum-800)',
                border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.22)'),
                fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>
                <Icon name="externalLink" size={12} strokeWidth={2} /> Open URL
              </button>
            )}
            {projects.length > 0 && (
              <select
                value={projectAssignments[clip.id] || ''}
                onChange={e => {
                  const pid = e.target.value || null;
                  if (pid) onAssignItem?.(clip.id, pid); else onAssignItem?.(clip.id, null);
                }}
                style={{
                  padding: '4px 8px', borderRadius: 6, fontSize: 11.5, fontFamily: 'var(--ac-font-ui)',
                  background: dark ? '#110b1a' : '#fffdf6', color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
                  border: '1px solid ' + (dark ? '#2e2440' : 'var(--ac-dust)'), outline: 'none', cursor: 'pointer',
                }}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {onPin && (
              <button onClick={() => onPin(!clip.pinned)} title={clip.pinned ? 'Rimuovi da In evidenza' : 'Metti in evidenza'} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6,
                background: clip.pinned ? (dark ? '#2a1e40' : '#fff2e5') : 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
                color: clip.pinned ? (dark ? '#FF8A33' : '#b34a02') : (dark ? '#80738f' : 'var(--ac-fg-3)'),
                cursor: 'pointer',
              }}><Icon name="star" size={13} strokeWidth={clip.pinned ? 2.5 : 2} /></button>
            )}
            {onLock && (
              <button onClick={() => onLock(!clip.locked)} title={clip.locked ? 'Sblocca' : 'Blocca'} style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6,
                background: clip.locked ? (dark ? '#1b2e1b' : '#edf5e5') : 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
                color: clip.locked ? (dark ? '#7eb661' : '#4a5621') : (dark ? '#80738f' : 'var(--ac-fg-3)'),
                cursor: 'pointer',
              }}><Icon name="shieldCheck" size={13} strokeWidth={2} /></button>
            )}
            {onDelete && !clip.locked && (
              <button onClick={() => { onDelete(); onClose(); }} title="Elimina" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6,
                background: 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
                color: dark ? '#80738f' : 'var(--ac-fg-3)',
                cursor: 'pointer',
              }}><Icon name="trash" size={13} strokeWidth={2} /></button>
            )}
            <button onClick={copy} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6,
              background: copied ? (dark ? '#1f2e1f' : '#eef0dc') : '#FF6B00',
              color: copied ? (dark ? '#a3c777' : '#4a5621') : '#fff', border: 0,
              fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              <Icon name={copied ? 'check' : 'copy'} size={12} strokeWidth={2.25} />
              {copied ? 'Copiato' : 'Copia'}
            </button>
            <button onClick={onClose} style={{
              background: 'transparent', border: '1px solid ' + border,
              color: fg3, borderRadius: 6, width: 28, height: 28,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
            }}><Icon name="x" size={12} strokeWidth={2.25} /></button>
          </div>
        </div>
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px',
          fontFamily: isMono ? 'var(--ac-font-mono)' : 'var(--ac-font-ui)',
          fontSize: isMono ? 12.5 : 14, color: fg1, lineHeight: 1.7,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {clip.text}
        </div>
        {clip.text.split('\n').length > 3 && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid ' + border, flex: 'none', fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: fg3 }}>
            {clip.text.split('\n').length} lines
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================
// Workspace tab — inline helpers + component
// =============================================================
function wsLabel(ws, projects, files, T) {
  const tr = T || ((k) => k);
  if (ws.openedFile) {
    const f = files?.find(f => f.id === ws.openedFile);
    const n = f?.name || tr('detail.details');
    return n.length > 14 ? n.slice(0, 13) + '…' : n;
  }
  if (ws.activeProject) {
    const p = projects?.find(p => p.id === ws.activeProject);
    const n = p?.name || tr('ws.project');
    return n.length > 12 ? n.slice(0, 11) + '…' : n;
  }
  if (ws.tab === 'snippets') return tr('ws.snippets');
  if (ws.query) return tr('ws.search');
  if (ws.tab === 'drop') {
    if (ws.tagFilter) { const t = ws.tagFilter; return tr('ws.files') + ' · #' + (t.length > 9 ? t.slice(0, 8) + '…' : t); }
    const fileKeys = { document: 'sidebar.documents', image: 'sidebar.images', screenshots: 'sidebar.screenshots', presentation: 'sidebar.presentations', spreadsheet: 'sidebar.spreadsheets', audio: 'sidebar.audio', video: 'sidebar.video' };
    const k = fileKeys[ws.fileFilter];
    return k ? tr('ws.files') + ' · ' + tr(k) : tr('ws.files');
  }
  if (ws.tab === 'clipboard') {
    const clipKeys = { pinned: 'sidebar.pinned', text: 'sidebar.text', url: 'sidebar.links', code: 'sidebar.code', bundle: 'sidebar.bundle' };
    const k = clipKeys[ws.filter];
    return k ? tr('ws.archive') + ' · ' + tr(k) : tr('ws.archive');
  }
  return tr('ws.archive');
}

function wsIcon(ws, projects) {
  if (ws.openedFile) return { type: 'icon', name: 'file' };
  if (ws.activeProject) {
    const p = projects?.find(p => p.id === ws.activeProject);
    if (p?.emoji) return { type: 'emoji', value: p.emoji };
    return { type: 'icon', name: 'folder' };
  }
  if (ws.tab === 'snippets') return { type: 'icon', name: 'bookmark' };
  if (ws.query) return { type: 'icon', name: 'search' };
  if (ws.tab === 'drop') {
    if (ws.tagFilter) return { type: 'icon', name: 'hash' };
    const fileIcons = { document: 'fileText', image: 'image', screenshots: 'camera', presentation: 'monitor', spreadsheet: 'grid', audio: 'music', video: 'film' };
    return { type: 'icon', name: fileIcons[ws.fileFilter] || 'folder' };
  }
  if (ws.tab === 'clipboard') {
    const clipIcons = { pinned: 'star', text: 'pilcrow', url: 'link', code: 'code', bundle: 'layers' };
    return { type: 'icon', name: clipIcons[ws.filter] || 'clipboard' };
  }
  return { type: 'icon', name: 'clipboard' };
}

function WorkspaceTab({ ws, isActive, onSwitch, onClose, canClose, dark, projects, files }) {
  const T = useT();
  const [hovered, setHovered] = useState(false);
  const label = wsLabel(ws, projects, files, T);
  const icon  = wsIcon(ws, projects);

  const bg = isActive
    ? '#4A0E7A'
    : hovered ? (dark ? 'rgba(74,14,122,0.22)' : 'rgba(74,14,122,0.08)') : 'transparent';
  const textColor = isActive ? '#fff' : (dark ? '#6b5f82' : 'rgba(31,14,46,0.55)');
  const borderColor = isActive ? '#FF6B00' : (dark ? '#2e2440' : 'rgba(74,14,122,0.18)');

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSwitch}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
        background: bg,
        border: isActive ? '1px solid #FF6B00' : `1px solid ${hovered ? '#FF8A33' : borderColor}`,
        // Contained glow — no outward spread (titlebar is too tight, would clip).
        // Use inset highlight + slight backdrop only.
        boxShadow: isActive
          ? 'inset 0 0 0 1px rgba(255,107,0,0.25), 0 1px 4px rgba(74,14,122,0.35)'
          : (hovered ? 'inset 0 0 0 1px rgba(255,138,51,0.45)' : 'none'),
        flex: 'none',
        transform: (hovered && !isActive) ? 'scale(1.025)' : 'scale(1)',
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), background 180ms ease, border-color 180ms ease',
        WebkitAppRegion: 'no-drag',
      }}
    >
      {icon.type === 'emoji' ? (
        <span style={{ fontSize: 11, lineHeight: 1, flex: 'none' }}>{icon.value}</span>
      ) : (
        <span style={{ flex: 'none', display: 'flex' }}>
          <Icon name={icon.name} size={11} strokeWidth={2}
            color={isActive ? '#FF8A33' : (dark ? '#3d2f56' : 'rgba(74,14,122,0.35)')} />
        </span>
      )}
      <span style={{
        fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: isActive ? 500 : 400,
        color: textColor, whiteSpace: 'nowrap', flex: 'none',
      }}>{label}</span>
      {canClose && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          title="Close tab"
          style={{
            background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
            color: isActive
              ? 'rgba(255,255,255,0.55)'
              : (hovered ? '#FF8A33' : (dark ? '#5a4f6c' : 'rgba(74,14,122,0.45)')),
            display: 'flex', alignItems: 'center', lineHeight: 1, flex: 'none',
            transition: 'color 160ms ease',
            opacity: 0.85,
          }}
        ><Icon name="x" size={9} strokeWidth={2.5} /></button>
      )}
    </div>
  );
}

// =============================================================
// Full window view
// =============================================================
function AnimatedView({ viewKey, children }) {
  const [phase, setPhase] = useState(0);
  useLayoutEffect(() => {
    // Reset to invisible before the browser paints the new children,
    // then schedule the enter transition on the very next frame.
    setPhase(0);
    const raf = requestAnimationFrame(() => setPhase(1));
    return () => cancelAnimationFrame(raf);
  }, [viewKey]);
  return (
    <div style={{
      flex: 1, minHeight: '100%', display: 'flex', flexDirection: 'column',
      opacity: phase === 1 ? 1 : 0,
      transform: phase === 1 ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.984)',
      transition: phase === 1
        ? 'opacity 260ms cubic-bezier(0.22,0.61,0.36,1), transform 300ms cubic-bezier(0.22,0.61,0.36,1)'
        : 'none',
    }}>
      {children}
    </div>
  );
}

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function FullView({
  clips, trashedClips = [], setTrashedClips, files: rawFiles, setClips, setFiles, ready,
  snippets, onAddSnippet, onUpdateSnippet, onDeleteSnippet,
  theme, onTheme, onCollapse, onOpenSettings,
  tab, setTab, filter, setFilter, fileFilter, setFileFilter, query, setQuery,
  selClip, setSelClip, selFile, setSelFile,
  openedFile, onOpenFile, onCloseFile,
  canGoBack, onBack, canGoForward, onForward, vaultPath, lang,
  projects, activeProject, setActiveProject, projectAssignments, onAssignItem,
  addProject, renameProject, updateProjectEmoji, deleteProject,
  tagFilter, setTagFilter,
  workspaces = [], activeWorkspaceId = null,
  onSwitchWorkspace, onAddWorkspace, onCloseWorkspace,
  isMac = false, onShareFile,
  onLogoEgg, milestoneBadgeValue,
}) {
  const dark = theme === 'dark';
  // Resizable sidebar (persisted across sessions)
  const [sidebarWidth, setSidebarWidth] = useResizable('ac.sidebarWidth', 200, 160, 360);
  const _sidebarStartW = useRef(sidebarWidth);
  const T = useT();
  const [showDrop, setShowDrop] = useState(false);
  const dragDepth = useRef(0);
  const [lastDrop, setLastDrop] = useState(null);
  const [forgottenFiles, setForgottenFiles] = useState(new Set());
  const files = rawFiles.filter(f => !forgottenFiles.has(f.id));
  const searchHandle = useRef(null);
  const [previewClip, setPreviewClip] = useState(null);
  const [bundleClip, setBundleClip] = useState(null);
  const [capturing, setCapturing] = useState(true);
  const [livePillHover, setLivePillHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 130);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchHandle.current?.focus();
      }
      // Cmd/Ctrl + L → collapse to launcher (matches the LauncherCollapseButton hint)
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        onCollapse?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCollapse]);

  const processDrop = async (e, target = 'auto') => {
    const f = e.dataTransfer.files?.[0];
    if (!f) return;

    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    const blocked = ['.exe', '.bat', '.cmd', '.msi', '.dll', '.scr', '.com'];
    if (blocked.includes(ext)) {
      setLastDrop({ variant: 'error', msg: `Format ${ext.toUpperCase()} not supported` });
      setTimeout(() => setLastDrop(null), 2400); return;
    }
    let filePath = '';
    try { filePath = window.anarchive?.getFilePath(f) || ''; } catch {}
    if (!filePath) filePath = f.path || '';

    if (!filePath) {
      setLastDrop({ variant: 'error', msg: 'Could not read file path' });
      setTimeout(() => setLastDrop(null), 2400); return;
    }

    // Prevent re-adding a file that's already in the vault (e.g. drag-out aborted by dropping back in)
    const alreadyInVault = files.some(existing => existing.path === filePath || existing.srcPath === filePath);
    if (alreadyInVault) return;

    if (window.anarchive) {
      const vaultFile = await window.anarchive.vault.addFile(filePath).catch((err) => {
        console.error('vault.addFile failed:', err);
        return null;
      });
      if (vaultFile) {
        // Filter out any entry with the same id to guard against backend dedup returning existing file
        setFiles(prev => [vaultFile, ...prev.filter(x => x.id !== vaultFile.id)]);
        setLastDrop({ variant: 'success', target });
        setTimeout(() => setLastDrop(null), 1800);
        return vaultFile;
      }
      setLastDrop({ variant: 'error', msg: 'Failed to save file' });
      setTimeout(() => setLastDrop(null), 2400);
    }
    return null;
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      dragDepth.current += 1;
      if (tab !== 'drop') setShowDrop(true);
    }
  };
  const onDragOver  = (e) => e.preventDefault();
  const onDragLeave = (e) => {
    e.preventDefault();
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setShowDrop(false);
  };
  const onDrop = async (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setShowDrop(false);
    await processDrop(e, tab === 'drop' ? 'files' : 'auto');
  };

  useEffect(() => {
    const onDragEnd = () => { dragDepth.current = 0; setShowDrop(false); };
    const onEsc = (e) => { if (e.key === 'Escape') { dragDepth.current = 0; setShowDrop(false); } };
    window.addEventListener('dragend', onDragEnd);
    window.addEventListener('keydown', onEsc);
    return () => { window.removeEventListener('dragend', onDragEnd); window.removeEventListener('keydown', onEsc); };
  }, []);

  const onDropZoneDrop = async (e) => { await processDrop(e, 'files'); };

  // Click-to-pick path: receives absolute paths from the native picker (no DataTransfer)
  // and pushes each through vault.addFile (which COPIES the file, leaving the original in place).
  const onAddFilesFromPicker = async (paths) => {
    if (!window.anarchive || !Array.isArray(paths) || paths.length === 0) return;
    const blocked = ['.exe', '.bat', '.cmd', '.msi', '.dll', '.scr', '.com'];
    let added = 0;
    let errors = 0;
    for (const p of paths) {
      const ext = '.' + (p.split('/').pop().split('.').pop() || '').toLowerCase();
      if (blocked.includes(ext)) { errors++; continue; }
      const vaultFile = await window.anarchive.vault.addFile(p).catch(() => null);
      if (vaultFile && !vaultFile.error) {
        setFiles(prev => [vaultFile, ...prev.filter(x => x.id !== vaultFile.id)]);
        added++;
      } else {
        errors++;
      }
    }
    if (added > 0) {
      setLastDrop({ variant: 'success', target: 'files', msg: added === 1 ? null : `${added} files added` });
      setTimeout(() => setLastDrop(null), 2000);
    } else if (errors > 0) {
      setLastDrop({ variant: 'error', msg: 'Could not add files' });
      setTimeout(() => setLastDrop(null), 2400);
    }
  };
  const onDropInto = async (target, e) => {
    setShowDrop(false);
    if (target.startsWith('project:')) {
      const projectId = target.slice(8);
      const file = e ? await processDrop(e, 'files') : null;
      if (file) {
        onAssignItem?.(file.id, projectId);
        setActiveProject(projectId);
      }
      return;
    }
    if (e) processDrop(e, target);
    setLastDrop({ variant: 'success', target });
    if (target === 'files') { setActiveProject(null); setTab('drop'); }
    else if (target === 'pin') { setActiveProject(null); setTab('clipboard'); setFilter('pinned'); }
    else if (['text', 'code', 'url'].includes(target)) { setActiveProject(null); setTab('clipboard'); setFilter(target); }
    setTimeout(() => setLastDrop(null), 1800);
  };

  const handlePinClip = useCallback(async (id, pinned) => {
    if (window.anarchive) await window.anarchive.clipboard.pin(id, pinned).catch(() => {});
    setClips(prev => prev.map(c => c.id === id ? { ...c, pinned } : c));
  }, [setClips]);

  const handleDeleteClip = useCallback(async (id) => {
    if (!askConfirm(T('detail.confirmForget', { n: 'clip' }))) return;
    const clip = clips.find(c => c.id === id);
    if (window.anarchive) await window.anarchive.clipboard.delete(id).catch(() => {});
    setClips(prev => prev.filter(c => c.id !== id));
    if (clip) setTrashedClips(prev => [{ ...clip, deleted: true, deletedAt: Date.now() }, ...prev]);
  }, [clips, setClips, setTrashedClips]);

  const handleRestoreClip = useCallback(async (id) => {
    const clip = trashedClips.find(c => c.id === id);
    if (window.anarchive) await window.anarchive.clipboard.restore(id).catch(() => {});
    setTrashedClips(prev => prev.filter(c => c.id !== id));
    if (clip) {
      const restored = { ...clip }; delete restored.deleted; delete restored.deletedAt;
      setClips(prev => [restored, ...prev]);
    }
  }, [trashedClips, setTrashedClips, setClips]);

  const handlePermanentDeleteClip = useCallback(async (id) => {
    if (window.anarchive) await window.anarchive.clipboard.permanentDelete(id).catch(() => {});
    setTrashedClips(prev => prev.filter(c => c.id !== id));
  }, [setTrashedClips]);

  const handleEmptyTrash = useCallback(async () => {
    if (window.anarchive) await window.anarchive.vault.emptyTrash().catch(() => {});
    setTrashedClips([]);
  }, [setTrashedClips]);

  const handleLockClip = useCallback(async (id, locked) => {
    if (window.anarchive) await window.anarchive.clipboard.lock(id, locked).catch(() => {});
    setClips(prev => prev.map(c => c.id === id ? { ...c, locked } : c));
  }, [setClips]);

  const handleLockFile = useCallback(async (id, locked) => {
    if (window.anarchive) await window.anarchive.vault.lockFile(id, locked).catch(() => {});
    setFiles(prev => prev.map(f => f.id === id ? { ...f, locked } : f));
  }, [setFiles]);

  const handleLockSnippet = useCallback(async (id, locked) => {
    if (window.anarchive) await window.anarchive.snippets?.lock(id, locked).catch(() => {});
  }, []);

  const handleToggleCapture = useCallback(async () => {
    if (!window.anarchive?.monitor) { setCapturing(p => !p); return; }
    if (capturing) {
      await window.anarchive.monitor.pause().catch(() => {});
      setCapturing(false);
    } else {
      await window.anarchive.monitor.resume().catch(() => {});
      setCapturing(true);
    }
  }, [capturing]);

  const handleTogglePin = useCallback(() => {
    const next = !pinned;
    setPinned(next);
    window.anarchive?.window.setAlwaysOnTop(next);
  }, [pinned]);

  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) return;
    if (!askConfirm(T('misc.confirmDeleteFiles', { n: selectedFiles.size }))) return;
    for (const id of selectedFiles) {
      if (window.anarchive) await window.anarchive.vault.deleteFile(id).catch(() => {});
    }
    setFiles(prev => prev.filter(f => !selectedFiles.has(f.id)));
    setSelectedFiles(new Set());
  };

  const handleBatchTag = async (tag) => {
    for (const id of selectedFiles) {
      const file = files.find(f => f.id === id);
      if (!file) continue;
      const newTags = file.tags?.includes(tag) ? file.tags : [...(file.tags || []), tag];
      if (window.anarchive) await window.anarchive.vault.updateFileTags(id, newTags).catch(() => {});
      setFiles(prev => prev.map(f => f.id === id ? { ...f, tags: newTags } : f));
    }
  };

  const toggleFileSelect = useCallback((id, metaKey) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const visibleClips = useMemo(() => {
    let list = clips;
    if (activeProject) list = list.filter(c => projectAssignments?.[c.id] === activeProject);
    if (filter === 'pinned') list = list.filter(c => c.pinned);
    else if (filter !== 'all' && filter !== 'files') list = list.filter(c => c.kind === filter);
    // A21: tag filter applies to clips too (clips may have tags via batch tagging)
    if (tagFilter) list = list.filter(c => Array.isArray(c.tags) && c.tags.includes(tagFilter));
    if (debouncedQuery.trim()) {
      const q = normalize(debouncedQuery);
      list = list.filter(c => normalize(c.text || '').includes(q) || normalize(c.app || '').includes(q));
    }
    return list;
  }, [clips, filter, debouncedQuery, activeProject, projectAssignments, tagFilter]);

  const FILE_CATS = {
    document:     (f) => f.kind === 'document',
    image:        (f) => f.kind === 'image',
    screenshots:  (f) => isScreenshot(f),
    presentation: (f) => f.kind === 'presentation',
    spreadsheet:  (f) => f.kind === 'spreadsheet',
    audio:        (f) => f.kind === 'audio',
    video:        (f) => f.kind === 'video',
  };

  const visibleFiles = useMemo(() => {
    let list = files;
    if (activeProject) list = list.filter(f => projectAssignments?.[f.id] === activeProject);
    if (fileFilter !== 'all' && FILE_CATS[fileFilter]) list = list.filter(FILE_CATS[fileFilter]);
    if (tagFilter) list = list.filter(f => f.tags?.includes(tagFilter));
    if (!debouncedQuery.trim()) return list;
    const q = normalize(debouncedQuery);
    return list.filter(f =>
      normalize(f.name).includes(q) ||
      (f.ocrText && normalize(f.ocrText).includes(q)) ||
      (f.tags && f.tags.some(t => normalize(t).includes(q))) ||
      (f.category && normalize(f.category).includes(q))
    );
  }, [files, fileFilter, tagFilter, debouncedQuery, activeProject, projectAssignments]);

  const visibleSnippets = useMemo(() => {
    let list = snippets;
    if (activeProject) list = list.filter(s => projectAssignments?.[s.id] === activeProject);
    if (!debouncedQuery.trim()) return list;
    const q = normalize(debouncedQuery);
    return list.filter(s =>
      normalize(s.title).includes(q) || normalize(s.text).includes(q)
    );
  }, [snippets, debouncedQuery, activeProject, projectAssignments]);

  const bg     = dark ? '#15101c' : '#faf7ee';
  const panel  = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const fg2    = dark ? '#b9accd' : 'var(--ac-fg-2)';

  return (
    <div
      data-screen-label={`02 Full · ${dark ? 'Dark' : 'Light'}`}
      onDragEnter={onDragEnter} onDragOver={onDragOver}
      onDragLeave={onDragLeave} onDrop={onDrop}
      style={{
        // Edge-to-edge: App root has zero padding when in full view, so the dark
        // window fills the entire OS window with no visible gradient gap.
        width: '100vw', height: '100vh',
        minWidth: 540, minHeight: 380,
        overflow: 'hidden',
        background: bg,
        display: 'flex', flexDirection: 'column', position: 'relative',
        fontFamily: 'var(--ac-font-ui)',
      }}>
      {/* ── Resize-handle guards ────────────────────────────────────────────────
          5 px no-drag strips at every edge prevent webkit-app-region:drag from
          stealing the native macOS resize zones. Must be pointer-events:auto so
          Electron's drag-region hit-test sees them and respects no-drag. */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, WebkitAppRegion: 'no-drag', zIndex: 9999 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, WebkitAppRegion: 'no-drag', zIndex: 9999 }} />
      <div style={{ position: 'absolute', top: 5, bottom: 5, left: 0, width: 5, WebkitAppRegion: 'no-drag', zIndex: 9999 }} />
      <div style={{ position: 'absolute', top: 5, bottom: 5, right: 0, width: 5, WebkitAppRegion: 'no-drag', zIndex: 9999 }} />
      {/* Title bar — drag region with non-drag exceptions for interactive controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px',
        background: panel, borderBottom: '1px solid ' + border,
        height: 46, flex: 'none',
        WebkitAppRegion: 'drag', userSelect: 'none',
      }}>
        <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrafficLights dark={dark} onClose={() => window.anarchive?.window.close()} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            WebkitAppRegion: (canGoBack || canGoForward) ? 'no-drag' : 'drag',
          }}>
            <div style={{ visibility: canGoBack ? 'visible' : 'hidden', pointerEvents: canGoBack ? 'auto' : 'none' }}>
              <BackButton onClick={onBack} dark={dark} label={T('nav.back')} />
            </div>
            <div style={{ visibility: canGoForward ? 'visible' : 'hidden', pointerEvents: canGoForward ? 'auto' : 'none' }}>
              <ForwardButton onClick={onForward} dark={dark} />
            </div>
          </div>
        </div>
        {/* Workspace strip — tabs and + button are interactive, mark no-drag */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 3,
          padding: '0 8px', overflow: 'hidden', minWidth: 0,
        }}>
          {workspaces.map(ws => (
            <WorkspaceTab
              key={ws.id}
              ws={ws.id === activeWorkspaceId
                ? { ...ws, tab, filter, fileFilter, query, activeProject, openedFile, tagFilter }
                : ws}
              isActive={ws.id === activeWorkspaceId}
              onSwitch={() => onSwitchWorkspace?.(ws.id)}
              onClose={() => onCloseWorkspace?.(ws.id)}
              canClose={workspaces.length > 1}
              dark={dark}
              projects={projects}
              files={rawFiles}
            />
          ))}
          {workspaces.length < 6 && (
            <HoverIconButton onClick={onAddWorkspace} title="New workspace" dark={dark} size={20}>
              <Icon name="plus" size={10} strokeWidth={2.5} />
            </HoverIconButton>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
          <PinButton pinned={pinned} dark={dark} onClick={handleTogglePin} />
          <button
            onClick={handleToggleCapture}
            onMouseEnter={() => setLivePillHover(true)}
            onMouseLeave={() => setLivePillHover(false)}
            title={capturing
              ? 'Live. Anarchive is actively capturing everything you copy. Click to pause.'
              : 'Paused. Anarchive is not capturing. Nothing copied while paused is stored. Click to resume.'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              height: 26, padding: '0 10px', borderRadius: 6, cursor: 'pointer',
              boxSizing: 'border-box',
              background: capturing ? 'rgba(74,222,128,0.08)' : (dark ? 'rgba(255,107,0,0.15)' : 'rgba(255,107,0,0.10)'),
              border: '1px solid ' + (capturing ? '#4ade80' : '#FF6B00'),
              color: capturing ? '#4ade80' : '#FF6B00',
              fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500,
              transform: livePillHover ? 'scale(1.05)' : 'scale(1)',
              transformOrigin: 'center',
              zIndex: livePillHover ? 2 : 1,
              boxShadow: livePillHover
                ? (capturing
                    ? '0 0 0 1px rgba(74,222,128,0.5), 0 0 14px 2px rgba(74,222,128,0.30)'
                    : '0 0 0 1px rgba(255,107,0,0.5), 0 0 14px 2px rgba(255,107,0,0.30)')
                : 'none',
              transition: 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 180ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: capturing ? '#4ade80' : '#FF6B00', flex: 'none' }} />
            {capturing ? 'Live' : 'Paused'}
          </button>
          <HoverIconButton onClick={() => onTheme(dark ? 'light' : 'dark')} title="Toggle theme" dark={dark} size={26}>
            <Icon name={dark ? 'sun' : 'moon'} size={13} strokeWidth={2} />
          </HoverIconButton>
          <LauncherCollapseButton onClick={onCollapse} dark={dark} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar
          dark={dark} tab={tab}
          setTab={(t) => { if (openedFile != null) onOpenFile(null); setTab(t); }}
          filter={filter}
          setFilter={(f) => { if (openedFile != null) onOpenFile(null); setFilter(f); }}
          fileFilter={fileFilter}
          setFileFilter={(f) => { if (openedFile != null) onOpenFile(null); setFileFilter(f); }}
          tagFilter={tagFilter}
          setTagFilter={(t) => { if (openedFile != null) onOpenFile(null); setTagFilter(t); }}
          clips={clips} trashedClips={trashedClips} files={files} snippets={snippets}
          projects={projects} activeProject={activeProject} setActiveProject={setActiveProject}
          addProject={addProject} renameProject={renameProject} deleteProject={deleteProject}
          onAssignItem={onAssignItem}
          onOpenSettings={onOpenSettings}
          width={sidebarWidth}
          onLogoEgg={onLogoEgg}
          milestoneBadgeValue={milestoneBadgeValue}
        />
        <ResizeHandle
          dark={dark}
          onResize={(phase, dx) => {
            if (phase === 'start') _sidebarStartW.current = sidebarWidth;
            else if (phase === 'move') setSidebarWidth(_sidebarStartW.current + dx);
          }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid ' + border, background: bg }}>
            <SearchInput value={query} onChange={setQuery} dark={dark} kbd="Ctrl K" focusRef={searchHandle}
              placeholder={T('search.placeholder')} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {debouncedQuery === 'AGG' && (
              <div style={{ padding: '8px 16px 0' }}>
                <SpecialAggResult query={debouncedQuery} dark={dark} />
              </div>
            )}
            <AnimatedView viewKey={`${activeWorkspaceId}|` + (openedFile ?? (activeProject ? `proj-${activeProject}` : `${tab}-${filter}-${tagFilter ?? ''}`))}>
            {openedFile != null ? (
              <FileDetailView
                file={files.find(f => f.id === openedFile) || null}
                dark={dark} onClose={onCloseFile}
                isMac={isMac}
                onShareFile={onShareFile}
                onOcrComplete={(id, text) => {
                  setFiles(prev => prev.map(f => f.id === id ? { ...f, ocrText: text } : f));
                  const cat = classifyScreenshot(text);
                  if (cat && window.anarchive?.vault?.setFileCategory) {
                    window.anarchive.vault.setFileCategory(id, cat).catch(() => {});
                    setFiles(prev => prev.map(f => f.id === id ? { ...f, category: cat } : f));
                  }
                }}
                onForget={async (id) => {
                  // M26: only mark as forgotten if backend confirms deletion
                  let ok = true;
                  if (window.anarchive) {
                    const r = await window.anarchive.vault.deleteFile(id).catch(() => ({ ok: false }));
                    ok = r?.ok !== false;
                  }
                  if (ok) {
                    setForgottenFiles(s => new Set([...s, id]));
                    setFiles(prev => prev.filter(f => f.id !== id));
                  }
                  onCloseFile();
                }}
                onLock={handleLockFile}
                onUpdateTags={(id, tags) => {
                  if (window.anarchive) window.anarchive.vault.updateFileTags(id, tags).catch(() => {});
                  setFiles(prev => prev.map(f => f.id === id ? { ...f, tags } : f));
                }}
                onRename={async (id, newName) => {
                  if (!window.anarchive?.vault?.renameFile) return null;
                  const r = await window.anarchive.vault.renameFile(id, newName).catch(() => null);
                  if (r) setFiles(prev => prev.map(f => f.id === id ? { ...f, name: r.name, path: r.path, ext: r.ext } : f));
                  return r;
                }}
                projects={projects} projectAssignments={projectAssignments} onAssignItem={onAssignItem}
              />
            ) : activeProject ? (
              <ProjectView
                project={projects.find(p => p.id === activeProject) || null}
                clips={clips} files={files} snippets={snippets}
                projectAssignments={projectAssignments}
                dark={dark}
                onExit={() => {
                  if (canGoBack) { onBack(); }
                  else { setActiveProject(null); setTab('clipboard'); setFilter('all'); }
                }}
                onOpenFile={onOpenFile}
                onUpdateEmoji={updateProjectEmoji}
                onUnassignItem={(itemId) => onAssignItem(itemId, null)}
              />
            ) : tab === 'snippets' ? (
              <SnippetsView
                snippets={visibleSnippets} dark={dark} query={debouncedQuery}
                onAdd={onAddSnippet} onUpdate={onUpdateSnippet} onDelete={onDeleteSnippet}
                onLock={handleLockSnippet}
                projects={projects} projectAssignments={projectAssignments} onAssignItem={onAssignItem}
              />
            ) : tab === 'drop' ? (
              <DropZoneView
                files={visibleFiles} dark={dark} onOpen={onOpenFile} onFileDrop={onDropZoneDrop} onAddFiles={onAddFilesFromPicker}
                clipsCount={clips.length}
                selectedFiles={selectedFiles} onToggleSelect={toggleFileSelect}
                onBatchDelete={handleBatchDelete} onBatchTag={handleBatchTag}
                allTags={(() => { try { return JSON.parse(localStorage.getItem('ac.tags') || '[]'); } catch { return []; } })()}
                projects={projects} projectAssignments={projectAssignments} onAssignItem={onAssignItem}
                canShare={isMac}
                onShare={(f) => onShareFile?.(f)}
              />
            ) : filter === 'trash' ? (
              <TrashView
                clips={trashedClips} dark={dark}
                onRestore={handleRestoreClip}
                onPermanentDelete={handlePermanentDeleteClip}
                onEmptyTrash={handleEmptyTrash}
              />
            ) : (
              <ClipboardListView
                clips={visibleClips} dark={dark}
                selected={selClip} onSelect={setSelClip}
                query={query} onClearSearch={() => setQuery('')}
                loading={!ready}
                onPinClip={handlePinClip}
                onDeleteClip={handleDeleteClip}
                onLockClip={handleLockClip}
                onPreviewClip={(clip) => clip.kind === 'bundle' ? setBundleClip(clip) : setPreviewClip(clip)}
                projects={projects} projectAssignments={projectAssignments} onAssignItem={onAssignItem}
              />
            )}
            </AnimatedView>
          </div>
        </div>
      </div>

      <StatusBar
        dark={dark}
        count={activeProject
          ? (clips.filter(c => projectAssignments?.[c.id] === activeProject).length
           + files.filter(f => projectAssignments?.[f.id] === activeProject).length
           + snippets.filter(s => projectAssignments?.[s.id] === activeProject).length)
          : (tab === 'snippets' ? visibleSnippets.length : tab === 'drop' ? visibleFiles.length : visibleClips.length)}
        unit={activeProject ? T('status.items')
          : (tab === 'snippets' ? T('status.snippets')
            : tab === 'drop' ? T('status.files')
            : T('status.clips'))}
        vaultPath={vaultPath}
      />

      <DropOverlay visible={showDrop} dark={dark} onDropInto={onDropInto} projects={projects} onDismiss={() => { dragDepth.current = 0; setShowDrop(false); }} />
      {lastDrop && <DropToast drop={lastDrop} dark={dark} />}
      <BundleToast dark={dark} />
      {previewClip && <ClipPreviewModal clip={previewClip} dark={dark} onClose={() => setPreviewClip(null)}
        onPin={(pinned) => { handlePinClip(previewClip.id, pinned); setPreviewClip(p => p ? { ...p, pinned } : p); }}
        onLock={(locked) => { handleLockClip(previewClip.id, locked); setPreviewClip(p => p ? { ...p, locked } : p); }}
        onDelete={() => handleDeleteClip(previewClip.id)}
        projects={projects} projectAssignments={projectAssignments} onAssignItem={onAssignItem} />}
      {bundleClip && <BundleComposer clip={bundleClip} dark={dark} onClose={() => setBundleClip(null)} />}
    </div>
  );
}

function DropToast({ drop, dark }) {
  const T = useT();
  const labels = {
    auto:  T('toast.autoSorted'),
    text:  T('toast.savedText'),
    code:  T('toast.savedCode'),
    url:   T('toast.savedLinks'),
    files: T('toast.savedDrop'),
    pin:   T('toast.savedPinned'),
  };
  const isError = drop.variant === 'error';
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 56, transform: 'translateX(-50%)',
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
      background: isError ? 'var(--ac-danger)' : (dark ? '#1d1729' : '#1f0e2e'),
      color: '#fff', borderRadius: 999,
      fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 500,
      boxShadow: '0 8px 24px rgba(31,14,46,0.25)',
      animation: 'ac-toast-in 220ms cubic-bezier(0.22,0.61,0.36,1)',
      zIndex: 200, whiteSpace: 'nowrap',
    }}>
      <span style={{ color: isError ? 'rgba(255,255,255,0.9)' : '#FF8A33' }}>
        <Icon name={isError ? 'alertCircle' : 'check'} size={14} strokeWidth={2.5} />
      </span>
      {isError ? drop.msg : (labels[drop.target] || T('toast.saved'))}
    </div>
  );
}

// =============================================================
// Sidebar primitives — defined at module scope so their identity is stable
// across parent re-renders. Otherwise React unmounts/remounts every Item on
// every Sidebar render, replaying entrance animations on every click.
// =============================================================
function SidebarSectionUI({ label, dark, fg3, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        padding: '0 14px 6px',
        fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, fontWeight: 600,
        letterSpacing: '0.13em', textTransform: 'uppercase',
        color: dark ? fg3 : 'rgba(255,138,51,0.85)',
      }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</div>
    </div>
  );
}

function SidebarItem({
  icon, glyph, label, active, count, onClick, disabled, onDelete,
  sub: isSub, labelFont, expandable, expanded,
  // theme tokens (passed in once per Sidebar render — stable for stable theme)
  fg2, fg3, activeBg, accent,
  badge,
}) {
  const [pressed, setPressed] = useState(false);
  const prevActive = useRef(active);
  const [popKey, setPopKey] = useState(0);
  useEffect(() => {
    if (active && !prevActive.current) setPopKey(k => k + 1);
    prevActive.current = active;
  }, [active]);
  return (
    <div
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: isSub ? 8 : 10,
        padding: isSub ? '4px 10px 4px 22px' : '5px 10px', margin: '0 8px', borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : (isSub && !active ? 0.85 : 1),
        background: active ? activeBg : 'transparent',
        color: active ? '#fff' : (isSub ? fg3 : fg2), fontWeight: active ? 500 : 400,
        boxShadow: active ? 'inset 3px 0 0 #FF6B00, 0 1px 0 rgba(0,0,0,0.18)' : 'none',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        animation: (!isSub && popKey > 0) ? `acItemPop 260ms cubic-bezier(0.22,0.61,0.36,1)` : undefined,
        transition: 'background 160ms ease, color 160ms ease, box-shadow 160ms ease, opacity 160ms ease, transform 130ms cubic-bezier(0.22,0.61,0.36,1)',
      }}>
      <span style={{ width: isSub ? 13 : 16, height: isSub ? 13 : 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: active ? accent : fg3, transition: 'color 160ms ease' }}>
        {icon ? <Icon name={icon} size={isSub ? 12 : 14} strokeWidth={1.75} /> : (
          <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: isSub ? 9 : 11 }}>{glyph}</span>
        )}
      </span>
      <span style={{ flex: 1, fontFamily: labelFont || 'var(--ac-font-ui)', fontSize: isSub ? 11.5 : 13 }}>{label}</span>
      {count != null && (
        <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: isSub ? 9.5 : 10, color: active ? 'rgba(255,255,255,0.7)' : fg3, transition: 'color 160ms ease' }}>{count}</span>
      )}
      {badge && (
        <span style={{
          marginLeft: 4,
          padding: '1px 5px', borderRadius: 8,
          background: '#FF6B00', color: '#fff',
          fontFamily: 'var(--ac-font-mono)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.04em',
          animation: 'acMilestoneBadge 700ms cubic-bezier(0.22,0.61,0.36,1) both',
        }}>{badge}</span>
      )}
      {expandable && (
        <span style={{
          display: 'flex', alignItems: 'center', marginLeft: 2,
          color: active ? 'rgba(255,255,255,0.55)' : fg3,
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), color 160ms ease',
        }}>
          <Icon name="chevronDown" size={11} strokeWidth={2.2} />
        </span>
      )}
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{
          background: 'transparent', border: 0, padding: '0 1px', cursor: 'pointer',
          color: fg3, display: 'flex', alignItems: 'center', lineHeight: 1, opacity: 0.7,
        }}><Icon name="x" size={10} strokeWidth={2.5} /></button>
      )}
    </div>
  );
}

// =============================================================
// ResizeHandle — vertical drag handle that resizes a sibling pane.
// Width persisted to localStorage under the given key. Subtle hover line + cursor.
// Direction 'left' resizes the previous sibling, 'right' resizes the next sibling.
// =============================================================
function useResizable(storageKey, defaultWidth, min, max) {
  const [width, setWidth] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const n = raw ? parseInt(raw, 10) : NaN;
      if (!Number.isNaN(n) && n >= min && n <= max) return n;
    } catch {}
    return defaultWidth;
  });
  const setAndPersist = (w) => {
    const clamped = Math.max(min, Math.min(max, w));
    setWidth(clamped);
    try { localStorage.setItem(storageKey, String(clamped)); } catch {}
  };
  return [width, setAndPersist];
}

function ResizeHandle({ onResize, dark = true, side = 'right' }) {
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = (e) => {
    e.preventDefault();
    startX.current = e.clientX;
    setDragging(true);
    onResize?.('start');
    const move = (ev) => {
      const dx = ev.clientX - startX.current;
      onResize?.('move', side === 'right' ? dx : -dx);
    };
    const up = () => {
      setDragging(false);
      onResize?.('end');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 5, flex: 'none', cursor: 'col-resize',
        background: (hover || dragging) ? (dark ? 'rgba(255,138,51,0.30)' : 'rgba(255,138,51,0.25)') : 'transparent',
        position: 'relative', zIndex: 5,
        transition: 'background 160ms ease',
      }}
      title="Drag to resize"
    >
      {(hover || dragging) && (
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 1, right: 1,
          background: '#FF8A33',
          opacity: dragging ? 0.85 : 0.55,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

// =============================================================
// ActionButton — labeled button used in panels (FileDetail action bar, etc.).
// Three variants: primary (filled plum), ghost (outlined), danger (red outlined).
// All zoom 4% on hover and gain a vermillion glow.
// =============================================================
function ActionButton({ children, onClick, variant = 'ghost', icon, dark = false, disabled = false, title, active = false, style: extraStyle = {} }) {
  const [hover, setHover] = useState(false);
  const purple = dark ? '#a875e0' : '#4A0E7A';
  let bg, color, border;
  if (variant === 'primary') {
    bg = hover ? '#5a1990' : purple;
    color = '#fff';
    border = 0;
  } else if (variant === 'danger') {
    bg = hover ? 'rgba(229,67,58,0.10)' : 'transparent';
    color = '#e5433a';
    border = '1px solid #e5433a';
  } else {
    bg = active
      ? (dark ? '#261e36' : 'var(--ac-plum-50)')
      : (hover ? (dark ? 'rgba(255,138,51,0.10)' : 'rgba(255,138,51,0.06)') : 'transparent');
    color = dark ? '#f3eef9' : 'var(--ac-plum-800)';
    border = '1px solid ' + (active
      ? (dark ? '#4A0E7A' : 'rgba(74,14,122,0.35)')
      : (hover ? '#FF8A33' : (dark ? '#3d2f56' : 'rgba(74,14,122,0.22)')));
  }
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6,
        background: bg, color, border,
        fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: variant === 'primary' ? 600 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transform: (hover && !disabled) ? 'scale(1.04)' : 'scale(1)',
        zIndex: hover ? 2 : 1,
        boxShadow: (hover && !disabled)
          ? (variant === 'danger'
              ? '0 0 0 1px rgba(229,67,58,0.5), 0 0 18px 3px rgba(229,67,58,0.30), 0 6px 14px rgba(0,0,0,0.18)'
              : variant === 'primary'
                ? '0 0 0 1px rgba(255,138,51,0.45), 0 0 22px 4px rgba(255,138,51,0.35), 0 6px 18px rgba(74,14,122,0.45)'
                : '0 0 0 1px rgba(255,138,51,0.40), 0 0 18px 3px rgba(255,138,51,0.28), 0 6px 14px rgba(0,0,0,0.18)')
          : (variant === 'primary' ? '0 1px 2px rgba(74,14,122,0.30)' : 'none'),
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), background 180ms ease, border-color 180ms ease, color 180ms ease',
        ...extraStyle,
      }}>
      {icon && <Icon name={icon} size={12} strokeWidth={2.25} />}
      {children}
    </button>
  );
}

// =============================================================
// HoverIconButton — small square icon button (titlebar / titlebar-like contexts)
// that lights up + zooms 4% on hover. Wraps any icon child.
// =============================================================
function HoverIconButton({ children, onClick, title, dark = false, size = 24, accent = '#FF8A33' }) {
  const [hover, setHover] = useState(false);
  const border = dark ? '#3d2f56' : 'rgba(74,14,122,0.22)';
  const fg = dark ? '#b9accd' : 'var(--ac-plum-800)';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        width: size, height: size, borderRadius: 5,
        boxSizing: 'border-box',
        background: hover ? (dark ? 'rgba(74,14,122,0.40)' : 'rgba(255,138,51,0.10)') : 'transparent',
        border: '1px solid ' + (hover ? accent : border),
        color: hover ? accent : fg,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flex: 'none', padding: 0,
        WebkitAppRegion: 'no-drag',
        transform: hover ? 'scale(1.045)' : 'scale(1)',
        zIndex: hover ? 2 : 1,
        boxShadow: hover ? '0 0 0 1px rgba(255,138,51,0.35), 0 0 12px 2px rgba(255,138,51,0.25)' : 'none',
        transition: 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 180ms cubic-bezier(0.4, 0, 0.2, 1), background 180ms ease, border-color 180ms ease, color 180ms ease',
      }}>
      {children}
    </button>
  );
}

// Pin button — toggles alwaysOnTop + visibleOnAllWorkspaces on the full window.
function PinButton({ pinned, dark, onClick }) {
  const [hover, setHover] = useState(false);
  const active = pinned || hover;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={pinned
        ? 'Window pinned — visible in every workspace. Click to unpin.'
        : 'Pin window — keep it visible in every workspace and full-screen space.'}
      style={{
        width: 26, height: 26, borderRadius: 5, boxSizing: 'border-box', flex: 'none', padding: 0,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: pinned
          ? (dark ? 'rgba(255,138,51,0.18)' : 'rgba(255,138,51,0.14)')
          : (hover ? (dark ? 'rgba(74,14,122,0.40)' : 'rgba(255,138,51,0.10)') : 'transparent'),
        border: '1px solid ' + (active ? 'rgba(255,138,51,0.55)' : (dark ? '#3d2f56' : 'rgba(74,14,122,0.22)')),
        color: active ? '#FF8A33' : (dark ? '#b9accd' : 'var(--ac-plum-800)'),
        transform: hover ? 'scale(1.045)' : 'scale(1)',
        transition: 'transform 180ms, background 160ms, border-color 160ms, color 160ms',
        WebkitAppRegion: 'no-drag',
      }}>
      <Icon name="pin" size={13} strokeWidth={2} style={{ transform: pinned ? 'rotate(-45deg)' : 'none', transition: 'transform 200ms' }} />
    </button>
  );
}

// =============================================================
// GlowChip — pill-button with vermillion glow on hover (3-4% zoom, no rotation).
// Shared across launcher tag strip, project strip, and any other small pill that
// needs the "alive on hover" feel.
// =============================================================
function GlowChip({ children, onClick, dark = true, variant = 'project', title }) {
  const [hover, setHover] = useState(false);
  const isProject = variant === 'project';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: isProject ? 5 : 4,
        padding: isProject ? '4px 10px' : '3px 9px',
        borderRadius: isProject ? 6 : 5,
        background: hover ? (dark ? 'rgba(74,14,122,0.45)' : 'rgba(74,14,122,0.10)') : (isProject ? (dark ? '#1d1729' : '#fffdf6') : 'transparent'),
        border: '1px solid ' + (hover ? '#FF8A33' : (dark ? '#3d2f56' : 'rgba(74,14,122,0.22)')),
        color: hover ? '#FF8A33' : (isProject ? (dark ? '#c4a9e8' : 'var(--ac-plum-700)') : (dark ? '#80738f' : 'var(--ac-fg-3)')),
        fontFamily: isProject ? 'var(--ac-font-ui)' : 'var(--ac-font-mono)',
        fontSize: isProject ? 11.5 : 10.5,
        cursor: 'pointer',
        transform: hover ? 'scale(1.04)' : 'scale(1)',
        zIndex: hover ? 2 : 1,
        // Tight contained glow — fits within strips that have overflow:auto.
        // Outer halo limited to ~6px spread so it doesn't get clipped by parent.
        boxShadow: hover
          ? '0 0 0 1px rgba(255,138,51,0.55), 0 0 6px 0 rgba(255,138,51,0.55)'
          : 'none',
        transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), background 180ms ease, border-color 180ms ease, color 180ms ease',
      }}>
      {children}
    </button>
  );
}

// EmptyStateQuoteOverlay, SpecialAggResult, BrandLogoEgg are imported from ./easter/


// =============================================================
// LauncherCollapseButton — go to the compact launcher. Shown in the FullView title bar
// as a labeled, slightly larger control so users find it. Cmd+L / Ctrl+L also works.
// On hover: shrink icon scales down to suggest the window compressing inward.
// =============================================================
function LauncherCollapseButton({ onClick, dark }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Open quick launcher (⌘L)"
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        height: 26, padding: '0 9px', borderRadius: 6, cursor: 'pointer',
        boxSizing: 'border-box',
        background: hover ? (dark ? 'rgba(255,107,0,0.18)' : 'rgba(255,107,0,0.12)') : 'transparent',
        border: '1px solid ' + (hover ? '#FF6B00' : (dark ? '#3d2f56' : 'rgba(74,14,122,0.22)')),
        color: hover ? '#FF8A33' : (dark ? '#b9accd' : 'var(--ac-plum-800)'),
        fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500,
        boxShadow: hover ? '0 0 0 1px rgba(255,107,0,0.30), 0 0 10px 2px rgba(255,107,0,0.18)' : 'none',
        transition: 'background 160ms, border-color 160ms, color 160ms, box-shadow 160ms',
      }}>
      <Icon name="shrink" size={14} strokeWidth={2.25}
        style={{ transform: hover ? 'scale(0.78)' : 'scale(1)', transition: 'transform 220ms cubic-bezier(0.4,0,0.2,1)' }} />
      <span>Launcher</span>
      <span style={{
        fontFamily: 'var(--ac-font-mono)', fontSize: 9, opacity: 0.7, marginLeft: 2,
        padding: '1px 4px', borderRadius: 3,
        background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(74,14,122,0.08)',
      }}>⌘L</span>
    </button>
  );
}

// ExpandWindowButton — companion to LauncherCollapseButton, lives in the Launcher bar.
// On hover: expand icon scales up to suggest the window spreading outward.
function ExpandWindowButton({ onClick, tk }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Expand to full window"
      style={{
        WebkitAppRegion: 'no-drag',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: 5, cursor: 'pointer',
        background: hover ? 'rgba(255,138,51,0.10)' : 'transparent',
        border: '1px solid ' + (hover ? '#FF8A33' : tk.divider),
        color: hover ? '#FF8A33' : tk.fg2,
        boxShadow: hover ? '0 0 0 1px rgba(255,138,51,0.30), 0 0 10px 2px rgba(255,138,51,0.18)' : 'none',
        transition: 'background 160ms, border-color 160ms, color 160ms, box-shadow 160ms',
      }}>
      <Icon name="expand" size={14} strokeWidth={2}
        style={{ transform: hover ? 'scale(1.22)' : 'scale(1)', transition: 'transform 220ms cubic-bezier(0.4,0,0.2,1)' }} />
    </button>
  );
}

// =============================================================
// Sidebar gear (settings) — larger and more prominent than the old title-bar version.
// Hover lifts it and rotates the gear slightly to signal it's clickable.
// =============================================================
function SidebarGearButton({ dark, onClick }) {
  const [hover, setHover] = useState(false);
  const T = useT();
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={T('nav.settings')}
      style={{
        width: 30, height: 30, borderRadius: 7,
        background: hover ? (dark ? 'rgba(74,14,122,0.55)' : 'rgba(255,138,51,0.18)') : 'transparent',
        border: '1px solid ' + (hover ? (dark ? '#5a3989' : 'rgba(255,138,51,0.45)') : (dark ? '#3d2f56' : 'rgba(243,238,249,0.20)')),
        color: hover ? (dark ? '#FF8A33' : '#FF8A33') : (dark ? '#b9accd' : 'rgba(243,238,249,0.85)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0, flex: 'none',
        transform: hover ? 'rotate(30deg) scale(1.05)' : 'rotate(0deg) scale(1)',
        transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1), background 200ms ease, border-color 200ms ease, color 200ms ease',
        boxShadow: hover ? '0 2px 8px rgba(255,107,0,0.25)' : 'none',
      }}>
      <Icon name="settings" size={17} strokeWidth={2} />
    </button>
  );
}

// =============================================================
// Collapsible — top-level component so React preserves identity across parent re-renders.
// Measures intrinsic content height via ResizeObserver, animates height: 0 ↔ measured.
// =============================================================
function Collapsible({ open, children, duration = 360 }) {
  const innerRef = useRef(null);
  const [contentH, setContentH] = useState(0);
  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContentH(e.contentRect.height);
    });
    ro.observe(innerRef.current);
    setContentH(innerRef.current.scrollHeight);
    return () => ro.disconnect();
  }, []);
  const easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
  return (
    <div style={{
      overflow: 'hidden',
      height: open ? contentH : 0,
      opacity: open ? 1 : 0,
      transition: `height ${duration}ms ${easing}, opacity ${duration}ms ${easing}`,
      willChange: 'height',
    }}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

// =============================================================
// Sidebar
// =============================================================
function Sidebar({ dark, tab, setTab, filter, setFilter, fileFilter, setFileFilter, tagFilter, setTagFilter, clips, trashedClips = [], files, snippets,
  projects = [], activeProject, setActiveProject, addProject, renameProject, deleteProject, onAssignItem, onOpenSettings, width = 200, onLogoEgg, milestoneBadgeValue }) {
  const T = useT();
  const [tags, setTags] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ac.tags') || '["work","notes-to-self","reading"]'); }
    catch { return ['work', 'notes-to-self', 'reading']; }
  });
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [addingProject, setAddingProject] = useState(false);
  const [newProject, setNewProject] = useState('');
  const [renamingProjectId, setRenamingProjectId] = useState(null);
  const [renameProjectInput, setRenameProjectInput] = useState('');

  const [clipOpen, setClipOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(false);
  // Per-section animation counters — increment only when that section opens.
  // Computed during render (not useEffect) to avoid the double-mount replay bug.
  const clipAnimKey  = useRef(clipOpen  ? 1 : 0);
  const filesAnimKey = useRef(filesOpen ? 1 : 0);
  const prevClipOpen  = useRef(clipOpen);
  const prevFilesOpen = useRef(filesOpen);
  if (clipOpen  && !prevClipOpen.current)  { clipAnimKey.current++;  }
  if (filesOpen && !prevFilesOpen.current) { filesAnimKey.current++; }
  prevClipOpen.current  = clipOpen;
  prevFilesOpen.current = filesOpen;

  const deleteTag = (tag) => {
    const next = tags.filter(t => t !== tag);
    setTags(next);
    try { localStorage.setItem('ac.tags', JSON.stringify(next)); } catch {}
  };
  const commitTag = () => {
    const t = newTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) {
      const next = [...tags, t];
      setTags(next);
      try { localStorage.setItem('ac.tags', JSON.stringify(next)); } catch {}
    }
    setNewTag(''); setAddingTag(false);
  };

  const panel    = dark ? '#1d1729' : '#1f0e2e';
  const border   = dark ? '#2e2440' : '#4A0E7A';
  const fg1      = dark ? '#f3eef9' : '#f6f1fa';
  const fg2      = dark ? '#b9accd' : 'rgba(243,238,249,0.78)';
  const fg3      = dark ? '#80738f' : 'rgba(243,238,249,0.52)';
  const activeBg = '#4A0E7A';
  const accent   = '#FF8A33';

  const counts = {
    all:          clips.length,
    text:         clips.filter(c => c.kind === 'text').length,
    url:          clips.filter(c => c.kind === 'url').length,
    code:         clips.filter(c => c.kind === 'code').length,
    bundle:       clips.filter(c => c.kind === 'bundle').length,
    pinned:       clips.filter(c => c.pinned).length,
    files:        files.length,
    snippets:     snippets.length,
    documents:    files.filter(f => f.kind === 'document').length,
    images:       files.filter(f => f.kind === 'image').length,
    screenshots:  files.filter(isScreenshot).length,
    presentations:files.filter(f => f.kind === 'presentation').length,
    spreadsheets: files.filter(f => f.kind === 'spreadsheet').length,
    audio:        files.filter(f => f.kind === 'audio').length,
    video:        files.filter(f => f.kind === 'video').length,
  };

  // Stable wrappers that inject theme into the module-level primitives.
  // useCallback so the wrapper refs stay stable when theme tokens don't change.
  const SidebarSection = useCallback(
    ({ label, children }) => <SidebarSectionUI label={label} dark={dark} fg3={fg3}>{children}</SidebarSectionUI>,
    [dark, fg3]
  );
  const Item = useCallback(
    (props) => <SidebarItem {...props} fg2={fg2} fg3={fg3} activeBg={activeBg} accent={accent} />,
    [fg2, fg3, activeBg, accent]
  );

  return (
    <div style={{ width, flex: 'none', background: panel, borderRight: '1px solid ' + border, padding: '14px 0', overflowY: 'auto' }}>
      <div style={{ padding: '0 14px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <BrandLogoEgg color={fg1} onTrigger={onLogoEgg} />
        <div style={{ flex: 1 }} />
        {onOpenSettings && (
          <SidebarGearButton dark={dark} onClick={onOpenSettings} />
        )}
      </div>

      <SidebarSection label={T('sidebar.views')}>
        {(() => {
          const clipActive = tab === 'clipboard' && !activeProject;
          return (<>
            <Item icon="clipboard" label={T('sidebar.clipboard')} count={counts.all}
              badge={milestoneBadgeValue ? `+${milestoneBadgeValue}` : undefined}
              active={clipActive}
              expandable expanded={clipOpen}
              onClick={() => {
                if (clipActive) { setClipOpen(s => !s); }
                else { setActiveProject?.(null); setTab('clipboard'); setFilter('all'); setClipOpen(true); }
              }} />
            <Collapsible open={clipOpen} duration={340}>
              <div style={{ position: 'relative', marginLeft: 8, marginBottom: 2 }}>
                <div style={{ position: 'absolute', left: 14, top: 0, bottom: 6, width: 1, background: dark ? '#2e2440' : 'rgba(74,14,122,0.15)' }} />
                {[
                  { glyph: '·',      label: T('sidebar.all'),   count: counts.all,  active: clipActive && filter === 'all',  onClick: () => { setActiveProject?.(null); setTab('clipboard'); setFilter('all'); } },
                  { icon: 'pilcrow', label: T('sidebar.text'),  count: counts.text, active: clipActive && filter === 'text', onClick: () => { setActiveProject?.(null); setTab('clipboard'); setFilter('text'); } },
                  { icon: 'link',    label: T('sidebar.links'), count: counts.url,  active: clipActive && filter === 'url',  onClick: () => { setActiveProject?.(null); setTab('clipboard'); setFilter('url'); } },
                  { icon: 'code',    label: T('sidebar.code'),  count: counts.code,   active: clipActive && filter === 'code',   onClick: () => { setActiveProject?.(null); setTab('clipboard'); setFilter('code'); } },
                  { icon: 'layers',  label: T('sidebar.bundle'), count: counts.bundle, active: clipActive && filter === 'bundle', onClick: () => { setActiveProject?.(null); setTab('clipboard'); setFilter('bundle'); } },
                ].map((p, i) => (
                  <div key={`c-${clipAnimKey.current}-${i}`} style={{ animation: `acSubIn 280ms cubic-bezier(0.4, 0, 0.2, 1) ${i * 30}ms both` }}>
                    <Item sub {...p} />
                  </div>
                ))}
              </div>
            </Collapsible>
          </>);
        })()}

        {(() => {
          const filesActive = tab === 'drop' && !activeProject && !tagFilter;
          return (<>
            <Item icon="folder" label={T('sidebar.files')} count={counts.files}
              active={filesActive}
              expandable expanded={filesOpen}
              onClick={() => {
                if (filesActive) { setFilesOpen(s => !s); }
                else { setActiveProject?.(null); setTab('drop'); setTagFilter?.(null); setFilesOpen(true); }
              }} />
            <Collapsible open={filesOpen} duration={380}>
              <div style={{ position: 'relative', marginLeft: 8, marginBottom: 2 }}>
                <div style={{ position: 'absolute', left: 14, top: 0, bottom: 6, width: 1, background: dark ? '#2e2440' : 'rgba(74,14,122,0.15)' }} />
                {[
                  { glyph: '·',       label: T('sidebar.all'),           count: counts.files,          active: filesActive && fileFilter === 'all',           onClick: () => { setActiveProject?.(null); setTab('drop'); setTagFilter?.(null); setFileFilter('all'); } },
                  { icon: 'fileText', label: T('sidebar.documents'),     count: counts.documents,      active: filesActive && fileFilter === 'document',     onClick: () => { setActiveProject?.(null); setTab('drop'); setTagFilter?.(null); setFileFilter('document'); } },
                  { icon: 'image',    label: T('sidebar.images'),        count: counts.images,         active: filesActive && fileFilter === 'image',        onClick: () => { setActiveProject?.(null); setTab('drop'); setTagFilter?.(null); setFileFilter('image'); } },
                  ...(counts.screenshots > 0 ? [{ icon: 'camera', label: T('sidebar.screenshots'), count: counts.screenshots, active: filesActive && fileFilter === 'screenshots', onClick: () => { setActiveProject?.(null); setTab('drop'); setTagFilter?.(null); setFileFilter('screenshots'); } }] : []),
                  { icon: 'monitor',  label: T('sidebar.presentations'), count: counts.presentations,  active: filesActive && fileFilter === 'presentation', onClick: () => { setActiveProject?.(null); setTab('drop'); setTagFilter?.(null); setFileFilter('presentation'); } },
                  { icon: 'grid',     label: T('sidebar.spreadsheets'),  count: counts.spreadsheets,   active: filesActive && fileFilter === 'spreadsheet',  onClick: () => { setActiveProject?.(null); setTab('drop'); setTagFilter?.(null); setFileFilter('spreadsheet'); } },
                  { icon: 'music',    label: T('sidebar.audio'),         count: counts.audio,          active: filesActive && fileFilter === 'audio',        onClick: () => { setActiveProject?.(null); setTab('drop'); setTagFilter?.(null); setFileFilter('audio'); } },
                  { icon: 'film',     label: T('sidebar.video'),         count: counts.video,          active: filesActive && fileFilter === 'video',        onClick: () => { setActiveProject?.(null); setTab('drop'); setTagFilter?.(null); setFileFilter('video'); } },
                ].map((p, i) => (
                  <div key={`f-${filesAnimKey.current}-${i}`} style={{ animation: `acSubIn 260ms cubic-bezier(0.4, 0, 0.2, 1) ${i * 28}ms both` }}>
                    <Item sub {...p} />
                  </div>
                ))}
              </div>
            </Collapsible>
          </>);
        })()}

        <Item icon="bookmark" label={T('sidebar.snippets')} count={counts.snippets}
          active={tab === 'snippets' && !activeProject}
          onClick={() => { setActiveProject?.(null); setTab('snippets'); }} />

        <Item icon="star" label={T('sidebar.pinned')} count={counts.pinned}
          active={tab === 'clipboard' && filter === 'pinned' && !activeProject}
          onClick={() => { setActiveProject?.(null); setTab('clipboard'); setFilter('pinned'); }} />

        {trashedClips.length > 0 && (
          <Item icon="trash" label={T('sidebar.trash')} count={trashedClips.length}
            active={tab === 'clipboard' && filter === 'trash' && !activeProject}
            onClick={() => { setActiveProject?.(null); setTab('clipboard'); setFilter('trash'); }} />
        )}
      </SidebarSection>

      {!activeProject && <SidebarSection label={T('sidebar.tags')}>
        {tags.map(tag => (
          <Item sub key={tag} icon="hash" label={tag}
            labelFont="var(--ac-font-mono)"
            active={tagFilter === tag}
            onClick={() => {
              if (tagFilter === tag) {
                setTagFilter?.(null);
                setTab?.('clipboard');
                setFilter?.('all');
              } else {
                setTagFilter?.(tag);
                setTab?.('drop');
              }
            }}
            onDelete={() => { deleteTag(tag); if (tagFilter === tag) setTagFilter?.(null); }}
          />
        ))}
        {addingTag ? (
          <div style={{ margin: '1px 8px 2px' }}>
            <input
              autoFocus
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTag();
                if (e.key === 'Escape') { setNewTag(''); setAddingTag(false); }
              }}
              onBlur={commitTag}
              placeholder="tag name…"
              style={{
                width: '100%', background: dark ? '#261e36' : 'rgba(255,255,255,0.10)',
                border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(255,255,255,0.25)'),
                borderRadius: 5, padding: '5px 8px', outline: 'none', boxSizing: 'border-box',
                fontFamily: 'var(--ac-font-ui)', fontSize: 12, color: fg1,
              }}
            />
          </div>
        ) : (
          <Item sub icon="plus" label={T('sidebar.addTag')} onClick={() => setAddingTag(true)} />
        )}
      </SidebarSection>}

      <SidebarSection label="Projects">
        {projects.map(p => (
          renamingProjectId === p.id ? (
            <div key={p.id} style={{ margin: '1px 8px 2px' }}>
              <input
                autoFocus
                value={renameProjectInput}
                onChange={e => setRenameProjectInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (renameProjectInput.trim()) renameProject?.(p.id, renameProjectInput.trim());
                    setRenamingProjectId(null);
                  }
                  if (e.key === 'Escape') setRenamingProjectId(null);
                }}
                onBlur={() => {
                  if (renameProjectInput.trim()) renameProject?.(p.id, renameProjectInput.trim());
                  setRenamingProjectId(null);
                }}
                style={{
                  width: '100%', background: dark ? '#261e36' : 'rgba(255,255,255,0.10)',
                  border: '1px solid #4A0E7A',
                  borderRadius: 5, padding: '5px 8px', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'var(--ac-font-ui)', fontSize: 12, color: fg1,
                }}
              />
            </div>
          ) : (
            <div key={p.id}
              onClick={() => setActiveProject?.(activeProject === p.id ? null : p.id)}
              onDragOver={(e) => {
                if (Array.from(e.dataTransfer.types).includes('application/x-anarchive-item')) {
                  e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                try {
                  const data = JSON.parse(e.dataTransfer.getData('application/x-anarchive-item'));
                  if (data.id) onAssignItem?.(data.id, p.id);
                } catch {}
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '5px 10px', margin: '0 8px', borderRadius: 6,
                cursor: 'pointer',
                background: activeProject === p.id ? activeBg : 'transparent',
                color: activeProject === p.id ? '#fff' : fg2, fontWeight: activeProject === p.id ? 500 : 400,
                boxShadow: activeProject === p.id ? 'inset 3px 0 0 #FF6B00, 0 1px 0 rgba(0,0,0,0.18)' : 'none',
              }}>
              <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: activeProject === p.id ? accent : fg3, fontSize: 13, lineHeight: 1 }}>
                {p.emoji || '📁'}
              </span>
              <span style={{ flex: 1, fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <button onClick={e => { e.stopPropagation(); setRenamingProjectId(p.id); setRenameProjectInput(p.name); }} style={{
                background: 'transparent', border: 0, padding: '0 1px', cursor: 'pointer',
                color: fg3, display: 'flex', alignItems: 'center', lineHeight: 1, opacity: 0.7,
              }}><Icon name="pencil" size={9} strokeWidth={2.5} /></button>
              <button onClick={e => {
                e.stopPropagation();
                if (window.confirm(T('detail.confirmForget', { n: p.name }))) {
                  deleteProject?.(p.id);
                  if (activeProject === p.id) setActiveProject?.(null);
                }
              }} style={{
                background: 'transparent', border: 0, padding: '0 1px', cursor: 'pointer',
                color: fg3, display: 'flex', alignItems: 'center', lineHeight: 1, opacity: 0.7,
              }}><Icon name="x" size={10} strokeWidth={2.5} /></button>
            </div>
          )
        ))}
        {addingProject ? (
          <div style={{ margin: '1px 8px 2px' }}>
            <input
              autoFocus
              value={newProject}
              onChange={e => setNewProject(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (newProject.trim()) addProject?.(newProject.trim());
                  setNewProject(''); setAddingProject(false);
                }
                if (e.key === 'Escape') { setNewProject(''); setAddingProject(false); }
              }}
              onBlur={() => {
                if (newProject.trim()) addProject?.(newProject.trim());
                setNewProject(''); setAddingProject(false);
              }}
              placeholder="project name…"
              style={{
                width: '100%', background: dark ? '#261e36' : 'rgba(255,255,255,0.10)',
                border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(255,255,255,0.25)'),
                borderRadius: 5, padding: '5px 8px', outline: 'none', boxSizing: 'border-box',
                fontFamily: 'var(--ac-font-ui)', fontSize: 12, color: fg1,
              }}
            />
          </div>
        ) : (
          <Item icon="plus" label="New project" onClick={() => setAddingProject(true)} />
        )}
      </SidebarSection>

      {activeProject && (() => {
        const ap = projects.find(p => p.id === activeProject);
        return (
          <div style={{ margin: '10px 8px 4px', padding: '10px 12px', borderRadius: 8, background: '#FF6B00', border: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', marginBottom: 3 }}>In project</div>
              <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 700, color: '#4A0E7A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ap?.name || 'Project'}
              </div>
            </div>
            {ap?.emoji && (
              <span style={{ fontSize: 26, lineHeight: 1, flex: 'none' }}>{ap.emoji}</span>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// =============================================================
// Clipboard list
// =============================================================
function ClipboardListView({ clips, dark, selected, onSelect, query, onClearSearch, loading, onPinClip, onDeleteClip, onLockClip, onPreviewClip, projects = [], projectAssignments = {}, onAssignItem }) {
  const T = useT();
  if (loading) {
    return (
      <div style={{ padding: '10px 8px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 2 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: dark ? '#261e36' : '#ebe2f3', flex: 'none' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, borderRadius: 4, width: `${50 + i * 9}%`, background: dark ? '#261e36' : '#ebe2f3', marginBottom: 6 }} />
              <div style={{ height: 9, borderRadius: 4, width: '28%', background: dark ? '#1d1729' : '#f3ecda' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (clips.length === 0) {
    if (query && query.trim()) {
      return (
        <div>
          <EmptyState dark={dark} iconName="search" title={T('empty.noMatches')} body={T('empty.noMatchesSub', { q: query })} />
          {onClearSearch && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: -12, marginBottom: 24 }}>
              <button onClick={onClearSearch} style={{
                padding: '6px 14px', background: 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust-strong)'),
                borderRadius: 6, cursor: 'pointer',
                fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 500,
                color: dark ? '#f3eef9' : 'var(--ac-plum-800)',
              }}>{T('empty.clearSearch')}</button>
            </div>
          )}
        </div>
      );
    }
    return <EmptyState dark={dark} iconName="clipboard" title={T('empty.noClips')} body={T('empty.noClipsSub')} />;
  }

  return (
    <div style={{ padding: '10px 8px' }}>
      {clips.map((clip, i) => (
        <ClipRow
          key={clip.id} clip={clip} idx={i}
          selected={i === selected} onSelect={() => onSelect(i)} dark={dark}
          onPin={onPinClip ? (pinned) => onPinClip(clip.id, pinned) : undefined}
          onDelete={onDeleteClip ? () => onDeleteClip(clip.id) : undefined}
          onLock={onLockClip ? (locked) => onLockClip(clip.id, locked) : undefined}
          onPreview={(c) => { onSelect(i); onPreviewClip?.(c); }}
          projects={projects}
          currentProject={projectAssignments[clip.id] || null}
          onAssignItem={onAssignItem}
        />
      ))}
    </div>
  );
}

// =============================================================
// Drop zone
// =============================================================
function DropZoneView({ files, dark, onOpen, onFileDrop, onAddFiles, selectedFiles = new Set(), onToggleSelect, onBatchDelete, onBatchTag, allTags = [], projects = [], projectAssignments = {}, onAssignItem, onShare, canShare = true, clipsCount = 0 }) {
  const T = useT();
  const [dragOver, setDragOver] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [picking, setPicking] = useState(false);
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';
  const accent = '#FF6B00';
  const isEmpty = files.length === 0;

  const handleDragEnter = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
  };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    onFileDrop?.(e);
  };

  // Click-to-pick: opens native macOS file picker (multi-select), routes results through addFile
  const handleClickPick = async () => {
    if (picking) return;
    if (!window.anarchive?.vault?.chooseFiles) return; // demo mode
    setPicking(true);
    try {
      const paths = await window.anarchive.vault.chooseFiles();
      if (paths && paths.length > 0) {
        await onAddFiles?.(paths);
      }
    } finally {
      setPicking(false);
    }
  };

  const dropTarget = (
    <div
      onClick={handleClickPick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      title="Click to choose files, or drag them here"
      style={{
        border: `2px dashed ${dragOver ? accent : (dark ? '#3d2f56' : '#d9d2c1')}`,
        borderRadius: 14,
        padding: isEmpty ? '48px 32px' : '22px 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 14, textAlign: 'center',
        background: dragOver
          ? (dark ? 'rgba(255,107,0,0.07)' : 'rgba(255,107,0,0.04)')
          : 'transparent',
        transition: 'border-color 140ms, background 140ms',
        cursor: picking ? 'progress' : 'copy',
        position: 'relative',
      }}
    >
      {/* Easter egg 8: only when truly empty everywhere (no files AND no clips) */}
      <EmptyStateQuoteOverlay active={isEmpty && clipsCount === 0 && !dragOver} dark={dark} />
      <div style={{
        width: 52, height: 52, borderRadius: 13, flex: 'none',
        background: dragOver ? accent : (dark ? '#2e2440' : 'var(--ac-plum-50)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: dragOver ? '#fff' : (dark ? '#FFA866' : 'var(--ac-plum-700)'),
        transition: 'all 140ms',
      }}>
        <Icon name={dragOver ? 'inbox' : 'folder'} size={24} strokeWidth={1.5} />
      </div>

      <div>
        <div style={{
          fontFamily: 'var(--ac-font-brand)', fontSize: isEmpty ? 22 : 17,
          color: dark ? '#f3eef9' : 'var(--ac-plum-900)',
          lineHeight: 1.1, marginBottom: 6,
        }}>
          {dragOver ? T('drop.dragTargetActive') : T('drop.dragTarget')}
        </div>
        <div style={{
          fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
          fontSize: 12.5, color: fg3, lineHeight: 1.5,
        }}>
          {dragOver ? T('drop.subActive') : T('drop.subIdle')}
        </div>
        {!dragOver && (
          <div style={{
            fontFamily: 'var(--ac-font-ui)', fontSize: 11.5,
            color: dark ? '#FF8A33' : '#b34a02',
            marginTop: 4, fontWeight: 500,
          }}>
            {picking ? 'Opening picker…' : 'or click to choose from Finder'}
          </div>
        )}
      </div>

      {!dragOver && (
        <div style={{
          display: 'flex', gap: 6, alignItems: 'center',
          fontFamily: 'var(--ac-font-mono)', fontSize: 10,
        }}>
          {['PDF', 'PNG', '.app', 'ZIP', 'MP3'].map(label => (
            <span key={label} style={{
              padding: '2px 7px',
              border: `1px solid ${dark ? '#2e2440' : 'var(--ac-dust)'}`,
              borderRadius: 4,
              background: dark ? '#1d1729' : '#fffdf6',
              color: dark ? '#80738f' : 'var(--ac-fg-3)',
            }}>{label}</span>
          ))}
          <span style={{ color: dark ? '#3d2f56' : 'var(--ac-fg-4)', marginLeft: 2 }}>{T('drop.maxSize')}</span>
        </div>
      )}
    </div>
  );

  if (isEmpty) {
    return <div style={{ padding: '24px 16px' }}>{dropTarget}</div>;
  }

  const selCount = selectedFiles.size;
  const batchBar = selCount > 0 && (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
      background: dark ? '#261e36' : 'rgba(74,14,122,0.06)',
      border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.18)'),
      borderRadius: 8, flexWrap: 'wrap', position: 'relative',
    }}>
      <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600, color: dark ? '#f3eef9' : 'var(--ac-plum-800)' }}>
        {selCount} selected
      </span>
      <div style={{ flex: 1 }} />
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowTagMenu(p => !p)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6,
          background: 'transparent', border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.22)'),
          color: dark ? '#f3eef9' : 'var(--ac-plum-800)',
          fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}><Icon name="hash" size={11} strokeWidth={2} /> Add tag</button>
        {showTagMenu && allTags.length > 0 && (
          <>
            {/* M7: invisible backdrop dismisses the menu when clicking outside */}
            <div onClick={() => setShowTagMenu(false)} style={{
              position: 'fixed', inset: 0, zIndex: 99,
            }} />
            <div style={{
              position: 'absolute', bottom: '110%', right: 0, zIndex: 100,
              background: dark ? '#1d1729' : '#fffdf6', border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
              borderRadius: 8, boxShadow: '0 8px 24px rgba(15,8,28,0.25)', minWidth: 120, overflow: 'hidden',
            }}>
              {allTags.map(tag => (
                <div key={tag} onClick={() => { onBatchTag?.(tag); setShowTagMenu(false); }} style={{
                  padding: '7px 12px', fontFamily: 'var(--ac-font-ui)', fontSize: 12,
                  color: dark ? '#f3eef9' : 'var(--ac-fg-1)', cursor: 'pointer',
                }}>{tag}</div>
              ))}
            </div>
          </>
        )}
      </div>
      <button onClick={onBatchDelete} style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6,
        background: 'transparent', border: '1px solid var(--ac-danger)', color: 'var(--ac-danger)',
        fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
      }}><Icon name="trash" size={11} strokeWidth={2} /> Delete {selCount}</button>
    </div>
  );

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {dropTarget}
      {batchBar}
      <div>
        <div style={{
          fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: fg3, marginBottom: 10,
        }}>
          {T('drop.archived')} · {files.length}
          <span style={{ marginLeft: 8, color: dark ? '#5a4f6c' : 'var(--ac-fg-4)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            {selCount > 0 ? T('misc.selected', { n: selCount }) : T('drop.clickToOpen')}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {files.map(f => (
            <FileTile
              key={f.id} file={f} dark={dark}
              selected={selectedFiles.has(f.id)}
              onClick={(e) => {
                if (e?.metaKey || e?.ctrlKey) { onToggleSelect?.(f.id); }
                else if (selCount > 0) { onToggleSelect?.(f.id); }
                else onOpen?.(f.id);
              }}
              onDragOut={window.anarchive && f.path ? () => window.anarchive.dragout(f.path) : undefined}
              onShare={canShare && f.path ? () => onShare?.(f) : undefined}
              canShare={canShare && !!f.path}
              projects={projects}
              currentProject={projectAssignments[f.id] || null}
              onAssignItem={onAssignItem}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// File detail
// =============================================================
function FileDetailView({ file, dark, onClose, onForget, onOcrComplete, onLock, onUpdateTags, onRename, projects = [], projectAssignments = {}, onAssignItem, isMac = false, onShareFile }) {
  const T = useT();
  const [actionMsg, setActionMsg] = useState(null);
  const [ocrText, setOcrText]     = useState(file?.ocrText || null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [renaming, setRenaming]     = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const fg1 = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2 = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3 = dark ? '#80738f' : 'var(--ac-fg-3)';
  const panel  = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const purple = '#4A0E7A';

  const isOcrable = file && file.kind === 'image' && OCR_IMG_EXTS.has(file.ext);

  useEffect(() => {
    setOcrText(file?.ocrText || null);
    setOcrLoading(false);
    if (!file || !isOcrable || !window.anarchive?.vault?.runOcr || file.ocrText) return;
    setOcrLoading(true);
    window.anarchive.vault.runOcr(file.id)
      .then(text => {
        setOcrText(text || null);
        setOcrLoading(false);
        if (text) onOcrComplete?.(file.id, text);
      })
      .catch(() => setOcrLoading(false));
  }, [file?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!file) return (
    <div style={{ padding: 32 }}>
      <EmptyState dark={dark} iconName="alertTriangle" title={T('detail.notFound')} body={T('detail.notFoundSub')} />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -8 }}>
        <button onClick={onClose} style={{
          padding: '7px 16px', background: purple, color: '#fff', border: 0, borderRadius: 6,
          cursor: 'pointer', fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 600,
        }}>{T('detail.backToDropZone')}</button>
      </div>
    </div>
  );

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(null), 2200); };
  const filePath = file.path || ('~/Anarchive/drops/' + file.name);

  const meta = [
    [T('detail.name'),     file.name],
    [T('detail.kind'),     file.kind || file.ext],
    [T('detail.size'),     file.size],
    [T('detail.dropped'),  formatAgo(file.at)],
    [T('detail.format'),   file.ext],
    [T('detail.location'), filePath],
  ];

  let preview;
  if (file.kind === 'image' && file.path) {
    preview = (
      <div style={{ height: 240, position: 'relative', overflow: 'hidden', background: dark ? '#261e36' : '#f3ecda' }}>
        <img
          src={`ac-file://${file.path}`}
          alt={file.name}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>
    );
  } else if (file.kind === 'image' && file.color) {
    preview = <div style={{ height: 240, background: file.color }} />;
  } else {
    preview = (
      <div style={{
        height: 240, background: dark ? '#261e36' : '#f3ecda',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <KindThumb kind={file.kind} ext={file.ext} dark={dark} />
        <span style={{
          fontFamily: 'var(--ac-font-mono)', fontSize: 12, letterSpacing: '0.08em', fontWeight: 600,
          color: dark ? '#80738f' : 'var(--ac-fg-3)',
        }}>{file.ext}</span>
      </div>
    );
  }

  return (
    <div style={{ padding: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'start' }}>
        <div style={{ background: panel, border: '1px solid ' + border, borderRadius: 12, overflow: 'hidden', boxShadow: dark ? 'none' : '0 1px 0 rgba(31,14,46,0.04), 0 4px 12px -2px rgba(31,14,46,0.10)' }}>
          {preview}
          <div style={{ padding: '12px 14px', borderTop: '1px solid ' + border }}>
            <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 600, color: fg1, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
            <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 10.5, color: fg3 }}>{file.size} · {formatAgo(file.at)}</div>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: purple, marginBottom: 10 }}>{T('detail.details')}</div>
          <div style={{ background: panel, border: '1px solid ' + border, borderRadius: 10, overflow: 'hidden' }}>
            {meta.map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', gap: 16, padding: '9px 14px', borderTop: i === 0 ? 0 : '1px solid ' + border, alignItems: 'baseline' }}>
                <div style={{ width: 84, flex: 'none', fontFamily: 'var(--ac-font-ui)', fontSize: 11, fontWeight: 500, color: fg3, letterSpacing: '0.02em' }}>{k}</div>
                <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--ac-font-mono)', fontSize: 12, color: fg1, wordBreak: 'break-all' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: purple, marginBottom: 6 }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              {(file.tags || []).map(tag => (
                <span key={tag} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 4,
                  background: dark ? '#261e36' : 'var(--ac-plum-50)',
                  border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.20)'),
                  fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: dark ? '#c4a9e8' : 'var(--ac-plum-700)',
                }}>
                  {tag}
                  <button onClick={() => {
                    const next = (file.tags || []).filter(t => t !== tag);
                    onUpdateTags?.(file.id, next);
                  }} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: dark ? '#80738f' : 'var(--ac-fg-3)', display: 'flex', lineHeight: 1 }}>
                    <Icon name="x" size={9} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              {editingTags ? (
                <input autoFocus value={newTagInput} onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const t = newTagInput.trim().toLowerCase().replace(/\s+/g, '-');
                      if (t && !(file.tags || []).includes(t)) onUpdateTags?.(file.id, [...(file.tags || []), t]);
                      setNewTagInput(''); setEditingTags(false);
                    }
                    if (e.key === 'Escape') { setNewTagInput(''); setEditingTags(false); }
                  }}
                  onBlur={() => { setNewTagInput(''); setEditingTags(false); }}
                  placeholder="tag…"
                  style={{
                    padding: '3px 7px', borderRadius: 4, border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.30)'),
                    background: dark ? '#261e36' : '#fffdf6', color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
                    fontFamily: 'var(--ac-font-ui)', fontSize: 11, outline: 'none', width: 80,
                  }}
                />
              ) : (
                <button onClick={() => setEditingTags(true)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 4,
                  background: 'transparent', border: '1px dashed ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.25)'),
                  fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: dark ? '#80738f' : 'var(--ac-fg-3)',
                  cursor: 'pointer',
                }}><Icon name="plus" size={9} strokeWidth={2.5} /> Add tag</button>
              )}
            </div>
          </div>

          {/* Project assignment */}
          {projects.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: purple, marginBottom: 6 }}>Project</div>
              <select
                value={projectAssignments[file.id] || ''}
                onChange={e => {
                  const pid = e.target.value || null;
                  if (pid) onAssignItem?.(file.id, pid); else onAssignItem?.(file.id, null);
                }}
                style={{
                  padding: '6px 10px', borderRadius: 6, fontFamily: 'var(--ac-font-ui)', fontSize: 12,
                  background: dark ? '#110b1a' : '#fffdf6', color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
                  border: '1px solid ' + border, outline: 'none', cursor: 'pointer', width: '100%',
                }}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Category badge if classified */}
          {file.category && file.category !== 'unknown' && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 4,
                background: dark ? '#261e36' : 'rgba(255,138,51,0.10)',
                border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(255,138,51,0.30)'),
                fontFamily: 'var(--ac-font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)', textTransform: 'uppercase',
              }}>{file.category}</span>
              <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: fg3 }}>auto-classified</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <ActionButton dark={dark} icon="pencil" active={renaming} onClick={() => {
              setRenaming(r => !r);
              setRenameInput(file.name.replace(/\.[^.]+$/, ''));
            }}>Rename</ActionButton>
            <ActionButton variant="primary" dark={dark} icon="externalLink" onClick={async () => {
              if (window.anarchive?.system?.openPath && file.path) {
                showMsg(`${T('detail.opening')} ${file.name}…`);
                const err = await window.anarchive.system.openPath(file.path).catch(() => 'error');
                if (err) showMsg(`Errore: ${err}`);
              } else {
                showMsg(`${T('detail.wouldOpen')} ${file.name}.`);
              }
            }}>{T('detail.open')}</ActionButton>
            <ActionButton dark={dark} icon="copy" onClick={() => {
              const textToCopy = file.path || filePath;
              if (window.anarchive) {
                navigator.clipboard.writeText(textToCopy)
                  .then(() => showMsg(T('detail.pathCopied')))
                  .catch(() => showMsg(T('detail.pathPrefix') + textToCopy));
              } else {
                showMsg(T('detail.pathPrefix') + textToCopy);
              }
            }}>{T('detail.copyPath')}</ActionButton>
            {onLock && (
              <ActionButton dark={dark} icon="shieldCheck"
                onClick={() => onLock(file.id, !file.locked)}
                style={file.locked
                  ? {
                      background: dark ? '#1f2e1f' : '#eef0dc',
                      border: '1px solid ' + (dark ? '#7eb661' : '#4a5621'),
                      color: dark ? '#a3c777' : '#4a5621',
                    }
                  : {}}>
                {file.locked ? 'Locked' : 'Lock'}
              </ActionButton>
            )}
            {/* Share — native macOS Share Sheet. Hidden entirely on non-macOS. */}
            {isMac && (
              <ActionButton dark={dark} icon="share"
                disabled={!file.path}
                title={file.path ? 'Condividi…' : 'Path not available'}
                onClick={async () => {
                  if (!file.path) { showMsg('Path not available'); return; }
                  if (!window.anarchive?.vault?.shareFile) { showMsg("Share: disponibile nell'app installata."); return; }
                  const r = await window.anarchive.vault.shareFile(file.path).catch(() => ({ success: false, error: 'invoke-error' }));
                  if (!r?.success) {
                    const map = {
                      'file-not-found':     'File not found on disk',
                      'forbidden':          'Path outside vault — share blocked',
                      'helper-unavailable': 'Share helper not available (swiftc missing?)',
                      'unsupported-platform': 'Share is only available on macOS',
                      'invalid-path':       'Path not available',
                    };
                    showMsg(map[r?.error] || `Share error: ${r?.error || 'unknown'}`);
                  }
                }}>Share</ActionButton>
            )}
            <ActionButton variant="danger" dark={dark} icon="trash"
              disabled={file.locked}
              onClick={() => {
                if (!file.locked && askConfirm(T('detail.confirmForget', { n: file.name }))) {
                  onForget?.(file.id);
                } else if (file.locked) {
                  showMsg('Unlock this file before deleting.');
                }
              }}
              style={{ marginLeft: 'auto' }}>{T('detail.forget')}</ActionButton>
          </div>

          {actionMsg && (
            <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: dark ? '#261e36' : 'var(--ac-plum-50)', fontFamily: 'var(--ac-font-ui)', fontSize: 12, color: dark ? '#b9accd' : 'var(--ac-plum-700)' }}>
              {actionMsg}
            </div>
          )}

          {renaming && (() => {
            const ext = file.ext ? '.' + file.ext.toLowerCase() : '';
            const dateStr = new Date(file.at).toISOString().slice(0, 10);
            const suggestions = (() => {
              const s = [];
              s.push(`${dateStr}-${(file.category || file.kind || file.ext.toLowerCase())}`);
              if (ocrText) {
                const words = ocrText.split(/\s+/).filter(w => w.length > 2 && /^[a-zA-Z0-9]+$/.test(w)).slice(0, 4).join('-').toLowerCase().slice(0, 40);
                if (words && words !== s[0]) s.push(words);
              }
              const s3 = `${file.kind || 'file'}-${dateStr}`;
              if (!s.includes(s3)) s.push(s3);
              return s.slice(0, 3);
            })();
            return (
              <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, background: dark ? '#1a1330' : 'var(--ac-plum-50)', border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.20)') }}>
                <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: purple, marginBottom: 8 }}>Rename</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    autoFocus
                    value={renameInput}
                    onChange={e => setRenameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && renameInput.trim()) {
                        onRename?.(file.id, renameInput.trim() + ext).then(r => {
                          if (r) showMsg(`Renamed to "${r.name}"`); else showMsg('Rename failed');
                        }).catch(() => showMsg('Rename failed'));
                        setRenaming(false);
                      }
                      if (e.key === 'Escape') setRenaming(false);
                    }}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 6,
                      background: dark ? '#110b1a' : '#fffdf6', color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
                      border: '1px solid ' + (dark ? '#4A0E7A' : 'rgba(74,14,122,0.35)'),
                      fontFamily: 'var(--ac-font-mono)', fontSize: 12, outline: 'none',
                    }}
                  />
                  <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 12, color: fg3 }}>{ext}</span>
                  <button onClick={() => {
                    if (!renameInput.trim()) return;
                    onRename?.(file.id, renameInput.trim() + ext).then(r => {
                      if (r) showMsg(`Renamed to "${r.name}"`); else showMsg('Rename failed');
                    }).catch(() => showMsg('Rename failed'));
                    setRenaming(false);
                  }} style={{
                    padding: '6px 12px', borderRadius: 6, border: 0,
                    background: purple, color: '#fff',
                    fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Apply</button>
                  <button onClick={() => setRenaming(false)} style={{
                    padding: '6px 10px', borderRadius: 6, background: 'transparent', color: fg3,
                    border: '1px solid ' + border, fontFamily: 'var(--ac-font-ui)', fontSize: 12, cursor: 'pointer',
                  }}>Cancel</button>
                </div>
                {suggestions.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => setRenameInput(s)} style={{
                        padding: '3px 9px', borderRadius: 4, border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.20)'),
                        background: dark ? '#261e36' : '#fffdf6', color: dark ? '#c4a9e8' : 'var(--ac-plum-700)',
                        fontFamily: 'var(--ac-font-mono)', fontSize: 10.5, cursor: 'pointer',
                      }}>{s}{ext}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ marginTop: 14, fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 12.5, color: fg2, lineHeight: 1.5 }}>
            {T('detail.stored')}
          </div>
        </div>
      </div>

      {/* OCR extracted text — full width below the 2-col grid */}
      {isOcrable && (
        <div style={{ marginTop: 22 }}>
          <div style={{
            fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: purple, marginBottom: 8,
          }}>Extracted text</div>
          {ocrLoading ? (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: panel, border: '1px solid ' + border,
              fontFamily: 'var(--ac-font-ui)', fontSize: 12, color: fg3, fontStyle: 'italic',
            }}>Extracting text…</div>
          ) : ocrText ? (
            <>
              <div style={{
                padding: '12px 14px', borderRadius: 8,
                background: panel, border: '1px solid ' + border,
                fontFamily: 'var(--ac-font-mono)', fontSize: 12, color: fg1,
                maxHeight: 160, overflowY: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6,
              }}>{ocrText}</div>
              <button onClick={() => {
                navigator.clipboard.writeText(ocrText);
                showMsg('Text copied!');
              }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 5, marginTop: 7,
                background: 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.22)'),
                color: dark ? '#f3eef9' : 'var(--ac-plum-800)',
                fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              }}>
                <Icon name="copy" size={11} strokeWidth={2.25} /> Copy text
              </button>
            </>
          ) : (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: panel, border: '1px solid ' + border,
              fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
              fontSize: 12, color: fg3,
            }}>No text found in this image.</div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================
// Project view — helper components
// =============================================================
function ProjectEmptyHint({ dark, fg3, children }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 7,
      background: dark ? 'rgba(255,255,255,0.025)' : 'rgba(74,14,122,0.04)',
      border: '1px dashed ' + (dark ? '#4a3d64' : 'rgba(74,14,122,0.28)'),
      fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
      fontSize: 11.5, color: dark ? '#80738f' : 'rgba(74,14,122,0.58)', lineHeight: 1.5,
    }}>{children}</div>
  );
}

function ProjectSection({ label, icon, count, expanded, onToggle, dark, fg3, border, accent, children }) {
  const hc = accent || fg3;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Icon name={icon} size={12} strokeWidth={2} color={hc} />
        <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: hc }}>{label}</span>
        <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, color: dark ? '#3d2f56' : 'rgba(74,14,122,0.4)' }}>{count}</span>
        <div style={{ flex: 1, height: 1, background: dark ? '#261e36' : 'var(--ac-dust)' }} />
        <button onClick={onToggle} className="ac-proj-btn" style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
          background: 'transparent', border: '1px solid ' + (dark ? '#2e2440' : 'var(--ac-dust)'),
          color: fg3, fontFamily: 'var(--ac-font-ui)', fontSize: 9.5,
        }}>
          <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={9} strokeWidth={2.5} />
          {expanded ? 'Comprimi' : 'Espandi'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  );
}

function PinnedFileTile({ file, dark, fg1, fg3, border, panel, purple, onUnpin, onOpen }) {
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const isImg = file.kind === 'image' && file.path;
  const canDrag = !!(window.anarchive && file.path);
  const iconName = file.kind === 'document' ? 'fileText' : file.kind === 'audio' ? 'music' : file.kind === 'video' ? 'film' : file.kind === 'image' ? 'image' : 'file';
  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? (e) => { e.preventDefault(); window.anarchive.dragout(file.path); } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 82, flex: 'none', borderRadius: 8, overflow: 'hidden',
        background: panel, border: '1px solid ' + (hovered ? '#FF8A33' : border),
        cursor: canDrag ? (hovered ? 'grab' : 'pointer') : 'pointer',
        position: 'relative',
        transform: hovered ? 'scale(1.04)' : 'scale(1)',
        zIndex: hovered ? 2 : 1,
        boxShadow: hovered
          ? '0 0 0 1px rgba(255,138,51,0.50), 0 0 24px 5px rgba(255,138,51,0.32), 0 8px 18px rgba(0,0,0,0.30)'
          : 'none',
        transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 220ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms ease',
      }}>
      <div onClick={() => onOpen?.(file.id)} style={{
        height: 54, background: dark ? '#261e36' : '#f3ecda',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative',
      }}>
        {isImg ? (
          <>
            {!imgLoaded && <Icon name="image" size={18} strokeWidth={1.5} color={fg3} />}
            <img src={`ac-file://${file.path}`} alt="" onLoad={() => setImgLoaded(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0 }} />
          </>
        ) : (
          <Icon name={iconName} size={22} strokeWidth={1.5} color={dark ? '#FFA866' : '#b34a02'} />
        )}
      </div>
      <div onClick={() => onOpen?.(file.id)} style={{
        padding: '4px 6px 5px', borderTop: '1px solid ' + border,
        fontFamily: 'var(--ac-font-ui)', fontSize: 9.5, color: fg1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{file.name}</div>
      {hovered && (
        <button onClick={(e) => { e.stopPropagation(); onUnpin(file.id); }} title="Rimuovi dai fissati" style={{
          position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 4,
          background: 'rgba(0,0,0,0.6)', border: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}><Icon name="x" size={9} strokeWidth={2.5} /></button>
      )}
      {hovered && canDrag && (
        <div style={{
          position: 'absolute', bottom: 22, right: 4, width: 16, height: 16, borderRadius: 3,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', pointerEvents: 'none',
        }}><Icon name="externalLink" size={8} strokeWidth={2.5} /></div>
      )}
    </div>
  );
}

// =============================================================
// Project view — main component
// =============================================================
const PROJECT_EMOJIS = [
  // Color circles
  '🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤',
  // Color squares
  '🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫',
  // Color hearts
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎',
  // Color diamonds / shapes
  '🔸','🔶','🔷','🔹','💠','🔺','🔻','🔘','🔲',
  // Work & archive
  '📁','🗂️','📂','💼','🗃️','📋','📌','📎','🔖','🏷️',
  // Notes & ideas
  '📝','💡','✏️','🖊️','🖋️','📓','📔','📒','📃','📄',
  // Goals & priority
  '🎯','⭐','🌟','✨','💫','🏆','🥇','🎖️','🚩','🔥',
  // Data & tools
  '📊','📈','📉','🔬','🛠️','⚙️','🔧','🔩','⚡','🔑',
  // Tech
  '🌐','🖥️','💻','📱','📡','🔭','🧬','🧪',
  // Nature
  '🌿','🌱','🌸','🌺','🌻','🍀','🌊','🏔️','🌲','🌵',
  // Creative & media
  '🎨','🎭','🎬','🎵','🖼️','📷','🎤',
  // Places & transport
  '🏠','🏢','🚀','✈️','🌈',
  // Symbols
  '♾️','💎','👑','🧲','☀️','🌙',
];

function EmojiPicker({ current, onSelect, dark }) {
  return (
    <div style={{
      position: 'absolute', top: '110%', left: 0, zIndex: 200,
      background: dark ? '#1d1729' : '#fffdf6',
      border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.22)'),
      borderRadius: 10, boxShadow: '0 8px 32px rgba(15,8,28,0.3)',
      padding: 8, display: 'flex', flexWrap: 'wrap', gap: 2, width: 236,
      maxHeight: 260, overflowY: 'auto',
    }}>
      {PROJECT_EMOJIS.map(e => (
        <button key={e} onClick={() => onSelect(e)} title={e} style={{
          width: 28, height: 28, borderRadius: 5, border: 0, cursor: 'pointer',
          background: e === current ? (dark ? '#4A0E7A' : 'rgba(74,14,122,0.12)') : 'transparent',
          fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{e}</button>
      ))}
    </div>
  );
}

function ProjectView({ project, clips, files, snippets, projectAssignments, dark, onExit, onOpenFile, onUpdateEmoji, onUnassignItem }) {
  const T = useT();
  // Resizable right (prompts) column
  const [promptsWidth, setPromptsWidth] = useResizable('ac.projectPromptsWidth', 210, 140, 420);
  const _promptsStartW = useRef(promptsWidth);
  const [pQuery, setPQuery]           = useState('');
  const [copiedId, setCopiedId]       = useState(null);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const [filesExpanded, setFilesExp]  = useState(false);
  const [writtenExpanded, setWritExp] = useState(false);
  const [pinMsg, setPinMsg]           = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [projectPins, setProjectPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ac.project-pins') || '{}'); } catch { return {}; }
  });
  const [quickPrompts, setQuickPrompts] = useState(() => {
    try { const all = JSON.parse(localStorage.getItem('ac.project-prompts') || '{}'); return all[project?.id] || []; } catch { return []; }
  });
  const [promptDraft, setPromptDraft] = useState('');
  const [promptTitleDraft, setPromptTitleDraft] = useState('');
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState(null);
  const [copiedPromptId, setCopiedPromptId] = useState(null);

  const fg1    = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2    = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';
  const panel  = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const purple = '#4A0E7A';

  if (!project) return null;

  const pid        = project.id;
  const pinnedIds  = projectPins[pid] || [];

  const savePins = (next) => {
    setProjectPins(next);
    try { localStorage.setItem('ac.project-pins', JSON.stringify(next)); } catch {}
  };
  const pinFile = (fileId) => {
    if (pinnedIds.includes(fileId)) return;
    if (pinnedIds.length >= 6) {
      setPinMsg(T('project.pinLimit'));
      setTimeout(() => setPinMsg(null), 3500);
      return;
    }
    savePins({ ...projectPins, [pid]: [...pinnedIds, fileId] });
  };
  const unpinFile = (fileId) => {
    savePins({ ...projectPins, [pid]: pinnedIds.filter(id => id !== fileId) });
  };

  const savePrompts = (next) => {
    setQuickPrompts(next);
    try {
      const all = JSON.parse(localStorage.getItem('ac.project-prompts') || '{}');
      localStorage.setItem('ac.project-prompts', JSON.stringify({ ...all, [pid]: next }));
    } catch {}
    // A7: notify launcher so its pinnedPrompts strip refreshes immediately
    try { window.dispatchEvent(new Event('ac:pinnedPromptsChanged')); } catch {}
  };
  const addPrompt = () => {
    if (!promptDraft.trim()) return;
    if (editingPromptId) {
      savePrompts(quickPrompts.map(p => p.id === editingPromptId ? { ...p, text: promptDraft.trim(), title: promptTitleDraft.trim() } : p));
      setEditingPromptId(null);
    } else {
      savePrompts([...quickPrompts, { id: _newUUID(), text: promptDraft.trim(), title: promptTitleDraft.trim(), at: Date.now() }]);
    }
    setPromptDraft(''); setPromptTitleDraft(''); setShowPromptForm(false);
  };
  const deletePrompt = (id) => savePrompts(quickPrompts.filter(p => p.id !== id));
  const togglePinPrompt = (id) => savePrompts(quickPrompts.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p));
  const copyPrompt = (id, text) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 1400);
  };

  // Raw project data
  const projectFiles    = files.filter(f => projectAssignments?.[f.id] === pid);
  const projectClips    = clips.filter(c => projectAssignments?.[c.id] === pid);
  const projectSnippets = snippets.filter(s => projectAssignments?.[s.id] === pid);

  // Search
  const q = pQuery.trim() ? normalize(pQuery) : null;
  const visFiles = q ? projectFiles.filter(f =>
    normalize(f.name).includes(q) || (f.ocrText && normalize(f.ocrText).includes(q)) ||
    (f.tags && f.tags.some(t => normalize(t).includes(q)))
  ) : projectFiles;
  const visClips = q ? projectClips.filter(c =>
    normalize(c.text).includes(q) || normalize(c.app || '').includes(q)
  ) : projectClips;
  const visSnippets = q ? projectSnippets.filter(s =>
    normalize(s.title).includes(q) || normalize(s.text).includes(q)
  ) : projectSnippets;

  // Pinned: must be in this project
  const pinnedFiles   = pinnedIds.map(id => projectFiles.find(f => f.id === id)).filter(Boolean);
  // Chronological files: all visible non-pinned, newest first
  const chronoFiles   = [...visFiles].filter(f => !pinnedIds.includes(f.id)).sort((a, b) => b.at - a.at);
  // Written: clips + snippets merged, newest first
  const writtenItems  = [
    ...visClips.map(c => ({ ...c, _type: 'clip' })),
    ...visSnippets.map(s => ({ ...s, _type: 'snippet' })),
  ].sort((a, b) => (b.at || 0) - (a.at || 0));

  const FILES_LIMIT   = 4;
  const WRITTEN_LIMIT = 4;
  const shownFiles    = filesExpanded   ? chronoFiles  : chronoFiles.slice(0, FILES_LIMIT);
  const shownWritten  = writtenExpanded ? writtenItems : writtenItems.slice(0, WRITTEN_LIMIT);

  const copyText = (id, text) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  const kindColors = {
    text:   { bg: dark ? '#261e36' : 'var(--ac-plum-50)',   fg: dark ? '#b9accd' : 'var(--ac-plum-700)' },
    code:   { bg: dark ? '#1a2440' : '#e8f0ff',              fg: dark ? '#7ba3e0' : '#3060b0' },
    link:   { bg: dark ? '#1a2e28' : '#e6f4ed',              fg: dark ? '#5fb896' : '#1a7a4a' },
    url:    { bg: dark ? '#1a2e28' : '#e6f4ed',              fg: dark ? '#5fb896' : '#1a7a4a' },
    prompt: { bg: dark ? '#2e1a10' : '#fff3e8',              fg: dark ? '#FF8A33' : '#b34a02' },
  };

  const totalItems = projectFiles.length + projectClips.length + projectSnippets.length;

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, minHeight: 0, width: '100%' }}>
    {/* ── LEFT: main project content ──────────────────────────── */}
    <div style={{ flex: 1, minWidth: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', flex: 'none' }}>
          <button
            onClick={() => setShowEmojiPicker(p => !p)}
            title="Cambia emoji"
            style={{ background: 'none', border: 0, outline: 'none', cursor: 'pointer', padding: 0, fontSize: 44, lineHeight: 1, display: 'flex', WebkitAppRegion: 'no-drag', transition: 'opacity 150ms', opacity: 1 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >{project.emoji || '📁'}</button>
          {showEmojiPicker && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowEmojiPicker(false)} />
              <EmojiPicker
                current={project.emoji || '📁'}
                onSelect={(e) => { onUpdateEmoji?.(project.id, e); setShowEmojiPicker(false); }}
                dark={dark}
              />
            </>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 28, color: fg1, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
            <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: fg3, whiteSpace: 'nowrap', flex: 'none' }}>{totalItems} {T('project.itemsCount')} · {pinnedFiles.length}/6 {T('project.pinnedSuffix')}</div>
          </div>
        </div>
        <button onClick={onExit} className="ac-proj-btn" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, flex: 'none',
          background: 'transparent', border: '1px solid ' + border,
          color: fg2, fontFamily: 'var(--ac-font-ui)', fontSize: 12, cursor: 'pointer',
        }}><Icon name="x" size={11} strokeWidth={2} /> {T('actions.exit')}</button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: dark ? '#110b1a' : '#fffdf6', border: '1px solid ' + border, borderRadius: 8 }}>
        <Icon name="search" size={14} strokeWidth={2} color={fg3} />
        <input value={pQuery} onChange={e => setPQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setPQuery(''); }}
          placeholder={T('project.search', { q: project.name })}
          style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', fontFamily: 'var(--ac-font-ui)', fontSize: 13, color: fg1 }} />
        {pQuery && <button onClick={() => setPQuery('')} className="ac-proj-btn" style={{ background: 'transparent', border: 0, color: fg3, cursor: 'pointer', padding: 0, display: 'flex' }}><Icon name="x" size={12} strokeWidth={2} /></button>}
      </div>

      {/* ── 1. PINNED FILES BAR ─────────────────────────────────── */}
      <div style={{ background: dark ? '#1a1330' : '#f3ecda', border: '1px solid ' + border, borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Icon name="star" size={11} strokeWidth={2.5} color={dark ? '#FF8A33' : '#b34a02'} />
          <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: dark ? '#FF8A33' : '#b34a02' }}>{T('project.pinnedTitle')}</span>
          <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, color: fg3 }}>{pinnedFiles.length}/6</span>
        </div>
        {pinnedFiles.length === 0 ? (
          <ProjectEmptyHint dark={dark} fg3={fg3}>{T('project.pinnedEmpty')}</ProjectEmptyHint>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pinnedFiles.map(f => (
              <PinnedFileTile key={f.id} file={f} dark={dark} fg1={fg1} fg3={fg3} border={border} panel={panel} purple={purple} onUnpin={unpinFile} onOpen={onOpenFile} />
            ))}
            {pinnedFiles.length < 6 && (
              <div style={{ width: 82, height: 82, borderRadius: 8, flex: 'none', border: '1px dashed ' + border, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, color: dark ? '#3d2f56' : 'rgba(74,14,122,0.3)', fontSize: 9.5, fontFamily: 'var(--ac-font-ui)' }}>
                <Icon name="plus" size={14} strokeWidth={2} />
                <span>{6 - pinnedFiles.length} {T('project.pinnedFree')}</span>
              </div>
            )}
          </div>
        )}
        {pinMsg && (
          <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 5, background: dark ? '#2e1a10' : '#fff3e8', border: '1px solid ' + (dark ? '#5a3520' : 'rgba(255,138,51,0.3)'), fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: dark ? '#FF8A33' : '#b34a02' }}>{pinMsg}</div>
        )}
      </div>

      {/* ── 2. CHRONOLOGICAL FILES ──────────────────────────────── */}
      <ProjectSection label={T('project.filesSection')} icon="folder" count={chronoFiles.length}
        expanded={filesExpanded} onToggle={() => setFilesExp(e => !e)}
        dark={dark} fg3={fg3} border={border}>
        {chronoFiles.length === 0 ? (
          <ProjectEmptyHint dark={dark} fg3={fg3}>{T('project.filesEmpty')}</ProjectEmptyHint>
        ) : (
          <>
            {shownFiles.map(item => {
              const isPinned = pinnedIds.includes(item.id);
              const itemHovered = hoveredItemId === item.id;
              const hoverBg = dark ? '#261e36' : 'var(--ac-plum-50)';
              return (
                <div key={item.id}
                  draggable={!!(window.anarchive && item.path)}
                  onDragStart={window.anarchive && item.path ? (e) => { e.preventDefault(); window.anarchive.dragout(item.path); } : undefined}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: itemHovered ? hoverBg : panel, border: '1px solid ' + border, borderRadius: 8, transition: 'background 120ms' }}>
                  <div onClick={() => onOpenFile?.(item.id)} style={{ width: 34, height: 34, borderRadius: 6, flex: 'none', overflow: 'hidden', background: dark ? '#261e36' : '#f3ecda', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {item.kind === 'image' && item.path
                      ? <img src={`ac-file://${item.path}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />
                      : <Icon name={item.kind === 'document' ? 'fileText' : item.kind === 'audio' ? 'music' : item.kind === 'video' ? 'film' : item.kind === 'image' ? 'image' : 'file'} size={15} strokeWidth={1.75} color={dark ? '#FFA866' : '#b34a02'} />}
                  </div>
                  <div onClick={() => onOpenFile?.(item.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                    <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 500, color: fg1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: fg3, marginTop: 1 }}>{item.size} · {formatAgo(item.at)}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 9, padding: '1px 5px', borderRadius: 3, background: dark ? '#261e36' : 'var(--ac-plum-50)', color: dark ? '#c4a9e8' : purple }}>{item.ext}</span>
                  <button onClick={() => isPinned ? unpinFile(item.id) : pinFile(item.id)}
                    title={isPinned ? T('project.unpinTitle') : T('project.pinTitle')}
                    className="ac-proj-btn"
                    style={{ width: 26, height: 26, borderRadius: 5, cursor: 'pointer', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPinned ? (dark ? '#2e1a10' : '#fff3e8') : 'transparent', border: '1px solid ' + (isPinned ? (dark ? '#5a3520' : 'rgba(255,138,51,0.3)') : border), color: isPinned ? '#FF8A33' : fg3 }}>
                    <Icon name="star" size={11} strokeWidth={2.25} />
                  </button>
                  <button onClick={() => onUnassignItem?.(item.id)}
                    title={T('project.removeFromProj')}
                    className="ac-proj-btn"
                    style={{ width: 26, height: 26, borderRadius: 5, cursor: 'pointer', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid ' + border, color: fg3 }}>
                    <Icon name="x" size={10} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
            {!filesExpanded && chronoFiles.length > FILES_LIMIT && (
              <button onClick={() => setFilesExp(true)} className="ac-proj-btn" style={{ padding: '7px 14px', borderRadius: 6, background: 'transparent', border: '1px solid ' + border, color: fg3, fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, cursor: 'pointer', textAlign: 'left' }}>
                + {chronoFiles.length - FILES_LIMIT} {T('project.moreFiles')}
              </button>
            )}
          </>
        )}
      </ProjectSection>

      {/* ── 3. WRITTEN CONTENT ──────────────────────────────────── */}
      <ProjectSection label={T('project.writtenSection')} icon="pencil" count={writtenItems.length}
        expanded={writtenExpanded} onToggle={() => setWritExp(e => !e)}
        dark={dark} fg3={fg3} border={border}>
        {writtenItems.length === 0 ? (
          <ProjectEmptyHint dark={dark} fg3={fg3}>{T('project.writtenEmpty')}</ProjectEmptyHint>
        ) : (
          <>
            {shownWritten.map(item => {
              const ks = kindColors[item.kind] || kindColors.text;
              const itemHovered = hoveredItemId === item.id;
              const hoverStyle = itemHovered ? {
                background: dark ? '#261e36' : 'var(--ac-plum-50)',
                border: '1px solid rgba(255,138,51,0.50)',
                boxShadow: '0 0 0 1px rgba(255,138,51,0.20), 0 0 10px 2px rgba(255,138,51,0.12)',
              } : {
                background: panel,
                border: '1px solid ' + border,
                boxShadow: 'none',
              };
              if (item._type === 'clip') {
                const isUrl = item.kind === 'url';
                return (
                  <div key={item.id}
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, transition: 'background 120ms, border-color 150ms, box-shadow 150ms', ...hoverStyle }}>
                    <span style={{ padding: '2px 7px', borderRadius: 4, background: ks.bg, color: ks.fg, fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, fontWeight: 500, flex: 'none', marginTop: 1 }}>{item.kind}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: item.kind === 'code' || isUrl ? 'var(--ac-font-mono)' : 'var(--ac-font-ui)', fontSize: 12.5, color: isUrl ? (dark ? '#FFA866' : '#b34a02') : fg1, overflow: writtenExpanded ? 'visible' : 'hidden', textOverflow: writtenExpanded ? 'clip' : 'ellipsis', whiteSpace: writtenExpanded ? 'pre-wrap' : 'nowrap', wordBreak: writtenExpanded ? 'break-word' : 'normal' }}>{item.text}</div>
                      <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: fg3, marginTop: 3 }}>{formatAgo(item.at)}{item.app ? ` · ${item.app}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flex: 'none', alignItems: 'center' }}>
                      {isUrl && window.anarchive?.system?.openExternal && (
                        <button onClick={() => window.anarchive.system.openExternal(item.text.trim())} className="ac-proj-btn" style={{ background: 'transparent', border: '1px solid ' + border, color: fg3, height: 26, width: 26, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="externalLink" size={11} strokeWidth={2} /></button>
                      )}
                      <button onClick={() => copyText(item.id, item.text)} className="ac-proj-btn" style={{ background: copiedId === item.id ? (dark ? '#1f2e1f' : '#eef0dc') : 'transparent', border: '1px solid ' + border, color: copiedId === item.id ? (dark ? '#a3c777' : '#4a5621') : fg3, height: 26, padding: '0 12px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--ac-font-ui)', fontSize: 12, display: 'flex', alignItems: 'center' }}>{copiedId === item.id ? '✓' : T('actions.copy')}</button>
                      <button onClick={() => onUnassignItem?.(item.id)} title={T('project.removeFromProj')} className="ac-proj-btn" style={{ background: 'transparent', border: '1px solid ' + border, color: fg3, height: 26, width: 26, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={11} strokeWidth={2.5} /></button>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div key={item.id}
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, transition: 'background 120ms, border-color 150ms, box-shadow 150ms', ...hoverStyle }}>
                    <span style={{ padding: '2px 7px', borderRadius: 4, background: ks.bg, color: ks.fg, fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, fontWeight: 500, flex: 'none', marginTop: 1 }}>{item.kind}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 600, color: fg1, marginBottom: 3 }}>{item.title}</div>
                      <div style={{ fontFamily: item.kind === 'code' ? 'var(--ac-font-mono)' : 'var(--ac-font-serif)', fontStyle: item.kind !== 'code' ? 'italic' : 'normal', fontSize: 11.5, color: fg2, lineHeight: 1.45, display: writtenExpanded ? 'block' : '-webkit-box', WebkitLineClamp: writtenExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: writtenExpanded ? 'visible' : 'hidden', whiteSpace: writtenExpanded ? 'pre-wrap' : 'normal', wordBreak: 'break-word' }}>{item.text}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 'none', marginTop: 2 }}>
                      <button onClick={() => copyText(item.id, item.text)} className="ac-proj-btn" style={{ background: copiedId === item.id ? (dark ? '#1f2e1f' : '#eef0dc') : 'transparent', border: '1px solid ' + border, color: copiedId === item.id ? (dark ? '#a3c777' : '#4a5621') : fg3, height: 26, padding: '0 12px', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--ac-font-ui)', fontSize: 12, display: 'flex', alignItems: 'center' }}>{copiedId === item.id ? '✓' : T('actions.copy')}</button>
                      <button onClick={() => onUnassignItem?.(item.id)} title="Rimuovi dal progetto" className="ac-proj-btn" style={{ background: 'transparent', border: '1px solid ' + border, color: fg3, height: 26, width: 26, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={11} strokeWidth={2.5} /></button>
                    </div>
                  </div>
                );
              }
            })}
            {!writtenExpanded && writtenItems.length > WRITTEN_LIMIT && (
              <button onClick={() => setWritExp(true)} className="ac-proj-btn" style={{ padding: '7px 14px', borderRadius: 6, background: 'transparent', border: '1px solid ' + border, color: fg3, fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, cursor: 'pointer', textAlign: 'left' }}>
                + {writtenItems.length - WRITTEN_LIMIT} {T('project.moreItems')}
              </button>
            )}
          </>
        )}
      </ProjectSection>

    </div>{/* end left column */}

    {/* Resize handle between left content and right prompts panel */}
    <ResizeHandle
      dark={dark}
      side="left"
      onResize={(phase, dx) => {
        if (phase === 'start') _promptsStartW.current = promptsWidth;
        else if (phase === 'move') setPromptsWidth(_promptsStartW.current + dx);
      }}
    />

    {/* ── RIGHT: prompt rapidi panel ──────────────────────────── */}
    <div style={{
      width: promptsWidth, flex: 'none', borderLeft: '1px solid ' + border,
      background: dark ? '#110b1a' : '#f3ecda',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Panel header */}
      <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid ' + border }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Icon name="zap" size={11} strokeWidth={2.5} color={dark ? '#FF8A33' : '#b34a02'} />
          <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: dark ? '#FF8A33' : '#b34a02' }}>{T('project.promptsTitle')}</span>
          <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 9, color: fg3 }}>{quickPrompts.length}</span>
          <div style={{ flex: 1 }} />
          {!showPromptForm && (
            <button onClick={() => { setShowPromptForm(true); setEditingPromptId(null); setPromptDraft(''); setPromptTitleDraft(''); }} className="ac-proj-btn" style={{
              width: 20, height: 20, borderRadius: 4, border: 0, cursor: 'pointer',
              background: dark ? '#261e36' : 'rgba(74,14,122,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: fg3,
            }}><Icon name="plus" size={11} strokeWidth={2.5} /></button>
          )}
        </div>

        {/* Add/edit form */}
        {showPromptForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <input
              autoFocus
              value={promptTitleDraft}
              onChange={e => setPromptTitleDraft(e.target.value)}
              placeholder={T('project.promptTitlePh')}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 5,
                background: dark ? '#261e36' : '#fffdf6', border: '1px solid ' + border,
                fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: fg1, outline: 'none',
              }}
            />
            <textarea
              value={promptDraft}
              onChange={e => setPromptDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setShowPromptForm(false); setEditingPromptId(null); } if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') addPrompt(); }}
              placeholder={T('project.promptTextPh')}
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 5, resize: 'vertical',
                background: dark ? '#261e36' : '#fffdf6', border: '1px solid ' + border,
                fontFamily: 'var(--ac-font-mono)', fontSize: 11, color: fg1, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={addPrompt} disabled={!promptDraft.trim()} className="ac-proj-btn" style={{
                flex: 1, padding: '4px 8px', borderRadius: 5, border: 0, cursor: promptDraft.trim() ? 'pointer' : 'default',
                background: promptDraft.trim() ? purple : (dark ? '#2e2440' : 'rgba(74,14,122,0.15)'),
                color: promptDraft.trim() ? '#fff' : fg3,
                fontFamily: 'var(--ac-font-ui)', fontSize: 11, fontWeight: 600,
              }}>{editingPromptId ? T('actions.update') : T('actions.save')}</button>
              <button onClick={() => { setShowPromptForm(false); setEditingPromptId(null); }} className="ac-proj-btn" style={{
                padding: '4px 8px', borderRadius: 5, border: '1px solid ' + border, cursor: 'pointer',
                background: 'transparent', color: fg3, fontFamily: 'var(--ac-font-ui)', fontSize: 11,
              }}>✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Prompt list */}
      <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto' }}>
        {quickPrompts.length === 0 && !showPromptForm ? (
          <div style={{
            padding: '12px 8px', textAlign: 'center',
            fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
            fontSize: 11, color: dark ? '#3d2f56' : 'rgba(74,14,122,0.35)', lineHeight: 1.45,
          }}>{T('project.promptsEmpty')}</div>
        ) : quickPrompts.map(p => (
          <div key={p.id} style={{
            background: dark ? '#1d1729' : '#fffdf6', border: '1px solid ' + border,
            borderRadius: 7, padding: '8px 9px', display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {p.title && (
              <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11, fontWeight: 600, color: fg1, lineHeight: 1.2 }}>{p.title}</div>
            )}
            <div style={{
              fontFamily: 'var(--ac-font-mono)', fontSize: 10.5, color: fg2, lineHeight: 1.45,
              display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>{p.text}</div>
            <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
              <button onClick={() => copyPrompt(p.id, p.text)} className="ac-proj-btn" style={{
                flex: 1, padding: '3px 6px', borderRadius: 4, border: 0, cursor: 'pointer',
                background: copiedPromptId === p.id ? (dark ? '#1f2e1f' : '#eef0dc') : '#FF6B00',
                color: copiedPromptId === p.id ? (dark ? '#a3c777' : '#4a5621') : '#fff',
                fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <Icon name={copiedPromptId === p.id ? 'check' : 'copy'} size={9} strokeWidth={2.5} />
                {copiedPromptId === p.id ? T('actions.copied') : T('actions.copy')}
              </button>
              <button
                onClick={() => togglePinPrompt(p.id)}
                title={p.pinned ? T('project.unpinFromLauncher') : T('project.pinToLauncher')}
                className="ac-proj-btn"
                style={{
                  width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                  border: p.pinned ? '1px solid #FF6B00' : '1px solid ' + border,
                  background: p.pinned ? 'rgba(255,107,0,0.12)' : 'transparent',
                  color: p.pinned ? '#FF6B00' : fg3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Icon name="pin" size={9} strokeWidth={2.5} /></button>
              <button onClick={() => { setEditingPromptId(p.id); setPromptDraft(p.text); setPromptTitleDraft(p.title || ''); setShowPromptForm(true); }} className="ac-proj-btn" style={{
                width: 24, height: 24, borderRadius: 4, border: '1px solid ' + border, cursor: 'pointer',
                background: 'transparent', color: fg3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="pencil" size={9} strokeWidth={2.5} /></button>
              <button onClick={() => deletePrompt(p.id)} className="ac-proj-btn" style={{
                width: 24, height: 24, borderRadius: 4, border: '1px solid ' + border, cursor: 'pointer',
                background: 'transparent', color: fg3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon name="trash" size={9} strokeWidth={2.5} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>{/* end right prompt column */}

    </div>
  );
}

// =============================================================
// Snippet library — sub-components defined at module scope to
// avoid React unmounting/remounting them on every keystroke.
// =============================================================
function SnippetKindBtn({ k, activeKind, onChange, accent, dark, fg2 }) {
  return (
    <button onClick={() => onChange(k)} style={{
      padding: '4px 11px', borderRadius: 5, border: 0, cursor: 'pointer',
      background: activeKind === k ? accent : (dark ? '#261e36' : 'var(--ac-plum-50)'),
      color: activeKind === k ? '#fff' : fg2,
      fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500,
    }}>{k}</button>
  );
}

function SnippetKindTab({ k, label, count, active, onClick, dark, fg3 }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 5,
      border: '1px solid ' + (active ? (dark ? '#4A0E7A' : 'rgba(74,14,122,0.35)') : (dark ? '#2e2440' : 'var(--ac-dust)')),
      background: active ? (dark ? '#261e36' : 'rgba(74,14,122,0.08)') : 'transparent',
      color: active ? (dark ? '#c4a9e8' : '#4A0E7A') : fg3,
      fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: active ? 600 : 400, cursor: 'pointer',
    }}>
      {label}
      {count != null && <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, opacity: 0.7 }}>{count}</span>}
    </button>
  );
}

// ─── Trash View ──────────────────────────────────────────────────────────────
function TrashView({ clips, dark, onRestore, onPermanentDelete, onEmptyTrash }) {
  const T = useT();
  const fg1   = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2   = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3   = dark ? '#80738f' : 'var(--ac-fg-3)';
  const panel = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', gap: 12, flexShrink: 0,
        background: dark ? 'rgba(229,67,58,0.07)' : 'rgba(229,67,58,0.05)',
        borderBottom: '1px solid ' + (dark ? 'rgba(229,67,58,0.20)' : 'rgba(229,67,58,0.18)'),
      }}>
        <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 12, color: fg3, lineHeight: 1.4 }}>
          {clips.length === 0 ? T('trash.empty') : T('trash.banner')}
        </span>
        {clips.length > 0 && (
          <button
            onClick={() => { if (window.confirm(T('settings.storage.confirmEmpty'))) onEmptyTrash(); }}
            style={{
              padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(229,67,58,0.45)',
              background: 'transparent', color: 'var(--ac-danger)',
              fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
            {T('settings.storage.emptyTrash')}
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {clips.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8, padding: 32,
          }}>
            <Icon name="trash2" size={32} strokeWidth={1.25} style={{ color: fg3, opacity: 0.4 }} />
            <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, color: fg3, textAlign: 'center' }}>
              {T('trash.empty')}
            </div>
          </div>
        ) : clips.map(clip => (
          <div key={clip.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 14px',
            borderBottom: '1px solid ' + border,
          }}>
            <KindBadge kind={clip.kind} dark={dark} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: clip.kind === 'code' || clip.kind === 'url' ? 'var(--ac-font-mono)' : 'var(--ac-font-ui)',
                fontSize: 12.5, color: fg2, lineHeight: 1.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {clip.text.length > 120 ? clip.text.slice(0, 117) + '…' : clip.text}
              </div>
              {clip.deletedAt && (
                <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: fg3, marginTop: 2 }}>
                  {T('trash.deletedAt')} {new Date(clip.deletedAt).toLocaleDateString()}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => onRestore(clip.id)} style={{
                padding: '4px 9px', borderRadius: 5,
                background: 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust-strong)'),
                color: dark ? '#b9accd' : 'var(--ac-fg-2)',
                fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              }}>{T('trash.restore')}</button>
              <button onClick={() => onPermanentDelete(clip.id)} style={{
                padding: '4px 9px', borderRadius: 5,
                background: 'transparent',
                border: '1px solid rgba(229,67,58,0.35)',
                color: 'var(--ac-danger)',
                fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
              }}>{T('trash.deleteForever')}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SnippetsView({ snippets, dark, query, onAdd, onUpdate, onDelete, onLock, projects = [], projectAssignments = {}, onAssignItem }) {
  const T = useT();
  const fg1    = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2    = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';
  const panel  = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const hover2 = dark ? '#261e36' : 'var(--ac-plum-50)';
  const accent = '#FF6B00';
  const purple = '#4A0E7A';

  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText]   = useState('');
  const [formKind, setFormKind]   = useState('text');
  const [hoverId, setHoverId]     = useState(null);
  const [copiedId, setCopiedId]   = useState(null);
  const titleRef = useRef(null);
  const textRef  = useRef(null);

  const [activeKind, setActiveKind] = useState(null);

  const filtered = useMemo(() => {
    let list = snippets;
    if (activeKind) list = list.filter(s => s.kind === activeKind);
    if (!query?.trim()) return list;
    const q = normalize(query);
    return list.filter(s =>
      normalize(s.title).includes(q) || normalize(s.text).includes(q)
    );
  }, [snippets, query, activeKind]);

  const openForm = (snippet = null) => {
    setEditId(snippet ? snippet.id : null);
    setFormTitle(snippet ? snippet.title : '');
    setFormText(snippet ? snippet.text : '');
    setFormKind(snippet ? snippet.kind : (activeKind || 'text'));
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); };

  const submit = async () => {
    if (!formText.trim()) return;
    const title = formTitle.trim() || formText.slice(0, 60);
    if (editId) {
      onUpdate(editId, { title, text: formText.trim(), kind: formKind });
    } else {
      await onAdd(title, formText.trim(), formKind);
    }
    closeForm();
  };

  const copy = (s) => {
    navigator.clipboard.writeText(s.text).catch(() => {});
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  const kindStyle = {
    text:   { bg: dark ? '#261e36' : '#ede7f6',   fg: dark ? '#b9accd' : '#4A0E7A' },
    code:   { bg: dark ? '#1a2440' : '#e8f0ff',   fg: dark ? '#7ba3e0' : '#3060b0' },
    link:   { bg: dark ? '#1a2e28' : '#e6f4ed',   fg: dark ? '#5fb896' : '#1a7a4a' },
    prompt: { bg: dark ? '#2e1a10' : '#fff3e8',   fg: dark ? '#FF8A33' : '#b34a02' },
  };

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Kind filter tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <SnippetKindTab k={null} label="All" count={snippets.length} active={!activeKind}
          onClick={() => setActiveKind(null)} dark={dark} fg3={fg3} />
        {['text', 'code', 'link', 'prompt'].map(k => (
          <SnippetKindTab key={k} k={k} label={k}
            count={snippets.filter(s => s.kind === k).length}
            active={activeKind === k}
            onClick={() => setActiveKind(activeKind === k ? null : k)}
            dark={dark} fg3={fg3} />
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: fg3, flex: 1,
        }}>{activeKind ? activeKind : 'All'} · {filtered.length}</div>
        {!showForm && (
          <button onClick={() => openForm()} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 6,
            background: accent, color: '#fff', border: 0,
            fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <Icon name="plus" size={11} strokeWidth={2.5} /> New snippet
          </button>
        )}
      </div>

      {/* Add / edit form */}
      {showForm && (
        <div style={{
          background: panel, border: '1px solid ' + border,
          borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <input
            ref={titleRef}
            autoFocus={!editId}
            value={formTitle}
            onChange={e => setFormTitle(e.target.value)}
            placeholder="Title (optional)"
            style={{
              background: dark ? '#261e36' : 'var(--ac-paper-deep)',
              border: '1px solid ' + border, borderRadius: 6,
              padding: '7px 10px', fontFamily: 'var(--ac-font-ui)', fontSize: 13,
              fontWeight: 500, color: fg1, outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          <textarea
            ref={textRef}
            autoFocus={!!editId}
            value={formText}
            onChange={e => setFormText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') closeForm();
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="Content…"
            rows={4}
            style={{
              background: dark ? '#261e36' : 'var(--ac-paper-deep)',
              border: '1px solid ' + border, borderRadius: 6,
              padding: '7px 10px', fontFamily: 'var(--ac-font-mono)', fontSize: 12.5,
              color: fg1, outline: 'none', resize: 'vertical',
              width: '100%', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: fg3, marginRight: 2 }}>Kind:</span>
            {['text','code','link','prompt'].map(k => (
              <SnippetKindBtn key={k} k={k} activeKind={formKind} onChange={setFormKind} accent={accent} dark={dark} fg2={fg2} />
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={closeForm} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid ' + border,
              background: 'transparent', color: fg2,
              fontFamily: 'var(--ac-font-ui)', fontSize: 12, cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={submit} disabled={!formText.trim()} style={{
              padding: '5px 12px', borderRadius: 6, border: 0,
              background: formText.trim() ? purple : (dark ? '#2e2440' : 'var(--ac-plum-100)'),
              color: formText.trim() ? '#fff' : fg3,
              fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600,
              cursor: formText.trim() ? 'pointer' : 'default',
            }}>{editId ? 'Update' : 'Save'}</button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 && !showForm ? (
        <EmptyState dark={dark} iconName="bookmark" title="No snippets yet"
          body="Save reusable text, code, or links for quick access." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map(s => {
            const ks = kindStyle[s.kind] || kindStyle.text;
            return (
              <div
                key={s.id}
                onMouseEnter={() => setHoverId(s.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  background: hoverId === s.id ? hover2 : panel,
                  border: '1px solid ' + border,
                  borderRadius: 8, padding: '10px 12px',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  transition: 'background 120ms',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: 4,
                      background: ks.bg, color: ks.fg,
                      fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, fontWeight: 500,
                    }}>{s.kind}</span>
                    <span style={{
                      fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 600, color: fg1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{s.title}</span>
                  </div>
                  {s.kind === 'link' ? (
                    <button
                      onClick={() => window.anarchive?.system?.openExternal?.(s.text.trim())}
                      style={{
                        background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'var(--ac-font-mono)', fontSize: 11.5, color: dark ? '#7ba3e0' : '#3060b0',
                        lineHeight: 1.45, wordBreak: 'break-all', textDecoration: 'underline',
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}
                    >{s.text}</button>
                  ) : (
                    <div style={{
                      fontFamily: s.kind === 'code' ? 'var(--ac-font-mono)' : 'var(--ac-font-serif)',
                      fontSize: 11.5, color: fg2, lineHeight: 1.45,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{s.text}</div>
                  )}
                </div>
                {hoverId === s.id && (
                  <div style={{ display: 'flex', gap: 4, flex: 'none', paddingTop: 1 }}>
                    {s.kind === 'link' && (
                      <button onClick={() => window.anarchive?.system?.openExternal?.(s.text.trim())} title="Open in browser" style={{
                        width: 26, height: 26, borderRadius: 5, border: 0, cursor: 'pointer',
                        background: dark ? '#1a2e28' : '#e6f4ed', color: dark ? '#5fb896' : '#1a7a4a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><Icon name="externalLink" size={12} strokeWidth={2.25} /></button>
                    )}
                    <button onClick={() => copy(s)} title="Copy" style={{
                      width: 26, height: 26, borderRadius: 5, border: 0, cursor: 'pointer',
                      background: copiedId === s.id ? '#6b7c3b' : (dark ? '#2e2440' : 'var(--ac-plum-50)'),
                      color: copiedId === s.id ? '#fff' : fg2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Icon name={copiedId === s.id ? 'check' : 'copy'} size={12} strokeWidth={2.25} /></button>
                    <button onClick={() => openForm(s)} title="Edit" style={{
                      width: 26, height: 26, borderRadius: 5, border: 0, cursor: 'pointer',
                      background: dark ? '#2e2440' : 'var(--ac-plum-50)', color: fg2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Icon name="pencil" size={12} strokeWidth={2.25} /></button>
                    {onLock && (
                      <button onClick={() => onLock(s.id, !s.locked)} title={s.locked ? 'Unlock' : 'Lock'} style={{
                        width: 26, height: 26, borderRadius: 5, border: 0, cursor: 'pointer',
                        background: s.locked ? (dark ? '#1f2e1f' : '#eef0dc') : (dark ? '#2e2440' : 'var(--ac-plum-50)'),
                        color: s.locked ? (dark ? '#a3c777' : '#4a5621') : fg3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><Icon name="shieldCheck" size={12} strokeWidth={2.25} /></button>
                    )}
                    {!s.locked && (
                      <button onClick={() => onDelete(s.id)} title="Delete" style={{
                        width: 26, height: 26, borderRadius: 5, border: 0, cursor: 'pointer',
                        background: dark ? '#2e2440' : 'var(--ac-plum-50)', color: fg3,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}><Icon name="trash" size={12} strokeWidth={2.25} /></button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================
// Status bar
// =============================================================
function StatusBar({ dark, count, unit, vaultPath = '~/Anarchive' }) {
  const T = useT();
  const panel  = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';
  const [shortcutKeys, setShortcutKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ac.shortcut') || '["Alt","Space"]'); } catch { return ['Alt', 'Space']; }
  });
  useEffect(() => {
    const handler = (e) => setShortcutKeys(e.detail);
    window.addEventListener('ac:shortcutChanged', handler);
    return () => window.removeEventListener('ac:shortcutChanged', handler);
  }, []);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px',
      background: panel, borderTop: '1px solid ' + border,
      fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: fg3, flex: 'none',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: '#4ade80' }} />
        <span>{count} {unit}</span>
      </span>
      <span>·</span>
      <span>{T('status.storage')} {vaultPath}</span>
      <div style={{ flex: 1 }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {T('status.openFrom')} {shortcutKeys.map(k => <Kbd key={k} dark={dark}>{k}</Kbd>)} {T('status.openFromSuffix')}
      </span>
    </div>
  );
}

// =============================================================
// Root App
// =============================================================
export default function App() {
  const [view, setView] = useState(() => {
    if (window.anarchive && !localStorage.getItem('ac.onboardingDone')) return 'onboarding';
    return 'full';
  });
  // Theme, lang, isMac, toasts — global state via Zustand store.
  const {
    theme, setTheme, lang, setLang,
    isMac, setIsMac,
    shareToast, setShareToast,
    easterToast, setEasterToast,
    easterGifVisible, setEasterGifVisible,
  } = useAppStore();
  // Keep utils.formatAgo lang in sync on mount
  useEffect(() => { setCurrentLang(lang); }, [lang]);

  // Workspace state (multi-tab, navigation history, per-tab filters) — extracted to useWorkspace.
  const {
    workspaces, setWorkspaces, activeWorkspaceId,
    switchWorkspace, addWorkspace, closeWorkspace,
    history, setHistory, forwardHistory, setForwardHistory,
    tab, setTab, filter, setFilter, fileFilter, setFileFilter,
    query, setQuery, openedFile, setOpenedFile, activeProject, setActiveProject,
    tagFilter, setTagFilter, snapshotCurrent: _snapshotCurrent,
  } = useWorkspace();
  const [selClip, setSelClip] = useState(0);
  const [selFile, setSelFile] = useState(null);

  const { clips, setClips, trashedClips, setTrashedClips, files, setFiles, ready } = useVault();
  const { projects, addProject, renameProject, updateProjectEmoji, deleteProject: _rawDeleteProject } = useProjects();
  // A9: when deleting a project, sweep all workspaces and clear stale activeProject
  const deleteProject = (id) => {
    _rawDeleteProject(id);
    setWorkspaces(ws => ws.map(w => w.activeProject === id ? { ...w, activeProject: null } : w));
    if (activeProject === id) { setActiveProject(null); setOpenedFile(null); }
  };
  const { assignments: projectAssignments, assignItem: onAssignItem } = useProjectAssignments();

  const [snippets, setSnippets] = useState([]);
  const [vaultPath, setVaultPath] = useState('~/Anarchive');

  useEffect(() => {
    if (window.anarchive) {
      window.anarchive.vault.getPath().then(p => { if (p) setVaultPath(p); }).catch(() => {});
      window.anarchive.snippets?.list().then(setSnippets).catch(() => {});
    }
  }, []);

  const handleAddSnippet = async (title, text, kind, sectionId = null) => {
    if (!window.anarchive?.snippets) return;
    const s = await window.anarchive.snippets.add(title, text, kind).catch(() => null);
    if (s) {
      if (sectionId) {
        await window.anarchive.snippets.update(s.id, { sectionId }).catch(() => {});
        s.sectionId = sectionId;
      }
      setSnippets(prev => [s, ...prev]);
    }
    return s;
  };
  const handleUpdateSnippet = async (id, patch) => {
    if (!window.anarchive?.snippets) return;
    await window.anarchive.snippets.update(id, patch).catch(() => {});
    setSnippets(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };
  const handleDeleteSnippet = async (id) => {
    if (!askConfirm(t(lang, 'actions.delete') + '?')) return;
    if (!window.anarchive?.snippets) return;
    await window.anarchive.snippets.delete(id).catch(() => {});
    setSnippets(prev => prev.filter(s => s.id !== id));
  };

  // showEasterToast — dismiss timer lives in a ref so React Strict Mode's
  // effect-cleanup cycle can't cancel it before it fires.
  const _easterDismissTimer = useRef(null);
  const _easterGifTimer     = useRef(null);
  const showEasterToast = useCallback((msg, durationMs = 2400, withGif = false) => {
    setEasterToast(msg);
    if (withGif) {
      setEasterGifVisible(true);
      clearTimeout(_easterGifTimer.current);
      _easterGifTimer.current = setTimeout(() => setEasterGifVisible(false), durationMs + 400);
    }
    clearTimeout(_easterDismissTimer.current);
    _easterDismissTimer.current = setTimeout(
      () => setEasterToast(prev => (prev === msg ? null : prev)),
      durationMs
    );
  }, [setEasterToast, setEasterGifVisible]);
  useEffect(() => () => {
    clearTimeout(_easterGifTimer.current);
  }, []);
  const _logoMsgIdx = useRef(-1);
  const handleLogoEgg = useCallback(() => {
    const cfg = EASTER_EGGS.logoSpin;
    const { msg, index } = pickMessage(cfg.messages, _logoMsgIdx.current);
    _logoMsgIdx.current = index;
    showEasterToast(msg, cfg.toastDurationMs);
  }, [showEasterToast]);

  // Easter egg 5 — clip-count milestones, one-shot per value, persisted.
  // We track the previous count in a ref so the first mount doesn't trigger
  // milestones the user has already passed historically.
  const _prevClipCount = useRef(null);
  const _shownMilestones = useRef(readShownMilestones());
  const [milestoneBadgeValue, setMilestoneBadgeValue] = useState(null);
  useEffect(() => {
    const newCount = clips?.length ?? 0;
    const oldCount = _prevClipCount.current;
    if (oldCount === null) {
      // First observed count: also mark every already-passed milestone as shown,
      // so they can't fire later if user trims and re-grows the archive.
      const past = EASTER_EGGS.clipMilestones.milestones.filter(m => newCount >= m.value);
      past.forEach(m => _shownMilestones.current.add(m.value));
      persistShownMilestones(_shownMilestones.current);
      _prevClipCount.current = newCount;
      return;
    }
    const crossed = milestonesCrossed(oldCount, newCount, _shownMilestones.current);
    if (crossed.length > 0) {
      // Fire the highest milestone crossed in this update (rare: only one usually)
      const m = crossed[crossed.length - 1];
      _shownMilestones.current.add(m.value);
      persistShownMilestones(_shownMilestones.current);
      setMilestoneBadgeValue(m.value);
      showEasterToast(m.msg, EASTER_EGGS.clipMilestones.toastDurationMs);
      setTimeout(() => setMilestoneBadgeValue(prev => (prev === m.value ? null : prev)),
        EASTER_EGGS.clipMilestones.badgeDurationMs);
    }
    _prevClipCount.current = newCount;
  }, [clips, showEasterToast]);

  // Easter egg 10 — track consecutive aborted drag-outs.
  const _dragoutAborts = useRef(0);
  useEffect(() => {
    if (!EASTER_EGGS.dragoutAbort.enabled) return;
    const onDragEnd = (e) => {
      // dropEffect 'none' means the drag was cancelled or dropped on a non-target.
      // Only count it as an abort if the drag was actually initiated from the app
      // (we use the presence of our app's MIME type when set, otherwise we rely
      // on dropEffect alone — safe since browsers reset it per-drag).
      const dropEffect = e?.dataTransfer?.dropEffect;
      if (dropEffect === 'none') {
        _dragoutAborts.current += 1;
        if (_dragoutAborts.current >= EASTER_EGGS.dragoutAbort.threshold) {
          _dragoutAborts.current = 0;
          showEasterToast(EASTER_EGGS.dragoutAbort.message, EASTER_EGGS.dragoutAbort.durationMs, true);
        }
      } else {
        _dragoutAborts.current = 0;
      }
    };
    window.addEventListener('dragend', onDragEnd);
    return () => window.removeEventListener('dragend', onDragEnd);
  }, [showEasterToast]);
  useEffect(() => {
    if (window.anarchive?.system?.isMac) {
      window.anarchive.system.isMac().then(setIsMac).catch(() => setIsMac(false));
    } else {
      setIsMac(/Mac/i.test(navigator.platform || ''));
    }
  }, []);
  const handleShareFile = async (file) => {
    if (!file?.path) { setShareToast('Path not available'); setTimeout(() => setShareToast(null), 2400); return; }
    if (!window.anarchive?.vault?.shareFile) {
      setShareToast('Share: disponibile nell\'app installata.');
      setTimeout(() => setShareToast(null), 2400);
      return;
    }
    const r = await window.anarchive.vault.shareFile(file.path).catch(() => ({ success: false, error: 'invoke-error' }));
    if (!r?.success) {
      const map = {
        'file-not-found':       'File not found on disk',
        'forbidden':            'Path outside vault — share blocked',
        'helper-unavailable':   'Share helper not available (swiftc missing?)',
        'unsupported-platform': 'Share is only available on macOS',
        'invalid-path':         'Path not available',
      };
      setShareToast(map[r?.error] || `Share error: ${r?.error || 'unknown'}`);
      setTimeout(() => setShareToast(null), 2800);
    }
  };

  // A7: pinnedPrompts reactive to togglePinPrompt events
  const _readPinnedPrompts = () => {
    try {
      const all = JSON.parse(localStorage.getItem('ac.project-prompts') || '{}');
      return Object.values(all).flat().filter(p => p.pinned).slice(0, 6);
    } catch { return []; }
  };
  const [pinnedPrompts, setPinnedPrompts] = useState(_readPinnedPrompts);
  useEffect(() => {
    const handler = () => setPinnedPrompts(_readPinnedPrompts());
    window.addEventListener('ac:pinnedPromptsChanged', handler);
    return () => window.removeEventListener('ac:pinnedPromptsChanged', handler);
  }, []);

  // A2: track and persist user-chosen window size for full view
  useEffect(() => {
    if (!window.anarchive) return;
    let raf = null;
    const onResize = () => {
      if (view !== 'full') return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        try {
          localStorage.setItem('ac.fullWindowSize', JSON.stringify({ w: window.innerWidth, h: window.innerHeight }));
        } catch {}
      });
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); if (raf) cancelAnimationFrame(raf); };
  }, [view]);

  const _restoreFullSize = () => {
    if (!window.anarchive?.window?.setSize) return;
    try {
      const raw = localStorage.getItem('ac.fullWindowSize');
      if (raw) {
        const { w, h } = JSON.parse(raw);
        if (w >= 540 && h >= 300) { window.anarchive.window.setSize(w, h); return; }
      }
    } catch {}
    window.anarchive.window.setSize(980, 680);
  };

  const _restoreLauncherSize = () => {
    if (!window.anarchive?.window?.setSize) return;
    const ss = localStorage.getItem('ac.launcher.showSS') === 'true';
    const pt = localStorage.getItem('ac.launcher.showPrompts') === 'true';
    const cols = (ss ? 1 : 0) + (pt ? 1 : 0);
    window.anarchive.window.setSize(540 + cols * 110 + 10, 560);
  };

  useEffect(() => {
    if (!window.anarchive) return;
    const unsub = window.anarchive.window.onSetView((payload) => {
      const v = typeof payload === 'object' && payload !== null ? payload.view : payload;
      // A12: snapshot current state into active workspace before mutating
      setWorkspaces(ws => ws.map(w => w.id === activeWorkspaceId
        ? { ...w, ..._snapshotCurrent() }
        : w
      ));
      setOpenedFile(null);
      setActiveProject(null);
      setView(v);
      if (v === 'launcher') {
        _restoreLauncherSize();
      }
      if (v === 'full') {
        _restoreFullSize();
        if (typeof payload === 'object' && payload !== null) {
          if (payload.tab) setTab(payload.tab);
          if (payload.filter) setFilter(payload.filter);
          if (payload.fileFilter) setFileFilter(payload.fileFilter);
        }
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId, tab, filter, fileFilter, query, activeProject, openedFile, tagFilter, history]);

  // Live-sync theme/lang changes from the settings window.
  useEffect(() => {
    if (!window.anarchive?.window.onBroadcast) return;
    return window.anarchive.window.onBroadcast((patch) => {
      if ('theme' in patch) setTheme(patch.theme);
      if ('lang'  in patch) setLang(patch.lang);
    });
  }, [setTheme, setLang]);

  // "Match system" — read prefers-color-scheme and update live when the OS changes appearance.
  const [systemTheme, setSystemTheme] = useState(() => {
    try {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch { return 'light'; }
  });
  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemTheme(e.matches ? 'dark' : 'light');
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else if (mql.addListener) mql.addListener(handler); // Safari < 14 fallback
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else if (mql.removeListener) mql.removeListener(handler);
    };
  }, []);
  const effectiveTheme = theme === 'auto' ? systemTheme : theme;

  // Navigation actions — extracted to useRouter.
  const { navigateTo, jumpTo, openProject, openFileDetail, goBack, goForward, canGoBack, canGoForward } = useRouter({
    view, setView,
    history, setHistory, forwardHistory, setForwardHistory,
    activeProject, setActiveProject,
    openedFile, setOpenedFile,
    tab, setTab, filter, setFilter,
    workspaces, activeWorkspaceId, switchWorkspace,
  });

  const isDemoMode = !window.anarchive;

  // Full view is edge-to-edge (no purple backdrop) so the window has no visible gaps.
  // Compact views (launcher, onboarding, settings) keep the centered modal feel.
  const fullEdgeToEdge = view === 'full';
  return (
    <LangContext.Provider value={lang}>
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 30% 20%, #b9accd 0%, #80738f 35%, #2a0e3f 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: fullEdgeToEdge ? 0 : 32,
        fontFamily: 'var(--ac-font-ui)',
      }}>
        {view === 'onboarding' && <OnboardingView onFinish={() => jumpTo('launcher')} />}
        {view === 'launcher'   && <LauncherView   clips={clips} files={files} theme={effectiveTheme}
                                    onExpand={() => {
                                      // Full view is the stopping point — Back must not return to launcher
                                      setHistory([]);
                                      setOpenedFile(null); setActiveProject(null);
                                      setView('full'); _restoreFullSize();
                                      // Launcher runs sticky; explicitly unpin when expanding so the
                                      // full window starts unpinned (matching React's pinned default of false).
                                      window.anarchive?.window.setAlwaysOnTop(false);
                                    }}
                                    lang={lang}
                                    projects={projects}
                                    tags={(() => { try { return JSON.parse(localStorage.getItem('ac.tags') || '[]'); } catch { return []; } })()}
                                    pinnedPrompts={pinnedPrompts}
                                    onOpenProject={(pid) => {
                                      const snapshot = workspaces.map(w => w.id === activeWorkspaceId ? { ...w, activeProject } : w);
                                      const existing = snapshot.find(w => w.id !== activeWorkspaceId && w.activeProject === pid);
                                      if (existing) { switchWorkspace(existing.id); setView('full'); _restoreFullSize(); return; }
                                      setHistory([]); // launcher never appears as a back target
                                      setOpenedFile(null); setActiveProject(pid);
                                      setView('full'); _restoreFullSize();
                                    }}
                                    onOpenTag={(tag) => {
                                      setHistory([]);
                                      setOpenedFile(null); setActiveProject(null);
                                      setTab('drop'); setTagFilter(tag);
                                      setView('full'); _restoreFullSize();
                                    }}
                                    onOpenFile={(f) => {
                                      setHistory([]);
                                      setOpenedFile(f.id);
                                      setView('full'); _restoreFullSize();
                                    }}
                                    onAddFile={(f) => setFiles(prev => [f, ...prev.filter(x => x.id !== f.id)])}
                                    onOpenBundle={(clip) => setBundleClip(clip)} />}
        {view === 'menubar'    && <MenuBarView clips={clips}
                                    onOpenFull={() => jumpTo('full')}
                                    onOpenSettings={() => {
                                      console.log('[settings] gear clicked. anarchive=%s, openSettingsWindow=%s',
                                        !!window.anarchive, !!window.anarchive?.window?.openSettingsWindow);
                                      if (window.anarchive?.window?.openSettingsWindow) {
                                        window.anarchive.window.openSettingsWindow();
                                      } else {
                                        navigateTo('settings');
                                      }
                                    }}
                                    onQuit={() => jumpTo('onboarding')} />}
        {view === 'full'       && <FullView
                                    clips={clips} trashedClips={trashedClips} setTrashedClips={setTrashedClips} files={files} setClips={setClips} setFiles={setFiles} ready={ready}
                                    snippets={snippets}
                                    onAddSnippet={handleAddSnippet}
                                    onUpdateSnippet={handleUpdateSnippet}
                                    onDeleteSnippet={handleDeleteSnippet}
                                    theme={effectiveTheme} onTheme={setTheme}
                                    onCollapse={() => jumpTo('launcher')}
                                    onOpenSettings={() => {
                                      console.log('[settings] gear clicked. anarchive=%s, openSettingsWindow=%s',
                                        !!window.anarchive, !!window.anarchive?.window?.openSettingsWindow);
                                      if (window.anarchive?.window?.openSettingsWindow) {
                                        window.anarchive.window.openSettingsWindow();
                                      } else {
                                        navigateTo('settings');
                                      }
                                    }}
                                    tab={tab} setTab={setTab}
                                    filter={filter} setFilter={setFilter}
                                    fileFilter={fileFilter} setFileFilter={setFileFilter}
                                    query={query} setQuery={setQuery}
                                    selClip={selClip} setSelClip={setSelClip}
                                    selFile={selFile} setSelFile={setSelFile}
                                    openedFile={openedFile}
                                    onOpenFile={openFileDetail}
                                    onCloseFile={() => goBack()}
                                    canGoBack={canGoBack} onBack={goBack} canGoForward={canGoForward} onForward={goForward} vaultPath={vaultPath} lang={lang}
                                    projects={projects} activeProject={activeProject} setActiveProject={openProject}
                                    projectAssignments={projectAssignments} onAssignItem={onAssignItem}
                                    addProject={addProject} renameProject={renameProject}
                                    updateProjectEmoji={updateProjectEmoji} deleteProject={deleteProject}
                                    tagFilter={tagFilter} setTagFilter={setTagFilter}
                                    workspaces={workspaces} activeWorkspaceId={activeWorkspaceId}
                                    onSwitchWorkspace={switchWorkspace}
                                    onAddWorkspace={addWorkspace}
                                    onCloseWorkspace={closeWorkspace}
                                    isMac={isMac}
                                    onShareFile={handleShareFile}
                                    onLogoEgg={handleLogoEgg} />}
        {view === 'settings'   && <SettingsView
                                    theme={theme} onTheme={setTheme}
                                    onClose={goBack}
                                    canGoBack={canGoBack} onBack={goBack}
                                    lang={lang} onLang={setLang} />}

        {/* Share error toast */}
        {shareToast && (
          <div style={{
            position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 18px', borderRadius: 8, zIndex: 1000,
            background: 'rgba(31,14,46,0.92)', color: '#fff',
            fontFamily: 'var(--ac-font-ui)', fontSize: 12.5,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,107,0,0.4)',
          }}>{shareToast}</div>
        )}

        {/* Easter-egg toast — slim, slightly playful, sits a hair higher */}
        {easterToast && (
          <div style={{
            position: 'fixed', bottom: 26, left: '50%',
            transform: 'translateX(-50%)',
            padding: '9px 18px', borderRadius: 999, zIndex: 1001,
            background: 'rgba(31,14,46,0.95)',
            color: '#FF8A33',
            fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 13,
            boxShadow: '0 10px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,138,51,0.30)',
            animation: 'acQuoteFadeIn 280ms cubic-bezier(0.22,0.61,0.36,1) both',
            pointerEvents: 'none', userSelect: 'none',
            maxWidth: 480, textAlign: 'center',
          }}>{easterToast}</div>
        )}

        {/* Dragout abort GIF — appears alongside the toast */}
        {easterGifVisible && (
          <div style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1002, pointerEvents: 'none',
            animation: 'acQuoteFadeIn 300ms cubic-bezier(0.22,0.61,0.36,1) both',
          }}>
            <img
              src={jarEasterGif}
              alt=""
              style={{
                width: 180, height: 'auto', borderRadius: 10,
                boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,138,51,0.25)',
              }}
            />
          </div>
        )}

        {/* Floating mode strip — demo switcher */}
        {isDemoMode && (
          <div style={{
            position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 4, padding: 4, borderRadius: 999,
            background: 'rgba(31,14,46,0.72)', backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500,
            zIndex: 500,
          }}>
            <span style={{
              fontFamily: 'var(--ac-font-mono)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(255,138,51,0.85)', padding: '2px 8px 2px 6px',
              borderRight: '1px solid rgba(255,255,255,0.12)',
            }}>demo</span>
            {[
              ['onboarding', 'Onboarding'],
              ['launcher',   'Launcher'],
              ['menubar',    'Menu bar'],
              ['full',       'Full window'],
              ['settings',   'Settings'],
            ].map(([k, label]) => (
              <button key={k} onClick={() => jumpTo(k)} style={{
                background: view === k ? '#FF6B00' : 'transparent',
                color: view === k ? '#fff' : 'rgba(243,238,249,0.8)',
                border: 0, borderRadius: 999, padding: '6px 12px',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit',
                whiteSpace: 'nowrap',
              }}>{label}</button>
            ))}
            {(view === 'full' || view === 'settings') && (
              <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{
                background: 'transparent', color: 'rgba(243,238,249,0.8)',
                border: 0, borderLeft: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 0, padding: '6px 12px',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit',
              }}>
                <Icon name={effectiveTheme === 'dark' ? 'sun' : 'moon'} size={12} strokeWidth={2} />
                {effectiveTheme === 'dark' ? 'light' : 'dark'}
              </button>
            )}
          </div>
        )}
      </div>
    </LangContext.Provider>
  );
}
