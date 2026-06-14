// components.jsx — Anarchive desktop UI kit
// Shared chrome + clipboard rows + file tiles + drop overlay.
// Loaded with <script type="text/babel" src="components.jsx"></script> AFTER React.

const { useState, useEffect, useRef, useMemo } = React;

// =============================================================
// Icon — renders one Lucide path set as an SVG.
// =============================================================
function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.75, style = {} }) {
  const inner = window.AnarchiveIcons && window.AnarchiveIcons[name];
  if (!inner) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flex: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

// =============================================================
// Window chrome
// =============================================================
function TrafficLights({ onClose, dark = false }) {
  const dot = (bg) => ({
    width: 12, height: 12, borderRadius: '50%', background: bg,
    border: dark ? '0.5px solid rgba(255,255,255,0.10)' : '0.5px solid rgba(0,0,0,0.08)',
    flex: 'none', cursor: 'pointer',
  });
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={dot('#ff5f57')} onClick={onClose} title="Close" />
      <div style={dot('#febc2e')} title="Minimize" />
      <div style={dot('#28c840')} title="Zoom" />
    </div>
  );
}

// =============================================================
// Back button — used in title bars whenever navigation goes deeper
// than the main dashboard (Settings, file detail, etc.)
// =============================================================
function BackButton({ onClick, dark = false, label = 'Back' }) {
  const [hover, setHover] = useState(false);
  const border = dark ? '#3d2f56' : 'rgba(74,14,122,0.22)';
  const fg     = dark ? '#f3eef9' : 'var(--ac-plum-800)';
  const bg     = hover
    ? (dark ? 'rgba(74,14,122,0.45)' : 'rgba(74,14,122,0.08)')
    : 'transparent';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Back"
      aria-label="Back"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px 3px 7px', height: 24,
        background: bg,
        border: '1px solid ' + border,
        borderRadius: 6,
        color: fg,
        fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 500,
        cursor: 'pointer',
        transition: 'background 120ms, border-color 120ms',
      }}>
      <Icon name="arrowLeft" size={13} strokeWidth={2.25} />
      <span style={{ lineHeight: 1 }}>{label}</span>
    </button>
  );
}

function Kbd({ children, style = {}, dark = false }) {
  return (
    <kbd style={{
      fontFamily: 'var(--ac-font-mono)', fontSize: 10.5, fontWeight: 500,
      padding: '2px 6px',
      border: dark ? '1px solid #3d2f56' : '1px solid var(--ac-dust)',
      borderBottomWidth: 2,
      borderRadius: 4,
      background: dark ? '#1d1729' : '#fffdf6',
      color: dark ? '#b9accd' : 'var(--ac-fg-2)',
      lineHeight: 1, whiteSpace: 'nowrap',
      ...style,
    }}>{children}</kbd>
  );
}

// =============================================================
// Brand bits
// =============================================================
function AnarchiveMark({ size = 22, radius, style = {} }) {
  const r = radius != null ? radius : Math.round(size * 0.22);
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      background: '#FF6B00',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--ac-font-brand)',
      fontWeight: 400,
      fontSize: Math.round(size * 0.78),
      color: '#4A0E7A',
      lineHeight: 1, paddingBottom: Math.round(size * 0.04),
      flex: 'none',
      ...style,
    }}>A</div>
  );
}

function AnarchiveWordmark({ size = 22, color = '#1f0e2e', style = {} }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8, ...style,
    }}>
      <AnarchiveMark size={size} />
      <span style={{
        fontFamily: 'var(--ac-font-brand)', fontWeight: 400,
        fontSize: size * 0.95, color, letterSpacing: '-0.005em',
        lineHeight: 1,
      }}>Anarchive</span>
    </div>
  );
}

