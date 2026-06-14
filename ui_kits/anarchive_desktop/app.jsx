// app.jsx — Main interactive Anarchive desktop demo.
// Mounts <App /> on #root.
// Loaded with <script type="text/babel" src="app.jsx"></script> AFTER components.jsx.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// =============================================================
// Launcher view — Spotlight-style compact window
// =============================================================
function LauncherView({ onExpand }) {
  const { clips } = window.AnarchiveData;
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim()) return clips.slice(0, 6);
    const q = query.toLowerCase();
    return clips.filter(c => c.text.toLowerCase().includes(q) || c.app.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  useEffect(() => { setSel(0); }, [query]);

  return (
    <div
      data-screen-label="01 Launcher"
      style={{
        width: 620, borderRadius: 16, overflow: 'hidden',
        background: '#15101c',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.45), 0 28px 70px rgba(15,8,28,0.55)',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        fontFamily: 'var(--ac-font-ui)',
      }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: '#1d1729',
        borderBottom: '1px solid #2e2440',
      }}>
        <TrafficLights dark />
        <div style={{ flex: 1 }} />
        <AnarchiveWordmark size={15} color="#f3eef9" />
        <div style={{ flex: 1 }} />
        <button onClick={onExpand} style={{
          background: 'transparent', border: '1px solid #2e2440',
          color: '#b9accd', borderRadius: 5,
          width: 22, height: 22, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} title="Expand"><Icon name="expand" size={12} strokeWidth={2} /></button>
      </div>

      {/* Big search */}
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 14px', borderRadius: 10,
          background: '#110b1a', border: '1px solid #2e2440',
        }}>
          <span style={{ color: '#FF6B00', display: 'flex' }}>
            <Icon name="search" size={20} strokeWidth={2.25} />
          </span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, filtered.length - 1)); }
              if (e.key === 'ArrowUp')   { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            }}
            placeholder="Search the archive…"
            style={{
              flex: 1, background: 'transparent', border: 0, outline: 'none',
              fontFamily: 'var(--ac-font-ui)', fontSize: 20, fontWeight: 400,
              color: '#f3eef9',
            }}
          />
          {query && <button onClick={() => setQuery('')} style={{
            background: 'transparent', border: 0, color: '#80738f',
            fontFamily: 'var(--ac-font-mono)', fontSize: 11, cursor: 'pointer',
          }}>clear</button>}
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '0 10px 8px', maxHeight: 360, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: '32px 20px', textAlign: 'center',
            fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
            fontSize: 13, color: '#80738f',
          }}>Nothing in the archive matches that.</div>
        ) : filtered.map((clip, i) => (
          <ClipRow
            key={clip.id}
            clip={clip}
            idx={i}
            selected={i === sel}
            onSelect={() => setSel(i)}
            dark
            compact
          />
        ))}
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px',
        background: '#1d1729',
        borderTop: '1px solid #2e2440',
        fontFamily: 'var(--ac-font-ui)', fontSize: 11,
        color: '#80738f',
      }}>
        <Kbd dark>⏎</Kbd><span>paste</span>
        <Kbd dark>⌘⏎</Kbd><span>paste &amp; keep</span>
        <Kbd dark>⌫</Kbd><span>forget</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#5a4f6c' }}>{filtered.length} of {clips.length}</span>
      </div>
    </div>
  );
}

