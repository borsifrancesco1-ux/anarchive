import { useState, useEffect } from 'react';

const DEFAULT_WS = {
  id: 'ws-default',
  tab: 'clipboard', filter: 'all', fileFilter: 'all',
  query: '', activeProject: null, openedFile: null, tagFilter: null,
  history: [],
};

function _newId(prefix = 'ws') {
  return crypto.randomUUID?.() ?? (prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2));
}

/**
 * Manages multi-workspace state and per-workspace navigation history.
 * Each workspace carries its own tab/filter/history slice.
 * Workspace list and active ID are persisted in localStorage.
 *
 * @returns workspace state and actions for use in App.jsx
 */
export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState(() => {
    try {
      const raw = localStorage.getItem('ac.workspaces');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(w => ({ ...DEFAULT_WS, ...w, history: Array.isArray(w.history) ? w.history : [] }));
        }
      }
    } catch {}
    return [DEFAULT_WS];
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    try {
      const saved = localStorage.getItem('ac.activeWorkspaceId');
      if (saved) return saved;
    } catch {}
    return 'ws-default';
  });

  // Hydrate per-workspace state from the active workspace on first mount
  const initialActive = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0] || DEFAULT_WS;

  const [history, setHistory]           = useState(initialActive.history || []);
  const [forwardHistory, setForwardHistory] = useState([]);
  const [tab, setTab]                   = useState(initialActive.tab);
  const [filter, setFilter]             = useState(initialActive.filter);
  const [fileFilter, setFileFilter]     = useState(initialActive.fileFilter);
  const [query, setQuery]               = useState(initialActive.query);
  const [openedFile, setOpenedFile]     = useState(initialActive.openedFile);
  const [activeProject, setActiveProject] = useState(initialActive.activeProject);
  const [tagFilter, setTagFilter]       = useState(initialActive.tagFilter ?? null);

  useEffect(() => {
    try { localStorage.setItem('ac.workspaces', JSON.stringify(workspaces)); } catch {}
  }, [workspaces]);

  useEffect(() => {
    try { localStorage.setItem('ac.activeWorkspaceId', activeWorkspaceId); } catch {}
  }, [activeWorkspaceId]);

  // Captures current per-workspace state into a plain object for snapshotting.
  const snapshotCurrent = (extra = {}) => ({
    tab, filter, fileFilter, query, activeProject, openedFile, tagFilter, history, ...extra,
  });

  const switchWorkspace = (targetId) => {
    if (targetId === activeWorkspaceId) return;
    const target = workspaces.find(w => w.id === targetId);
    if (!target) return;
    setWorkspaces(ws => ws.map(w => w.id === activeWorkspaceId
      ? { ...w, ...snapshotCurrent() }
      : w
    ));
    setActiveWorkspaceId(targetId);
    setTab(target.tab);
    setFilter(target.filter);
    setFileFilter(target.fileFilter);
    setQuery(target.query);
    setActiveProject(target.activeProject);
    setOpenedFile(target.openedFile);
    setTagFilter(target.tagFilter ?? null);
    setHistory(Array.isArray(target.history) ? target.history : []);
    setForwardHistory([]);
  };

  const addWorkspace = () => {
    const id = _newId('ws');
    setWorkspaces(ws => [
      ...ws.map(w => w.id === activeWorkspaceId ? { ...w, ...snapshotCurrent() } : w),
      { ...DEFAULT_WS, id },
    ]);
    setActiveWorkspaceId(id);
    setTab('clipboard');
    setFilter('all');
    setFileFilter('all');
    setQuery('');
    setActiveProject(null);
    setOpenedFile(null);
    setTagFilter(null);
    setHistory([]);
    setForwardHistory([]);
  };

  const closeWorkspace = (id) => {
    if (workspaces.length <= 1) return;
    const idx  = workspaces.findIndex(w => w.id === id);
    const next = workspaces.filter(w => w.id !== id);
    setWorkspaces(next);
    if (id === activeWorkspaceId) {
      const target = next[Math.max(0, idx - 1)];
      setActiveWorkspaceId(target.id);
      setTab(target.tab);
      setFilter(target.filter);
      setFileFilter(target.fileFilter);
      setQuery(target.query);
      setActiveProject(target.activeProject);
      setOpenedFile(target.openedFile);
      setTagFilter(target.tagFilter ?? null);
      setHistory(Array.isArray(target.history) ? target.history : []);
      setForwardHistory([]);
    }
  };

  return {
    // Workspace list
    workspaces, setWorkspaces, activeWorkspaceId,
    switchWorkspace, addWorkspace, closeWorkspace,
    // Per-workspace navigation stacks
    history, setHistory,
    forwardHistory, setForwardHistory,
    // Per-workspace UI state
    tab, setTab,
    filter, setFilter,
    fileFilter, setFileFilter,
    query, setQuery,
    openedFile, setOpenedFile,
    activeProject, setActiveProject,
    tagFilter, setTagFilter,
    // Snapshot helper for saving current state before a workspace switch
    snapshotCurrent,
  };
}