// =============================================================
// Clipboard kind glyph
// =============================================================
function KindBadge({ kind, dark = false, size = 28 }) {
  const styles = {
    text:  { bg: '#FF6B00', fg: '#fff',                                                                      icon: 'pilcrow' },
    code:  { bg: dark ? '#2e2440' : 'var(--ac-plum-50)', fg: dark ? '#FF8A33' : 'var(--ac-plum-700)',         icon: 'code' },
    url:   { bg: dark ? '#2a1810' : '#fff2e5',           fg: dark ? '#FF8A33' : '#b34a02',                    icon: 'link' },
    image: { bg: dark ? '#2e2440' : 'var(--ac-plum-50)', fg: dark ? '#FFA866' : 'var(--ac-plum-700)',         icon: 'image' },
    pdf:   { bg: dark ? '#2a1810' : '#fff2e5',           fg: dark ? '#FF8A33' : '#b34a02',                    icon: 'fileText' },
  };
  const s = styles[kind] || styles.text;
  const iconSize = Math.round(size * 0.5);
  return (
    <div style={{
      width: size, height: size, borderRadius: 7,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: s.bg, color: s.fg, flex: 'none',
    }}>
      <Icon name={s.icon} size={iconSize} strokeWidth={2} />
    </div>
  );
}

// =============================================================
// Clipboard row — used in both launcher and full views
// =============================================================
function ClipRow({ clip, idx, selected, onSelect, onPaste, onPin, onForget, dark = false, compact = false }) {
  const { formatAgo } = window.AnarchiveData;
  const [copied, setCopied] = useState(false); // false | true | 'error'

  const baseBg = dark ? 'transparent' : 'transparent';
  const selectedBg = dark ? '#261e36' : 'rgba(74,14,122,0.06)';
  const monoText = clip.kind === 'code' || clip.kind === 'url';
  const fg1 = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg3 = dark ? '#80738f' : 'var(--ac-fg-3)';

  const onCopy = (e) => {
    e.stopPropagation();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(clip.text)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); })
        .catch(() => { setCopied('error'); setTimeout(() => setCopied(false), 2400); });
    } else {
      setCopied('error');
      setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onPaste}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: compact ? '7px 10px' : '8px 12px',
        background: selected ? selectedBg : baseBg,
        borderRadius: 7, cursor: 'pointer',
        position: 'relative',
      }}>
      <KindBadge kind={clip.kind} dark={dark} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: monoText ? 'var(--ac-font-mono)' : 'var(--ac-font-ui)',
          fontSize: monoText ? 12 : 13,
          color: clip.kind === 'url' ? (dark ? '#FFA866' : 'var(--ac-plum-700)') : fg1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.35,
        }}>{clip.text}</div>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center', marginTop: 2,
          fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: fg3,
        }}>
          <span>{formatAgo(clip.at)}</span>
          <span>·</span>
          <span>{clip.meta}</span>
          <span>·</span>
          <span>from {clip.app}</span>
          {clip.pinned && <><span>·</span><span style={{ color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)' }}>★ pinned</span></>}
        </div>
      </div>
      {selected ? (
        <button
          onClick={onCopy}
          title="Copy back to clipboard"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 6,
            fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 600,
            background: copied === 'error'
              ? (dark ? '#3a1010' : '#fadfd5')
              : copied
                ? (dark ? '#1f2e1f' : '#eef0dc')
                : '#FF6B00',
            color: copied === 'error'
              ? (dark ? '#ff8080' : 'var(--ac-danger)')
              : copied ? (dark ? '#a3c777' : '#4a5621') : '#fff',
            border: copied === 'error' ? '1px solid ' + (dark ? '#7a2020' : 'var(--ac-danger)') : 0,
            cursor: 'pointer',
            boxShadow: copied ? 'none' : '0 1px 2px rgba(255,107,0,0.30)',
            transition: 'background 140ms',
          }}>
          <Icon name={copied === 'error' ? 'alertCircle' : copied ? 'check' : 'copy'} size={12} strokeWidth={2.25} />
          {copied === 'error' ? 'No clipboard access' : copied ? 'Copied' : 'Copy'}
        </button>
      ) : (
        <div style={{
          fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: fg3,
          minWidth: 14, textAlign: 'right',
        }}>{idx != null && idx < 9 ? idx + 1 : ''}</div>
      )}
    </div>
  );
}

