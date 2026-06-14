import { useState } from 'react';

const DEFAULT_EMOJI = '📁';

function _newUUID() {
  return crypto.randomUUID?.() ?? ('id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
}

/**
 * Persisted list of user-created project areas.
 * Stored entirely in localStorage (renderer-only, no IPC).
 *
 * @returns {{ projects: object[], addProject: Function, renameProject: Function, updateProjectEmoji: Function, deleteProject: Function }}
 */
export function useProjects() {
  const [projects, setProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ac.projects') || '[]'); } catch { return []; }
  });

  const save = (updater) => setProjects(prev => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    try { localStorage.setItem('ac.projects', JSON.stringify(next)); } catch {}
    return next;
  });

  const addProject = (name, emoji = DEFAULT_EMOJI) => {
    const p = { id: _newUUID(), name: name.trim(), emoji, at: Date.now() };
    save(prev => [...prev, p]);
    return p;
  };
  const renameProject    = (id, name)  => save(prev => prev.map(p => p.id === id ? { ...p, name }  : p));
  const updateProjectEmoji = (id, emoji) => save(prev => prev.map(p => p.id === id ? { ...p, emoji } : p));
  const deleteProject    = (id)        => save(prev => prev.filter(p => p.id !== id));

  return { projects, addProject, renameProject, updateProjectEmoji, deleteProject };
}

/**
 * Maps item IDs to project IDs. Persisted in localStorage.
 *
 * @returns {{ assignments: object, assignItem: Function, unassignItem: Function }}
 */
export function useProjectAssignments() {
  const [assignments, setAssignments] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ac.project-items') || '{}'); } catch { return {}; }
  });

  const save = (updater) => setAssignments(prev => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    try { localStorage.setItem('ac.project-items', JSON.stringify(next)); } catch {}
    return next;
  });

  const assignItem = (itemId, projectId) => save(prev =>
    projectId == null
      ? (() => { const n = { ...prev }; delete n[itemId]; return n; })()
      : { ...prev, [itemId]: projectId }
  );
  const unassignItem = (itemId) => save(prev => { const n = { ...prev }; delete n[itemId]; return n; });

  return { assignments, assignItem, unassignItem };
}
