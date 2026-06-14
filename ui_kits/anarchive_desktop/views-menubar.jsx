// views-menubar.jsx — Menu-bar dropdown view
// Tiny "always there" popover that drops down from a macOS menu-bar icon.
// Loaded AFTER components.jsx and app.jsx.

const { useState: useStateMB, useMemo: useMemoMB } = React;

function MenuBarView({ onOpenFull, onOpenSettings, onQuit }) {
  const { clips, formatAgo } = window.AnarchiveData;
  const [query, setQuery] = useStateMB('');
  const [tab, setTab] = useStateMB('recent'); // recent | pinned

  const list = useMemoMB(() => {
    let l = clips;
    if (tab === 'pinned') l = l.filter(c => c.pinned);
    if (query.trim()) {
      const q = query.toLowerCase();
      l = l.filter(c => c.text.toLowerCase().includes(q));
    }
    return l.slice(0, 7);
  }, [query, tab]);

  return (
    <div data-screen-label="03 Menu bar"
      style={{ position: 'relative', width: 360, fontFamily: 'var(--ac-font-ui)' }}>
      {/* Fake menubar above the popover */}
      <div style={{
        position: 'absolute', top: -36, left: 0, right: 0, height: 28,
        background: 'rgba(31,14,46,0.65)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '8px 8px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 12px', gap: 14,
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: 12, color: 'rgba(243,238,249,0.7)',
      }}>
        <span>⌥</span><span>⌘</span><span>🔋 78%</span><span>Wed 16:42</span>
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%) translateY(2px)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#FF8A33',
        }}>
          <AnarchiveMark size={16} radius={4} />
          <span style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 13, color: '#fff', lineHeight: 1 }}>Anarchive</span>
        </span>
      </div>

      {/* Popover */}
      <div style={{
        width: 360, background: '#1d1729', borderRadius: 12,
        boxShadow: '0 18px 50px rgba(15,8,28,0.6), 0 0 0 0.5px rgba(255,255,255,0.06)',
        overflow: 'hidden',
        border: '0.5px solid #2e2440',
      }}>
        {/* Header */}
        <div style={{
          padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid #2e2440',
          background: '#15101c',
        }}>
          <span style={{ color: '#80738f', display: 'flex' }}>
            <Icon name="search" size={14} strokeWidth={2} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the archive…"
            style={{
              flex: 1, background: 'transparent', border: 0, outline: 'none',
              fontFamily: 'var(--ac-font-ui)', fontSize: 13,
              color: '#f3eef9',
            }}
          />
          <Kbd dark>⌥ Space</Kbd>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: '8px 8px 4px',
          borderBottom: '1px solid #2e2440',
        }}>
          {[
            { id: 'recent', label: 'Recent', icon: 'clipboard' },
            { id: 'pinned', label: 'Pinned', icon: 'star' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '6px 0',
              background: tab === t.id ? '#261e36' : 'transparent',
              color: tab === t.id ? '#f3eef9' : '#80738f',
              border: 0, borderRadius: 6,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              cursor: 'pointer',
            }}>
              <Icon name={t.icon} size={12} strokeWidth={2} />
              {t.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: 6 }}>
          {list.length === 0 ? (
            <div style={{
              padding: '24px 14px', textAlign: 'center',
              fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
              fontSize: 12, color: '#80738f',
            }}>nothing matches that.</div>
          ) : list.map((clip, i) => (
            <MenuClipRow key={clip.id} clip={clip} idx={i} formatAgo={formatAgo} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 2, padding: 6,
          borderTop: '1px solid #2e2440',
          background: '#15101c',
        }}>
          <FooterButton icon="expand" label="Open archive" onClick={onOpenFull} />
          <FooterButton icon="settings" label="Settings" onClick={onOpenSettings} />
          <FooterButton icon="rotate" label="Reset demo" onClick={onQuit} />
        </div>
      </div>
    </div>
  );
}

function MenuClipRow({ clip, idx, formatAgo }) {
  const [hover, setHover] = useStateMB(false);
  const monoText = clip.kind === 'code' || clip.kind === 'url';
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 8px', borderRadius: 6,
        background: hover ? '#261e36' : 'transparent',
        cursor: 'pointer',
      }}>
      <KindBadge kind={clip.kind} dark size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: monoText ? 'var(--ac-font-mono)' : 'var(--ac-font-ui)',
          fontSize: monoText ? 11.5 : 12.5,
          color: clip.kind === 'url' ? '#FFA866' : '#f3eef9',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>{clip.text}</div>
        <div style={{
          fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, color: '#80738f',
          marginTop: 1,
        }}>{formatAgo(clip.at)} · {clip.app}</div>
      </div>
      <span style={{
        fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, color: '#80738f',
        minWidth: 10, textAlign: 'right',
      }}>{idx < 9 ? '⌘' + (idx + 1) : ''}</span>
    </div>
  );
}

function FooterButton({ icon, label, onClick }) {
  const [hover, setHover] = useStateMB(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '6px 8px',
        background: hover ? '#261e36' : 'transparent',
        color: hover ? '#f3eef9' : '#b9accd',
        border: 0, borderRadius: 6,
        fontFamily: 'inherit', fontSize: 11.5, fontWeight: 500,
        cursor: 'pointer',
      }}>
      <Icon name={icon} size={12} strokeWidth={2} />
      {label}
    </button>
  );
}

Object.assign(window, { MenuBarView });