// =============================================================
// File tile — used in the drop zone grid
// =============================================================
function FileTile({ file, dark = false, selected = false, onClick }) {
  const { formatAgo } = window.AnarchiveData;
  const isImg = file.kind === 'image' && file.color;
  const bg = dark ? '#1d1729' : '#fffdf6';
  const border = selected
    ? (dark ? '#a875e0' : '#4A0E7A')
    : (dark ? '#2e2440' : 'var(--ac-dust)');

  let thumb;
  if (isImg) {
    thumb = <div style={{ height: 92, background: file.color }} />;
  } else if (file.ext === 'PDF') {
    thumb = <div style={{
      height: 92, background: dark ? '#2e2440' : 'var(--ac-plum-50)',
      color: dark ? '#FFA866' : 'var(--ac-plum-700)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <Icon name="fileText" size={28} strokeWidth={1.5} />
      <span style={{ fontFamily: 'var(--ac-font-brand)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>PDF</span>
    </div>;
  } else if (file.ext === 'MD') {
    thumb = <div style={{
      height: 92, color: dark ? '#80738f' : 'var(--ac-fg-3)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      background: dark
        ? 'repeating-linear-gradient(0deg,#1d1729 0 4px,#261e36 4px 5px)'
        : 'repeating-linear-gradient(0deg,#fffdf6 0 4px,#f3ecda 4px 5px)',
    }}>
      <Icon name="file" size={26} strokeWidth={1.5} />
      <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 10 }}>.md</span>
    </div>;
  } else if (file.ext === 'ZIP') {
    thumb = <div style={{
      height: 92, background: '#15101c', color: '#FF6B00',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <Icon name="archive" size={28} strokeWidth={1.5} />
      <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 10 }}>ZIP</span>
    </div>;
  } else if (file.ext === 'M4A') {
    thumb = <div style={{
      height: 92, color: dark ? '#FFA866' : 'var(--ac-plum-700)',
      background: dark ? '#2e2440' : 'var(--ac-plum-50)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <Icon name="fileAudio" size={28} strokeWidth={1.5} />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
        {[3, 12, 8, 18, 10, 14, 6].map((h, i) =>
          <div key={i} style={{ width: 2, height: h, background: 'currentColor', opacity: 0.6 }} />
        )}
      </div>
    </div>;
  } else {
    thumb = <div style={{
      height: 92, background: dark ? '#261e36' : '#f3ecda',
      color: dark ? '#80738f' : 'var(--ac-fg-3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--ac-font-mono)', fontSize: 11,
    }}>{file.ext}</div>;
  }

  return (
    <div onClick={onClick} style={{
      background: bg,
      border: '1px solid ' + border,
      borderRadius: 10,
      overflow: 'hidden',
      cursor: 'pointer',
      position: 'relative',
      boxShadow: selected ? '0 0 0 3px rgba(74,14,122,0.18), 0 0 0 5px rgba(255,107,0,0.10)' : 'none',
      transition: 'box-shadow 140ms, border-color 140ms',
    }}>
      {thumb}
      {isImg && (
        <span style={{
          position: 'absolute', top: 6, left: 6,
          padding: '2px 6px', borderRadius: 4,
          fontFamily: 'var(--ac-font-mono)', fontSize: 9, fontWeight: 600,
          background: 'rgba(31,14,46,0.7)', color: '#fff',
          letterSpacing: '0.04em',
        }}>{file.ext}</span>
      )}
      <div style={{ padding: '7px 10px 9px' }}>
        <div style={{
          fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500,
          color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{file.name}</div>
        <div style={{
          fontFamily: 'var(--ac-font-mono)', fontSize: 9.5,
          color: dark ? '#80738f' : 'var(--ac-fg-3)', marginTop: 1,
        }}>{file.size} · {formatAgo(file.at)}</div>
      </div>
    </div>
  );
}

// =============================================================
// Search input — used by both views
// =============================================================
function SearchInput({ value, onChange, placeholder = 'Search clips, files, tags…', dark = false, autoFocus = false, kbd = '⌘ K', focusRef }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(autoFocus);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  useEffect(() => { if (focusRef) focusRef.current = { focus: () => ref.current && ref.current.focus() }; });

  const accent = dark ? '#FF8A33' : '#4A0E7A';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      background: dark ? '#110b1a' : '#fffdf6',
      border: '1px solid ' + (focused ? accent : (dark ? '#2e2440' : 'var(--ac-dust)')),
      borderRadius: 10,
      boxShadow: focused
        ? `0 0 0 3px ${dark ? 'rgba(255,138,51,0.14)' : 'rgba(74,14,122,0.10)'}`
        : 'none',
      transition: 'all 140ms',
    }}>
      <span style={{ color: dark ? '#80738f' : 'var(--ac-fg-3)', display: 'flex' }}>
        <Icon name="search" size={15} strokeWidth={2} />
      </span>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          flex: 1, background: 'transparent', border: 0, outline: 'none',
          fontFamily: 'var(--ac-font-ui)', fontSize: 14,
          color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
        }}
      />
      <Kbd dark={dark}>{kbd}</Kbd>
    </div>
  );
}

// =============================================================
// Empty state
// =============================================================
function EmptyState({ icon, iconName, title, body, dark = false }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 14, padding: '48px 24px',
      color: dark ? '#80738f' : 'var(--ac-fg-3)',
    }}>
      <div style={{ opacity: 0.5, color: dark ? '#b9accd' : 'var(--ac-plum-700)' }}>
        {iconName ? <Icon name={iconName} size={36} strokeWidth={1.25} /> : <span style={{ fontSize: 32 }}>{icon}</span>}
      </div>
      <div style={{
        fontFamily: 'var(--ac-font-brand)', fontSize: 24,
        color: dark ? '#f3eef9' : 'var(--ac-plum-900)',
        lineHeight: 1, letterSpacing: '-0.005em',
      }}>{title}</div>
      <div style={{
        fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
        fontSize: 13, textAlign: 'center', maxWidth: 340, lineHeight: 1.5,
      }}>{body}</div>
    </div>
  );
}

