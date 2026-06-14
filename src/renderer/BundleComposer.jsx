import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Icon } from './components.jsx';

// ─── Bundle toast notification ────────────────────────────────────────────────
// Persistent: stays visible until manually closed or bundle is finalized.
export function BundleToast({ dark }) {
  const [msg, setMsg] = useState(null);
  const [count, setCount] = useState(0);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!window.anarchive?.accum) return;
    const unsubAdded = window.anarchive.accum.onAdded(({ count: c }) => {
      setCount(c);
      setMsg(`Bundle in corso`);
    });
    const unsubFinalized = window.anarchive.accum.onFinalized(({ count: c }) => {
      setMsg(`Bundle creato · ${c} elementi`);
      setCount(0);
      setTimeout(() => setMsg(null), 3000);
    });
    return () => { unsubAdded(); unsubFinalized(); };
  }, []);

  if (!msg) return null;

  const isFinalized = msg.startsWith('Bundle creato');

  return (
    <div style={{
      position: 'fixed', top: 52, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9998,
    }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 24,
          background: dark ? 'rgba(74,14,122,0.95)' : '#4A0E7A',
          color: '#fff',
          fontFamily: 'var(--ac-font-ui)', fontSize: 14, fontWeight: 600,
          boxShadow: '0 6px 28px rgba(74,14,122,0.50)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap',
          transition: 'box-shadow 150ms',
          userSelect: 'none',
        }}>
        <Icon name="layers" size={15} strokeWidth={2} color="rgba(255,255,255,0.80)" />
        <span>{msg}{count > 0 ? <span style={{ marginLeft: 6, opacity: 0.75, fontWeight: 500, fontSize: 13 }}>({count} {count === 1 ? 'elemento' : 'elementi'})</span> : null}</span>
        {!isFinalized && (
          <button
            onClick={() => window.anarchive?.accum?.finalize?.()}
            style={{
              marginLeft: 4, padding: '4px 12px', borderRadius: 14,
              background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.35)',
              color: '#fff', fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', transition: 'background 120ms',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.32)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.20)'}
          >
            Finalizza
          </button>
        )}
        <button
          onClick={() => setMsg(null)}
          style={{
            width: 22, height: 22, borderRadius: 11,
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 120ms', marginLeft: 2,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.30)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          <Icon name="x" size={11} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// ─── Bundle Composer modal ────────────────────────────────────────────────────
export function BundleComposer({ clip, dark, onClose }) {
  const rawItems = useMemo(() => {
    try { return JSON.parse(clip.text); } catch { return [clip.text]; }
  }, [clip.text]);

  const [items, setItems] = useState(() =>
    rawItems.map((text, i) => ({ id: i, text, checked: true }))
  );
  const [copied, setCopied] = useState(false);
  const [copiedItem, setCopiedItem] = useState(null); // index of last copied item
  const [dragOver, setDragOver] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const dragIdx = useRef(null);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const toggle = (index) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item));
  };

  const onDragStart = (e, index) => {
    dragIdx.current = index;
    setDragFrom(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const onDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== dragOver) setDragOver(index);
  };

  const onDrop = (e, index) => {
    e.preventDefault();
    const from = dragIdx.current;
    dragIdx.current = null;
    setDragFrom(null);
    setDragOver(null);
    if (from == null || from === index) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  const onDragEnd = () => { dragIdx.current = null; setDragFrom(null); setDragOver(null); };

  // Drop indicator: gap appears before dragOver when dragging down-to-up, after when up-to-down
  const showGapBefore = (index) =>
    dragFrom !== null && dragOver !== null && dragFrom !== dragOver &&
    dragFrom > dragOver && dragOver === index;

  const showGapAfter = (index) =>
    dragFrom !== null && dragOver !== null && dragFrom !== dragOver &&
    dragFrom < dragOver && dragOver === index;

  const selectedCount = items.filter(i => i.checked).length;

  const copyAsBlock = () => {
    const block = items.filter(i => i.checked).map(i => i.text).join('\n\n');
    if (!block) return;
    navigator.clipboard?.writeText(block).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 900);
    });
  };

  const bg     = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const fg1    = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2    = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(15,8,28,0.60)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <div style={{
        width: 540, maxHeight: '80vh',
        borderRadius: 14, background: bg,
        border: '1px solid ' + (dark ? 'rgba(74,14,122,0.45)' : 'rgba(74,14,122,0.22)'),
        boxShadow: dark
          ? '0 0 0 1px rgba(74,14,122,0.30), 0 32px 80px rgba(15,8,28,0.65)'
          : '0 0 0 1px rgba(74,14,122,0.12), 0 32px 80px rgba(31,14,46,0.28)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: 'var(--ac-font-ui)',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid ' + border,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          flex: 'none',
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
              textTransform: 'uppercase', marginBottom: 4,
              color: dark ? '#c4a9e8' : '#4A0E7A',
            }}>
              Bundle · {rawItems.length} elementi
            </div>
            <div style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 20, color: fg1, letterSpacing: '-0.005em', lineHeight: 1 }}>
              Compositore
            </div>
            <div style={{ fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 12.5, color: fg2, marginTop: 6, lineHeight: 1.5 }}>
              Trascina per riordinare, seleziona, poi copia come blocco.
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid ' + border,
            color: fg3, borderRadius: 6, width: 26, height: 26, flex: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={12} strokeWidth={2.25} />
          </button>
        </div>

        {/* Items list */}
        <style>{`@keyframes _bcGapIn{from{opacity:0;transform:scaleY(0.4)}to{opacity:1;transform:scaleY(1)}}`}</style>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {showGapBefore(index) && (
                <div style={{
                  height: 50, borderRadius: 9, transformOrigin: 'top',
                  border: '2px dashed ' + (dark ? 'rgba(122,77,184,0.65)' : 'rgba(74,14,122,0.50)'),
                  background: dark ? 'rgba(74,14,122,0.12)' : 'rgba(74,14,122,0.06)',
                  animation: '_bcGapIn 160ms ease forwards',
                }} />
              )}
            <div
              draggable
              onDragStart={e => onDragStart(e, index)}
              onDragOver={e => onDragOver(e, index)}
              onDrop={e => onDrop(e, index)}
              onDragEnd={onDragEnd}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px', borderRadius: 9,
                background: item.checked
                  ? (dark ? 'rgba(74,14,122,0.10)' : 'rgba(74,14,122,0.04)')
                  : (dark ? '#110b1a' : '#f5f2ec'),
                border: '1.5px solid ' + (item.checked
                    ? (dark ? 'rgba(74,14,122,0.38)' : 'rgba(74,14,122,0.18)')
                    : border),
                opacity: dragFrom === index ? 0.30 : (item.checked ? 1 : 0.45),
                cursor: 'grab',
                transition: 'opacity 120ms, background 140ms',
              }}>
              {/* Drag handle */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 3, flex: 'none',
                marginTop: 3, opacity: 0.4, cursor: 'grab',
              }}>
                <Icon name="gripVertical" size={14} strokeWidth={1.75} color={dark ? '#c4a9e8' : '#4A0E7A'} />
              </div>

              {/* Checkbox */}
              <div onClick={() => toggle(index)} style={{
                width: 18, height: 18, borderRadius: 5, flex: 'none', marginTop: 2,
                background: item.checked ? '#4A0E7A' : 'transparent',
                border: '1.5px solid ' + (item.checked ? '#4A0E7A' : (dark ? '#3d2f56' : 'var(--ac-dust-strong)')),
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 120ms',
              }}>
                {item.checked && <Icon name="check" size={11} strokeWidth={2.5} color="#fff" />}
              </div>

              {/* Item order badge */}
              <span style={{
                flex: 'none', marginTop: 2,
                width: 22, height: 22, borderRadius: 6,
                background: dark ? '#261e36' : 'rgba(74,14,122,0.10)',
                border: '1px solid ' + (dark ? 'rgba(74,14,122,0.30)' : 'rgba(74,14,122,0.20)'),
                fontFamily: 'var(--ac-font-mono)', fontSize: 11, fontWeight: 700,
                color: dark ? '#c4a9e8' : '#4A0E7A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{index + 1}</span>

              {/* Text */}
              <div style={{
                flex: 1, fontSize: 13, color: fg1, lineHeight: 1.55,
                wordBreak: 'break-word', fontFamily: 'var(--ac-font-ui)',
              }}>
                {item.text}
              </div>

              {/* Per-item copy */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard?.writeText(item.text).then(() => {
                    setCopiedItem(index);
                    setTimeout(() => setCopiedItem(prev => prev === index ? null : prev), 1200);
                  });
                }}
                title="Copia questo elemento"
                style={{
                  flex: 'none', alignSelf: 'flex-start', marginTop: 2,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 6,
                  background: copiedItem === index
                    ? (dark ? '#1f2e1f' : '#eef0dc')
                    : (dark ? 'rgba(74,14,122,0.18)' : 'rgba(74,14,122,0.10)'),
                  border: '1px solid ' + (copiedItem === index
                    ? (dark ? '#4a6e2a' : '#c8d96a')
                    : (dark ? 'rgba(74,14,122,0.35)' : 'rgba(74,14,122,0.22)')),
                  color: copiedItem === index
                    ? (dark ? '#a3c777' : '#4a5621')
                    : (dark ? '#c4a9e8' : '#4A0E7A'),
                  fontFamily: 'var(--ac-font-ui)', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', transition: 'background 120ms, color 120ms',
                }}
              >
                <Icon name={copiedItem === index ? 'check' : 'copy'} size={11} strokeWidth={2.25} />
                {copiedItem === index ? 'Copiato' : 'Copia'}
              </button>
            </div>
              {showGapAfter(index) && (
                <div style={{
                  height: 50, borderRadius: 9, transformOrigin: 'top',
                  border: '2px dashed ' + (dark ? 'rgba(122,77,184,0.65)' : 'rgba(74,14,122,0.50)'),
                  background: dark ? 'rgba(74,14,122,0.12)' : 'rgba(74,14,122,0.06)',
                  animation: '_bcGapIn 160ms ease forwards',
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid ' + border,
          padding: '13px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          flex: 'none',
        }}>
          <span style={{ fontSize: 12, color: fg3, fontFamily: 'var(--ac-font-mono)' }}>
            {selectedCount} / {items.length} selezionati
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={onClose} style={{
              padding: '7px 16px', borderRadius: 7,
              background: 'transparent', border: '1px solid ' + border,
              color: fg2, fontFamily: 'var(--ac-font-ui)', fontSize: 13,
              fontWeight: 500, cursor: 'pointer',
            }}>Annulla</button>
            <button
              onClick={copyAsBlock}
              disabled={selectedCount === 0}
              style={{
                padding: '7px 18px', borderRadius: 7, border: 0,
                background: copied
                  ? (dark ? '#1f2e1f' : '#eef0dc')
                  : selectedCount > 0 ? '#4A0E7A' : (dark ? '#2e2440' : 'var(--ac-dust)'),
                color: copied
                  ? (dark ? '#a3c777' : '#4a5621')
                  : selectedCount > 0 ? '#fff' : fg3,
                fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 600,
                cursor: selectedCount > 0 ? 'pointer' : 'default',
                boxShadow: !copied && selectedCount > 0 ? '0 1px 4px rgba(74,14,122,0.40)' : 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                transition: 'background 140ms, color 140ms',
              }}>
              <Icon name={copied ? 'check' : 'copy'} size={14} strokeWidth={2} />
              {copied ? 'Copiato!' : 'Copia come Blocco'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