// =============================================================
// Full window view — sidebar + content
// =============================================================
function FullView({
  theme, onTheme, onCollapse, onOpenSettings,
  // lifted, persistent state
  tab, setTab, filter, setFilter, query, setQuery,
  selClip, setSelClip, selFile, setSelFile,
  openedFile, onOpenFile, onCloseFile,
  canGoBack, onBack,
}) {
  const { clips, files: rawFiles } = window.AnarchiveData;
  const dark = theme === 'dark';

  const [showDrop, setShowDrop] = useState(false);
  const [lastDrop, setLastDrop] = useState(null); // { variant: 'success'|'error', target?, msg? }
  const [loading, setLoading] = useState(true);
  const [forgottenFiles, setForgottenFiles] = useState(new Set());
  const files = rawFiles.filter(f => !forgottenFiles.has(f.id));
  const searchHandle = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 220);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchHandle.current && searchHandle.current.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Drag handlers
  const onDragEnter = (e) => { e.preventDefault(); setShowDrop(true); };
  const onDragOver  = (e) => { e.preventDefault(); };
  const onDragLeave = (e) => { if (e.currentTarget === e.target) setShowDrop(false); };
  const onDrop = (e) => {
    e.preventDefault(); setShowDrop(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      const blocked = ['.exe', '.bat', '.cmd', '.msi', '.dll', '.scr', '.com'];
      if (blocked.includes(ext)) {
        setLastDrop({ variant: 'error', msg: `Format ${ext.toUpperCase()} not supported` });
        setTimeout(() => setLastDrop(null), 2400);
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setLastDrop({ variant: 'error', msg: 'File too large — limit 500 MB' });
        setTimeout(() => setLastDrop(null), 2400);
        return;
      }
    }
    setLastDrop({ variant: 'success', target: 'auto' });
    setTimeout(() => setLastDrop(null), 1800);
  };
  const onDropInto = (target) => {
    setShowDrop(false);
    setLastDrop({ variant: 'success', target });
    if (target === 'files') setTab('drop');
    else if (target === 'pin') { setTab('clipboard'); setFilter('pinned'); }
    else if (['text', 'code', 'url'].includes(target)) { setTab('clipboard'); setFilter(target); }
    setTimeout(() => setLastDrop(null), 1800);
  };

  const visibleClips = useMemo(() => {
    let list = clips;
    if (filter === 'pinned' || tab === 'pinned') list = list.filter(c => c.pinned);
    else if (filter !== 'all' && filter !== 'files') list = list.filter(c => c.kind === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(c => c.text.toLowerCase().includes(q) || c.app.toLowerCase().includes(q));
    }
    return list;
  }, [filter, tab, query]);

  const visibleFiles = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    return files.filter(f => f.name.toLowerCase().includes(q));
  }, [query, forgottenFiles]);

  // Palette
  const bg     = dark ? '#15101c' : '#faf7ee';
  const panel  = dark ? '#1d1729' : '#fffdf6';
  const sunken = dark ? '#110b1a' : 'var(--ac-paper-deep)';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const fg1    = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2    = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';

  return (
    <div
      data-screen-label={`02 Full · ${dark ? 'Dark' : 'Light'}`}
      onDragEnter={onDragEnter} onDragOver={onDragOver}
      onDragLeave={onDragLeave} onDrop={onDrop}
      style={{
        width: 960, height: 620, borderRadius: 12, overflow: 'hidden',
        background: bg,
        boxShadow: dark
          ? '0 0 0 1px rgba(0,0,0,0.5), 0 24px 60px rgba(15,8,28,0.55)'
          : '0 0 0 1px rgba(31,14,46,0.10), 0 24px 60px rgba(31,14,46,0.20)',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        fontFamily: 'var(--ac-font-ui)',
      }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 14px',
        background: panel,
        borderBottom: '1px solid ' + border,
        height: 38, flex: 'none',
      }}>
        <TrafficLights dark={dark} />
        {canGoBack && <BackButton onClick={onBack} dark={dark} />}
        {openedFile && (
          <div style={{
            fontFamily: 'var(--ac-font-brand)', fontSize: 14,
            color: fg1, marginLeft: 4,
          }}>File details</div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {onOpenSettings && (
            <button onClick={onOpenSettings} title="Settings" style={{
              background: 'transparent', border: '1px solid ' + border,
              color: fg2, borderRadius: 5, width: 22, height: 22,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}><Icon name="settings" size={12} strokeWidth={2} /></button>
          )}
          <button onClick={() => onTheme(dark ? 'light' : 'dark')} title="Toggle theme" style={{
            background: 'transparent', border: '1px solid ' + border,
            color: fg2, borderRadius: 5, width: 22, height: 22,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center',
          }}><Icon name={dark ? 'sun' : 'moon'} size={12} strokeWidth={2} /></button>
          <button onClick={onCollapse} title="Collapse to launcher" style={{
            background: 'transparent', border: '1px solid ' + border,
            color: fg2, borderRadius: 5, width: 22, height: 22,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center',
          }}><Icon name="shrink" size={12} strokeWidth={2} /></button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Sidebar */}
        <Sidebar
          dark={dark}
          tab={tab} setTab={setTab}
          filter={filter} setFilter={setFilter}
          clips={clips} files={files}
        />

        {/* Main column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Search row */}
          <div style={{
            padding: '10px 16px',
            borderBottom: '1px solid ' + border,
            background: bg,
          }}>
            <SearchInput
              value={query}
              onChange={setQuery}
              dark={dark}
              kbd="⌘ K"
              focusRef={searchHandle}
            />
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {tab === 'drop' ? (
              openedFile != null ? (
                <FileDetailView
                  file={files.find(f => f.id === openedFile) || null}
                  dark={dark}
                  onClose={onCloseFile}
                  onForget={(id) => { setForgottenFiles(s => new Set([...s, id])); onCloseFile(); }}
                />
              ) : (
                <DropZoneView
                  files={visibleFiles} dark={dark}
                  onOpen={onOpenFile}
                />
              )
            ) : (
              <ClipboardListView
                clips={visibleClips} dark={dark}
                selected={selClip} onSelect={setSelClip}
                query={query} onClearSearch={() => setQuery('')}
                loading={loading}
              />
            )}
          </div>

          {/* Status bar */}
          <StatusBar dark={dark} count={tab === 'drop' ? visibleFiles.length : visibleClips.length} unit={tab === 'drop' ? 'files' : 'clips'} />
        </div>
      </div>

      <DropOverlay visible={showDrop} dark={dark} onDropInto={onDropInto} />
      {lastDrop && <DropToast drop={lastDrop} dark={dark} />}
    </div>
  );
}

