import { useMemo } from 'react';

function _restoreFullSize() {
  if (!window.anarchive?.window?.setSize) return;
  try {
    const raw = localStorage.getItem('ac.fullWindowSize');
    if (raw) {
      const { w, h } = JSON.parse(raw);
      if (w >= 540 && h >= 300) { window.anarchive.window.setSize(w, h); return; }
    }
  } catch {}
  window.anarchive.window.setSize(980, 680);
}

function _stateMatches(entry, v, ap, of_) {
  return entry.view === v
    && (entry.activeProject ?? null) === ap
    && (entry.openedFile ?? null) === of_;
}

/**
 * Navigation actions for Anarchive's multi-view stack.
 *
 * Accepts current workspace/view state and returns stable action callbacks.
 * History entries have shape: { view, activeProject, openedFile }.
 */
export function useRouter({
  view, setView,
  history, setHistory,
  forwardHistory, setForwardHistory,
  activeProject, setActiveProject,
  openedFile, setOpenedFile,
  tab, setTab,
  filter, setFilter,
  workspaces, activeWorkspaceId, switchWorkspace,
}) {
  const _isBackable = (e) =>
    e.view !== 'launcher' && !_stateMatches(e, view, activeProject, openedFile ?? null);

  const navigateTo = (next) => {
    if (next === view) return;
    setForwardHistory([]);
    setHistory(h => [...h, { view, activeProject, openedFile: openedFile ?? null }]);
    setView(next);
  };

  const jumpTo = (next) => {
    if (next === view && activeProject === null && openedFile === null && history.length === 0) return;
    setForwardHistory([]);
    setHistory([]);
    setOpenedFile(null);
    setActiveProject(null);
    setView(next);
    if (next === 'full') _restoreFullSize();
  };

  const openProject = (pid) => {
    if (!pid) {
      if (activeProject === null && openedFile === null) return;
      setForwardHistory([]);
      setHistory(h => [...h, { view, activeProject, openedFile: openedFile ?? null }]);
      setActiveProject(null);
      setOpenedFile(null);
      return;
    }
    if (activeProject === pid && openedFile === null) return;
    // If another workspace already has this project open, switch to it
    const snap = workspaces.map(w => w.id === activeWorkspaceId ? { ...w, activeProject } : w);
    const existing = snap.find(w => w.id !== activeWorkspaceId && w.activeProject === pid);
    if (existing) { switchWorkspace(existing.id); return; }
    setForwardHistory([]);
    setHistory(h => [...h, { view, activeProject, openedFile: openedFile ?? null }]);
    setActiveProject(pid);
    // CRITICAL: clear openedFile so ProjectView renders instead of FileDetailView
    setOpenedFile(null);
  };

  const openFileDetail = (id) => {
    if (!id) { setOpenedFile(null); return; }
    if (openedFile === id) return;
    setForwardHistory([]);
    setHistory(h => [...h, { view, activeProject, openedFile: openedFile ?? null }]);
    setOpenedFile(id);
  };

  const goBack = () => {
    setHistory(h => {
      if (h.length === 0) return h;
      let i = h.length - 1;
      while (i >= 0 && !_isBackable(h[i])) i--;
      if (i < 0) {
        setActiveProject(null);
        setTab('clipboard');
        setFilter('all');
        return [];
      }
      const prev = h[i];
      setForwardHistory(fh => [...fh, { view, activeProject, openedFile: openedFile ?? null }]);
      setView(prev.view);
      setActiveProject(prev.activeProject ?? null);
      setOpenedFile(prev.openedFile ?? null);
      if (prev.view === 'full') _restoreFullSize();
      return h.slice(0, i);
    });
  };

  const goForward = () => {
    setForwardHistory(fh => {
      if (fh.length === 0) return fh;
      const next = fh[fh.length - 1];
      setHistory(h => [...h, { view, activeProject, openedFile: openedFile ?? null }]);
      setView(next.view);
      setActiveProject(next.activeProject ?? null);
      setOpenedFile(next.openedFile ?? null);
      if (next.view === 'full') _restoreFullSize();
      return fh.slice(0, -1);
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canGoBack = useMemo(() => history.length > 0 && history.some(_isBackable), [history, view, activeProject, openedFile]);
  const canGoForward = useMemo(() => forwardHistory.length > 0, [forwardHistory]);

  return { navigateTo, jumpTo, openProject, openFileDetail, goBack, goForward, canGoBack, canGoForward };
}