// =============================================================
// Drop overlay — shown when dragging files over the window.
// Top half: "Auto" hint (the app's preferred path — content type inferred).
// Bottom half: explicit category drop targets so the user can override.
// =============================================================
function DropOverlay({ visible, dark = false, onDropInto }) {
  const [hoverTarget, setHoverTarget] = useState('auto');
  if (!visible) return null;

  const targets = [
    { id: 'auto',  icon: 'zap',       label: 'Auto-sort',    sub: 'detect by content' },
    { id: 'text',  icon: 'pilcrow',   label: 'Text',         sub: 'plain notes' },
    { id: 'code',  icon: 'code',      label: 'Code',         sub: 'snippets & shell' },
    { id: 'url',   icon: 'link',      label: 'Links',        sub: 'urls only' },
    { id: 'files', icon: 'inbox',     label: 'Drop Zone',    sub: 'files & images' },
    { id: 'pin',   icon: 'star',      label: 'Pinned',       sub: 'keep at top' },
  ];

  const handleEnter = (id) => () => setHoverTarget(id);
  const handleDrop = (id) => (e) => {
    e.preventDefault(); e.stopPropagation();
    if (onDropInto) onDropInto(id);
  };
  const allowDrop = (e) => { e.preventDefault(); };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(255,107,0,0.10)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      animation: 'ac-drop-in 200ms cubic-bezier(0.22,0.61,0.36,1)',
    }}>
      {/* Outer dashed frame */}
      <div style={{
        position: 'absolute', inset: 16, border: '2.5px dashed #FF6B00',
        borderRadius: 18, pointerEvents: 'none',
      }} />

      {/* Top — hero "Drop into Anarchive" + auto hint */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <AnarchiveMark size={64} />
        <div style={{
          fontFamily: 'var(--ac-font-brand)', fontSize: 30,
          color: dark ? '#fff' : '#1f0e2e', lineHeight: 1.05, letterSpacing: '-0.005em',
        }}>Drop into Anarchive</div>
        <div style={{
          fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
          fontSize: 13, color: dark ? '#ffc899' : '#5a2a78',
        }}>release anywhere to auto-sort, or pick a section below</div>
      </div>

      {/* Bottom — quick categories */}
      <div style={{
        flex: 'none',
        padding: '14px 22px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{
          fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: dark ? '#ffc899' : '#b34a02', textAlign: 'center',
        }}>Drop into a section</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${targets.length}, 1fr)`,
          gap: 8,
        }}>
          {targets.map(t => {
            const isAuto = t.id === 'auto';
            const isHover = hoverTarget === t.id;
            return (
              <div
                key={t.id}
                onDragEnter={handleEnter(t.id)}
                onDragOver={allowDrop}
                onDrop={handleDrop(t.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  padding: '14px 8px 12px',
                  background: isHover
                    ? (isAuto ? '#FF6B00' : (dark ? '#261e36' : '#fffdf6'))
                    : (dark ? 'rgba(29,23,41,0.85)' : 'rgba(255,253,246,0.92)'),
                  border: isHover
                    ? `2px solid ${isAuto ? '#FF6B00' : '#FF6B00'}`
                    : `2px dashed ${isAuto ? '#FF6B00' : (dark ? '#3d2f56' : '#d9d2c1')}`,
                  borderRadius: 12,
                  color: isHover && isAuto ? '#fff' : (dark ? '#f3eef9' : '#1f0e2e'),
                  cursor: 'copy',
                  transition: 'all 120ms cubic-bezier(0.22,0.61,0.36,1)',
                  transform: isHover ? 'translateY(-2px)' : 'none',
                  boxShadow: isHover
                    ? '0 10px 24px -8px rgba(255,107,0,0.4)'
                    : 'none',
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: isHover && isAuto ? 'rgba(255,255,255,0.18)' : (isAuto ? '#FF6B00' : 'transparent'),
                  color: isAuto && !isHover ? '#fff' : (isHover && !isAuto ? '#FF6B00' : (dark ? '#FFA866' : 'var(--ac-vermillion-600)')),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={t.icon} size={16} strokeWidth={2} />
                </div>
                <div style={{
                  fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600,
                  lineHeight: 1,
                }}>{t.label}</div>
                <div style={{
                  fontFamily: 'var(--ac-font-mono)', fontSize: 9.5,
                  color: isHover && isAuto
                    ? 'rgba(255,255,255,0.85)'
                    : (dark ? '#80738f' : 'var(--ac-fg-3)'),
                  textAlign: 'center', lineHeight: 1.3,
                }}>{t.sub}</div>
              </div>
            );
          })}
        </div>
        <div style={{
          fontFamily: 'var(--ac-font-ui)', fontSize: 11,
          color: dark ? '#80738f' : 'var(--ac-fg-3)',
          textAlign: 'center', marginTop: 2,
        }}>Release on a section to override · <Kbd dark={dark}>esc</Kbd> to cancel</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Icon,
  TrafficLights, Kbd, BackButton,
  AnarchiveMark, AnarchiveWordmark,
  KindBadge, ClipRow, FileTile,
  SearchInput, EmptyState, DropOverlay,
});