// Small toast confirming where the dropped item landed
function DropToast({ drop, dark }) {
  const labels = {
    auto: 'Auto-sorted to the right section',
    text: 'Saved to Text',
    code: 'Saved to Code',
    url:  'Saved to Links',
    files:'Saved to Drop Zone',
    pin:  'Saved & Pinned',
  };
  const isError = drop.variant === 'error';
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 56,
      transform: 'translateX(-50%)',
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 14px',
      background: isError ? 'var(--ac-danger)' : (dark ? '#1d1729' : '#1f0e2e'),
      color: '#fff',
      borderRadius: 999,
      fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 500,
      boxShadow: '0 8px 24px rgba(31,14,46,0.25)',
      animation: 'ac-toast-in 220ms cubic-bezier(0.22,0.61,0.36,1)',
      zIndex: 200,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: isError ? 'rgba(255,255,255,0.9)' : '#FF8A33' }}>
        <Icon name={isError ? 'alertCircle' : 'check'} size={14} strokeWidth={2.5} />
      </span>
      {isError ? drop.msg : (labels[drop.target] || 'Saved')}
    </div>
  );
}

// =============================================================
// Sidebar
// =============================================================
function Sidebar({ dark, tab, setTab, filter, setFilter, clips, files }) {
  // In light mode the sidebar becomes a deep-purple structural surface
  // (echoing the brand "A in purple on orange"). Dark mode keeps the plum-tinted
  // dark panel, but pushes saturation up on the purple accents.
  const panel  = dark ? '#1d1729' : '#1f0e2e';
  const border = dark ? '#2e2440' : '#4A0E7A';
  const fg2    = dark ? '#b9accd' : 'rgba(243,238,249,0.78)';
  const fg3    = dark ? '#80738f' : 'rgba(243,238,249,0.52)';
  const fg1    = dark ? '#f3eef9' : '#f6f1fa';
  const activeBg = dark ? '#4A0E7A' : '#4A0E7A';
  const activeFg = '#fff';
  const accent   = '#FF8A33';

  const counts = {
    all: clips.length,
    text: clips.filter(c => c.kind === 'text').length,
    url: clips.filter(c => c.kind === 'url').length,
    code: clips.filter(c => c.kind === 'code').length,
    pinned: clips.filter(c => c.pinned).length,
    files: files.length,
  };

  const Section = ({ label, children }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        padding: '0 14px 6px',
        fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: dark ? fg3 : 'rgba(255,138,51,0.85)',
      }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </div>
    </div>
  );

  const Item = ({ icon, glyph, label, active, count, onClick, disabled }) => (
    <div onClick={disabled ? undefined : onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '5px 10px', margin: '0 8px', borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      background: active ? activeBg : 'transparent',
      color: active ? activeFg : fg2,
      fontWeight: active ? 500 : 400,
      boxShadow: active ? 'inset 3px 0 0 #FF6B00, 0 1px 0 rgba(0,0,0,0.18)' : 'none',
    }}>
      <span style={{
        width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
        color: active ? accent : fg3,
      }}>
        {icon ? <Icon name={icon} size={14} strokeWidth={1.75} /> : (
          <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 11 }}>{glyph}</span>
        )}
      </span>
      <span style={{
        flex: 1, fontFamily: 'var(--ac-font-ui)', fontSize: 12.5,
      }}>{label}</span>
      {count != null && (
        <span style={{
          fontFamily: 'var(--ac-font-mono)', fontSize: 10,
          color: active ? 'rgba(255,255,255,0.7)' : fg3,
        }}>{count}</span>
      )}
    </div>
  );

  return (
    <div style={{
      width: 200, flex: 'none',
      background: panel,
      borderRight: '1px solid ' + border,
      padding: '14px 0', overflowY: 'auto',
    }}>
      {/* Brand strip */}
      <div style={{ padding: '0 14px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <AnarchiveMark size={20} />
        <span style={{
          fontFamily: 'var(--ac-font-brand)', fontSize: 18, color: fg1,
          letterSpacing: '-0.005em', lineHeight: 1,
        }}>Anarchive</span>
      </div>

      <Section label="Views">
        <Item icon="clipboard" label="Clipboard" count={counts.all}    active={tab === 'clipboard'} onClick={() => { setTab('clipboard'); setFilter('all'); }} />
        <Item icon="inbox"     label="Drop Zone" count={counts.files}  active={tab === 'drop'}      onClick={() => setTab('drop')} />
        <Item icon="star"      label="Pinned"    count={counts.pinned} active={tab === 'clipboard' && filter === 'pinned'} onClick={() => { setTab('clipboard'); setFilter('pinned'); }} />
      </Section>

      {tab === 'clipboard' && (
        <Section label="By type">
          <Item glyph="·"     label="All"   count={counts.all}  active={filter === 'all'}  onClick={() => setFilter('all')} />
          <Item icon="pilcrow" label="Text"  count={counts.text} active={filter === 'text'} onClick={() => setFilter('text')} />
          <Item icon="link"    label="Links" count={counts.url}  active={filter === 'url'}  onClick={() => setFilter('url')} />
          <Item icon="code"    label="Code"  count={counts.code} active={filter === 'code'} onClick={() => setFilter('code')} />
        </Section>
      )}

      <Section label="Tags">
        <Item icon="hash" label="work"          disabled />
        <Item icon="hash" label="notes-to-self" disabled />
        <Item icon="hash" label="reading"       disabled />
        <Item icon="plus" label="add tag…" onClick={() => {}} />
      </Section>

      <div style={{ flex: 1 }} />
    </div>
  );
}

// =============================================================
// Clipboard list view
// =============================================================
function ClipboardListView({ clips, dark, selected, onSelect, query, onClearSearch, loading }) {
  if (loading) {
    return (
      <div style={{ padding: '10px 8px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', marginBottom: 2,
          }}>
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
          <EmptyState dark={dark} iconName="search" title="No matches"
            body={`Nothing for "${query}". Try a shorter word or clear the filter.`} />
          {onClearSearch && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: -12, marginBottom: 24 }}>
              <button onClick={onClearSearch} style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust-strong)'),
                borderRadius: 6, cursor: 'pointer',
                fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 500,
                color: dark ? '#f3eef9' : 'var(--ac-plum-800)',
              }}>Clear search</button>
            </div>
          )}
        </div>
      );
    }
    return <EmptyState dark={dark}
      iconName="clipboard"
      title="Nothing yet"
      body="Copy something — text, a link, a snippet — and it'll land here." />;
  }

  return (
    <div style={{ padding: '10px 8px' }}>
      {clips.map((clip, i) => (
        <ClipRow
          key={clip.id}
          clip={clip}
          idx={i}
          selected={i === selected}
          onSelect={() => onSelect(i)}
          dark={dark}
        />
      ))}
    </div>
  );
}

