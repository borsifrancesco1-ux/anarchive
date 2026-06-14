// data.js — Fake clipboard & file data for the Anarchive desktop UI kit.
// Loaded as a plain script; exposes window.AnarchiveData.

(function () {
  const now = Date.now();
  const m = (n) => now - n * 60 * 1000;
  const h = (n) => now - n * 60 * 60 * 1000;
  const d = (n) => now - n * 24 * 60 * 60 * 1000;

  const clips = [
    {
      id: 'c1', kind: 'text', at: m(2), pinned: false,
      text: '"What we cannot speak about we must pass over in silence."',
      app: 'Bear', meta: '58 chars',
    },
    {
      id: 'c2', kind: 'code', at: m(14), pinned: false, lang: 'js',
      text: 'const archive = (x) => store.push({ at: Date.now(), x });',
      app: 'VS Code', meta: 'js · 48 chars',
    },
    {
      id: 'c3', kind: 'url', at: h(1), pinned: true,
      text: 'https://www.are.na/anders/the-archive-is-a-feeling',
      app: 'Arc', meta: 'are.na',
    },
    {
      id: 'c4', kind: 'text', at: h(2), pinned: false,
      text: 'meeting notes — Q3 planning · prioritise A over B; revisit C in two weeks; D is dead.',
      app: 'Notes', meta: '88 chars',
    },
    {
      id: 'c5', kind: 'code', at: h(3), pinned: false, lang: 'sh',
      text: 'rsync -avh --progress ./public/ deploy@archive.local:/var/www/',
      app: 'Terminal', meta: 'shell · 64 chars',
    },
    {
      id: 'c6', kind: 'text', at: h(5), pinned: true,
      text: 'Marina — apartment access code is 4218#. Bring the small kettle.',
      app: 'Messages', meta: '60 chars',
    },
    {
      id: 'c7', kind: 'url', at: d(1), pinned: false,
      text: 'https://github.com/anders/anarchive/pull/142',
      app: 'GitHub', meta: 'github.com',
    },
    {
      id: 'c8', kind: 'text', at: d(1), pinned: false,
      text: 'the cool thing about archives is they outlast their librarians',
      app: 'Drafts', meta: '61 chars',
    },
    {
      id: 'c9', kind: 'code', at: d(2), pinned: false, lang: 'css',
      text: 'background: linear-gradient(135deg, #FF6B00, #4A0E7A);',
      app: 'Figma', meta: 'css · 50 chars',
    },
    {
      id: 'c10', kind: 'text', at: d(3), pinned: false,
      text: 'Books to look for at the strand: Susan Howe, Anne Carson (anything), the John Berger small one.',
      app: 'Drafts', meta: '94 chars',
    },
  ];

  const files = [
    { id: 'f1', name: 'sunset-print.png',   ext: 'PNG', kind: 'image',  at: m(2),   size: '1.2 MB',  color: 'linear-gradient(135deg,#FF6B00,#b34a02)' },
    { id: 'f2', name: 'contract-v3.pdf',    ext: 'PDF', kind: 'pdf',    at: m(9),   size: '340 KB',  color: null },
    { id: 'f3', name: 'notes-2026-05-26.md',ext: 'MD',  kind: 'text',   at: h(1),   size: '4 KB',    color: null },
    { id: 'f4', name: 'old-screenshots.zip',ext: 'ZIP', kind: 'archive',at: d(1),   size: '22 MB',   color: null },
    { id: 'f5', name: 'morning-fog.jpg',    ext: 'JPG', kind: 'image',  at: d(2),   size: '4.8 MB',  color: 'linear-gradient(180deg,#b9accd,#4A0E7A)' },
    { id: 'f6', name: 'invoice-q1.pdf',     ext: 'PDF', kind: 'pdf',    at: d(3),   size: '218 KB',  color: null },
    { id: 'f7', name: 'speech.m4a',         ext: 'M4A', kind: 'audio',  at: d(4),   size: '8.1 MB',  color: null },
    { id: 'f8', name: 'shelf-detail.heic',  ext: 'HEIC',kind: 'image',  at: d(5),   size: '3.4 MB',  color: 'linear-gradient(135deg,#FFC899,#5a2a78)' },
  ];

  function formatAgo(ts) {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 172800) return 'yesterday';
    return Math.floor(diff / 86400) + 'd ago';
  }

  window.AnarchiveData = { clips, files, formatAgo };
})();