// =============================================================
// Drop zone grid
// =============================================================
function DropZoneView({ files, dark, onOpen }) {
  const fg3 = dark ? '#80738f' : 'var(--ac-fg-3)';
  if (files.length === 0) {
    return <EmptyState dark={dark}
      iconName="inbox"
      title="Drop something here"
      body="Files dragged onto the window land in the Drop Zone. They're stored locally — never uploaded." />;
  }
  return (
    <div style={{ padding: 14 }}>
      <div style={{
        fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: fg3,
        marginBottom: 10,
      }}>Recently dropped · {files.length} <span style={{
        marginLeft: 8, color: dark ? '#5a4f6c' : 'var(--ac-fg-4)',
        textTransform: 'none', letterSpacing: 0, fontWeight: 400,
      }}>click to open</span></div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
      }}>
        {files.map(f => (
          <FileTile
            key={f.id}
            file={f} dark={dark}
            onClick={() => onOpen && onOpen(f.id)}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================
// File detail — shown when a file in the Drop Zone is opened.
// Back is provided by the title bar; this is a pure detail panel.
// =============================================================
function FileDetailView({ file, dark, onClose, onForget }) {
  const { formatAgo } = window.AnarchiveData;
  const [actionMsg, setActionMsg] = useState(null);
  const fg1    = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2    = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';
  const panel  = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const purple = '#4A0E7A';

  if (!file) return (
    <div style={{ padding: 32 }}>
      <EmptyState dark={dark} iconName="alertTriangle"
        title="File no longer in archive"
        body="It may have been forgotten or moved." />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -8 }}>
        <button onClick={onClose} style={{
          padding: '7px 16px', background: purple, color: '#fff',
          border: 0, borderRadius: 6, cursor: 'pointer',
          fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 600,
        }}>Back to Drop Zone</button>
      </div>
    </div>
  );

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(null), 2200); };
  const filePath = '~/Library/Anarchive/drops/' + file.name;

  const meta = [
    ['Name',        file.name],
    ['Kind',        file.kind || file.ext],
    ['Size',        file.size],
    ['Dropped',     formatAgo(file.at)],
    ['Format',      file.ext],
    ['Location',    '~/Library/Anarchive/drops/' + file.name],
  ];

  // big thumb (mirrors FileTile preview, larger)
  const isImg = file.kind === 'image' && file.color;
  let preview;
  if (isImg) {
    preview = <div style={{ height: 240, background: file.color }} />;
  } else if (file.ext === 'PDF') {
    preview = <div style={{
      height: 240, background: dark ? '#2e2440' : 'var(--ac-plum-50)',
      color: dark ? '#FFA866' : 'var(--ac-plum-700)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <Icon name="fileText" size={64} strokeWidth={1.25} />
      <span style={{ fontFamily: 'var(--ac-font-brand)', fontWeight: 700, fontSize: 22, letterSpacing: '0.04em' }}>PDF</span>
    </div>;
  } else {
    preview = <div style={{
      height: 240, background: dark ? '#261e36' : '#f3ecda',
      color: dark ? '#80738f' : 'var(--ac-fg-3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--ac-font-mono)', fontSize: 18,
    }}>{file.ext}</div>;
  }

  return (
    <div style={{
      padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22,
      alignItems: 'start',
    }}>
      {/* Preview card */}
      <div style={{
        background: panel,
        border: '1px solid ' + border,
        borderRadius: 12, overflow: 'hidden',
        boxShadow: dark ? 'none' : '0 1px 0 rgba(31,14,46,0.04), 0 4px 12px -2px rgba(31,14,46,0.10)',
      }}>
        {preview}
        <div style={{ padding: '12px 14px', borderTop: '1px solid ' + border }}>
          <div style={{
            fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 600,
            color: fg1, marginBottom: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{file.name}</div>
          <div style={{
            fontFamily: 'var(--ac-font-mono)', fontSize: 10.5, color: fg3,
          }}>{file.size} · {formatAgo(file.at)}</div>
        </div>
      </div>

      {/* Meta + actions */}
      <div>
        <div style={{
          fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: purple, marginBottom: 10,
        }}>Details</div>
        <div style={{
          background: panel,
          border: '1px solid ' + border,
          borderRadius: 10, overflow: 'hidden',
        }}>
          {meta.map(([k, v], i) => (
            <div key={k} style={{
              display: 'flex', gap: 16, padding: '9px 14px',
              borderTop: i === 0 ? 0 : '1px solid ' + border,
              alignItems: 'baseline',
            }}>
              <div style={{
                width: 84, flex: 'none',
                fontFamily: 'var(--ac-font-ui)', fontSize: 11, fontWeight: 500,
                color: fg3, letterSpacing: '0.02em',
              }}>{k}</div>
              <div style={{
                flex: 1, minWidth: 0,
                fontFamily: 'var(--ac-font-mono)', fontSize: 12,
                color: fg1, wordBreak: 'break-all',
              }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => showMsg(`Would open ${file.name} with the default app.`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 6,
              background: purple, color: '#fff', border: 0,
              fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(74,14,122,0.30)',
            }}>
            <Icon name="externalLink" size={12} strokeWidth={2.25} />
            Open with default app
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(filePath)
                .then(() => showMsg('Path copied to clipboard.'))
                .catch(() => showMsg('Path: ' + filePath));
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 6,
              background: 'transparent',
              border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.22)'),
              color: dark ? '#f3eef9' : 'var(--ac-plum-800)',
              fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer',
            }}>
            <Icon name="copy" size={12} strokeWidth={2.25} />
            Copy path
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Remove "${file.name}" from the archive? This cannot be undone.`)) {
                onForget && onForget(file.id);
              }
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--ac-danger)',
              color: 'var(--ac-danger)',
              fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer',
              marginLeft: 'auto',
            }}>
            <Icon name="trash" size={12} strokeWidth={2.25} />
            Forget
          </button>
        </div>

        {actionMsg && (
          <div style={{
            marginTop: 12, padding: '8px 12px', borderRadius: 6,
            background: dark ? '#261e36' : 'var(--ac-plum-50)',
            fontFamily: 'var(--ac-font-ui)', fontSize: 12, color: dark ? '#b9accd' : 'var(--ac-plum-700)',
          }}>{actionMsg}</div>
        )}

        <div style={{
          marginTop: 14,
          fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
          fontSize: 12.5, color: fg2, lineHeight: 1.5,
        }}>
          Stored locally in your Anarchive vault. It hasn't been uploaded anywhere, and Anarchive doesn't index its contents unless you ask.
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Status bar
// =============================================================
function StatusBar({ dark, count, unit }) {
  const panel  = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 14px',
      background: panel,
      borderTop: '1px solid ' + border,
      fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: fg3,
      flex: 'none',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: '#6b7c3b' }} />
        <span>{count} {unit}</span>
      </span>
      <span>·</span>
      <span>storage: ~/Library/Anarchive</span>
      <div style={{ flex: 1 }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        Press <Kbd dark={dark}>⌥</Kbd><Kbd dark={dark}>Space</Kbd> to open from anywhere
      </span>
    </div>
  );
}

// =============================================================
// Root App — toggles between views via the bottom mode strip
// =============================================================
function App() {
  const [view, setView] = useState('full');   // 'onboarding' | 'launcher' | 'menubar' | 'full' | 'settings'
  const [theme, setTheme] = useState('light'); // 'light' | 'dark' | 'auto'

  // Navigation stack — pushed when we go deeper than the dashboard.
  // Each entry is the view to return to. The back button is shown whenever
  // this is non-empty (or when a file is opened inside the dashboard).
  const [history, setHistory] = useState([]); // string[]

  // Lifted dashboard state — kept around when the user navigates into Settings
  // or a file detail and then back, so the search query, selected clip, and
  // scroll position survive intact.
  const [tab, setTab]         = useState('clipboard');
  const [filter, setFilter]   = useState('all');
  const [query, setQuery]     = useState('');
  const [selClip, setSelClip] = useState(0);
  const [selFile, setSelFile] = useState(null);
  const [openedFile, setOpenedFile] = useState(null); // file id, null when in grid

  const effectiveTheme = theme === 'auto' ? 'light' : theme;

  // Navigate one level deeper — pushes the current view onto the back stack.
  const navigateTo = (next) => {
    setHistory((h) => [...h, view]);
    setView(next);
  };

  // Jump (used by the bottom mode strip) — resets the stack entirely.
  const jumpTo = (next) => {
    setHistory([]);
    setOpenedFile(null);
    setView(next);
  };

  // Go back one level. Priority: close opened file first, then pop the stack.
  const goBack = () => {
    if (openedFile != null) { setOpenedFile(null); return; }
    setHistory((h) => {
      if (h.length === 0) return h;
      setView(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  const canGoBack = history.length > 0 || openedFile != null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at 30% 20%, #b9accd 0%, #80738f 35%, #2a0e3f 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 32,
      fontFamily: 'var(--ac-font-ui)',
    }}>
      {view === 'onboarding' && <OnboardingView onFinish={() => jumpTo('launcher')} />}
      {view === 'launcher'   && <LauncherView   onExpand={() => jumpTo('full')} />}
      {view === 'menubar'    && <MenuBarView
                                  onOpenFull={() => jumpTo('full')}
                                  onOpenSettings={() => navigateTo('settings')}
                                  onQuit={() => jumpTo('onboarding')} />}
      {view === 'full'       && <FullView
                                  theme={effectiveTheme} onTheme={setTheme}
                                  onCollapse={() => jumpTo('launcher')}
                                  onOpenSettings={() => navigateTo('settings')}
                                  tab={tab} setTab={setTab}
                                  filter={filter} setFilter={setFilter}
                                  query={query} setQuery={setQuery}
                                  selClip={selClip} setSelClip={setSelClip}
                                  selFile={selFile} setSelFile={setSelFile}
                                  openedFile={openedFile}
                                  onOpenFile={(id) => setOpenedFile(id)}
                                  onCloseFile={() => setOpenedFile(null)}
                                  canGoBack={canGoBack} onBack={goBack} />}
      {view === 'settings'   && <SettingsView
                                  theme={theme} onTheme={setTheme}
                                  onClose={goBack}
                                  canGoBack={canGoBack} onBack={goBack} />}

      {/* Floating mode strip — demo switcher, not part of the app UI */}
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
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
