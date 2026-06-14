import React, { useState, useEffect, useRef } from 'react';
import { AnarchiveIcons } from './icons.js';
import { formatAgo } from './utils.js';
import { useT } from './i18n.js';

// =============================================================
// Icon
// =============================================================
export function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.75, style = {} }) {
  const inner = AnarchiveIcons[name];
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
export function TrafficLights({ onClose, onMinimize, onZoom, dark = false }) {
  const dot = (bg) => ({
    width: 12, height: 12, borderRadius: '50%', background: bg,
    border: dark ? '0.5px solid rgba(255,255,255,0.10)' : '0.5px solid rgba(0,0,0,0.08)',
    flex: 'none', cursor: 'pointer',
  });
  // Defaults wire to IPC if no handler passed
  const handleClose    = onClose    ?? (() => window.anarchive?.window?.close());
  const handleMinimize = onMinimize ?? (() => window.anarchive?.window?.minimize());
  const handleZoom     = onZoom     ?? (() => window.anarchive?.window?.maximize());
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={dot('#ff5f57')} onClick={handleClose}    title="Close" />
      <div style={dot('#febc2e')} onClick={handleMinimize} title="Minimize" />
      <div style={dot('#28c840')} onClick={handleZoom}     title="Zoom" />
    </div>
  );
}

export function BackButton({ onClick, dark = false, label = 'Back' }) {
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
      title="Back" aria-label="Back"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '4px 12px 4px 9px', height: 29,
        background: bg, border: '1px solid ' + border,
        borderRadius: 7, color: fg,
        fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 500,
        cursor: 'pointer', transition: 'background 120ms, border-color 120ms',
      }}>
      <Icon name="arrowLeft" size={16} strokeWidth={2.25} />
      <span style={{ lineHeight: 1 }}>{label}</span>
    </button>
  );
}

export function ForwardButton({ onClick, dark = false }) {
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
      title="Forward" aria-label="Forward"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 29, height: 29,
        background: bg, border: '1px solid ' + border,
        borderRadius: 7, color: fg,
        cursor: 'pointer', transition: 'background 120ms, border-color 120ms',
      }}>
      <Icon name="arrowRight" size={16} strokeWidth={2.25} />
    </button>
  );
}

const MAC_KEY_SYMBOLS = { Alt: '⌥', Option: '⌥', Super: '⌘', Cmd: '⌘', Command: '⌘', Ctrl: '⌃', Control: '⌃', Shift: '⇧' };
const isMacPlatform = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

function macKeyLabel(key) {
  if (!isMacPlatform || typeof key !== 'string') return key;
  return MAC_KEY_SYMBOLS[key] ?? key;
}

export function Kbd({ children, style = {}, dark = false }) {
  return (
    <kbd style={{
      fontFamily: 'var(--ac-font-mono)', fontSize: 10.5, fontWeight: 500,
      padding: '2px 6px',
      border: dark ? '1px solid #3d2f56' : '1px solid var(--ac-dust)',
      borderBottomWidth: 2, borderRadius: 4,
      background: dark ? '#1d1729' : '#fffdf6',
      color: dark ? '#b9accd' : 'var(--ac-fg-2)',
      lineHeight: 1, whiteSpace: 'nowrap',
      ...style,
    }}>{macKeyLabel(children)}</kbd>
  );
}

// =============================================================
// Brand bits
// =============================================================
export function AnarchiveMark({ size = 22, radius, style = {} }) {
  const r = radius != null ? radius : Math.round(size * 0.22);
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      background: '#FF6B00',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--ac-font-brand)', fontWeight: 400,
      fontSize: Math.round(size * 0.78), color: '#4A0E7A',
      lineHeight: 1, paddingBottom: Math.round(size * 0.04),
      flex: 'none', ...style,
    }}>A</div>
  );
}

export function AnarchiveWordmark({ size = 22, color = '#1f0e2e', style = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, ...style }}>
      <AnarchiveMark size={size} />
      <span style={{
        fontFamily: 'var(--ac-font-brand)', fontWeight: 400,
        fontSize: size * 0.95, color, letterSpacing: '-0.005em', lineHeight: 1,
      }}>Anarchive</span>
    </div>
  );
}

// =============================================================
// Clipboard kind glyph
// =============================================================
export function KindBadge({ kind, dark = false, size = 28 }) {
  const styles = {
    text:   { bg: '#FF6B00', fg: '#fff', icon: 'pilcrow' },
    code:   { bg: dark ? '#2e2440' : 'var(--ac-plum-50)', fg: dark ? '#FF8A33' : 'var(--ac-plum-700)', icon: 'code' },
    url:    { bg: dark ? '#2a1810' : '#fff2e5', fg: dark ? '#FF8A33' : '#b34a02', icon: 'link' },
    image:  { bg: dark ? '#2e2440' : 'var(--ac-plum-50)', fg: dark ? '#FFA866' : 'var(--ac-plum-700)', icon: 'image' },
    pdf:    { bg: dark ? '#2a1810' : '#fff2e5', fg: dark ? '#FF8A33' : '#b34a02', icon: 'fileText' },
    bundle: { bg: dark ? '#261e36' : 'rgba(74,14,122,0.10)', fg: dark ? '#c4a9e8' : '#4A0E7A', icon: 'layers' },
  };
  const s = styles[kind] || styles.text;
  return (
    <div style={{
      width: size, height: size, borderRadius: 7,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: s.bg, color: s.fg, flex: 'none',
    }}>
      <Icon name={s.icon} size={Math.round(size * 0.5)} strokeWidth={2} />
    </div>
  );
}

// =============================================================
// Clipboard row
// =============================================================
export function ClipRow({ clip, idx, selected, onSelect, onPaste, onPin, onDelete, onLock, onPreview, dark = false, compact = false, projects = [], currentProject = null, onAssignItem }) {
  const [copied, setCopied] = useState(false); // false | true | 'plain' | 'upper' | 'lower' | 'error'
  const [linkHover, setLinkHover] = useState(false);
  const [rowHover, setRowHover] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const rowRef = useRef(null);
  useEffect(() => {
    if (compact || !rowRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setIsNarrow(entry.contentRect.width < 440);
    });
    ro.observe(rowRef.current);
    return () => ro.disconnect();
  }, [compact]);
  const isBundleClip = clip.kind === 'bundle';
  const bundleItems = isBundleClip
    ? (() => { try { return JSON.parse(clip.text); } catch { return [clip.text]; } })()
    : null;
  const isUrl = clip.kind === 'url';
  const monoText = clip.kind === 'code' || isUrl;
  const fg1 = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg3 = dark ? '#80738f' : 'var(--ac-fg-3)';
  const selectedBg = dark ? '#261e36' : 'rgba(74,14,122,0.06)';

  const openLink = (e) => {
    e.stopPropagation();
    const url = clip.text.trim();
    if (window.anarchive?.system?.openExternal) window.anarchive.system.openExternal(url);
    else window.open(url, '_blank', 'noopener');
  };

  const onCopy = (e) => {
    e.stopPropagation();
    const textToCopy = isBundleClip ? bundleItems.join('\n\n') : clip.text;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); })
        .catch(() => { setCopied('error'); setTimeout(() => setCopied(false), 2400); });
    } else { setCopied('error'); setTimeout(() => setCopied(false), 2400); }
  };

  const _stripHtml = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ');

  const onCopyPlain = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(_stripHtml(clip.text))
      .then(() => { setCopied('plain'); setTimeout(() => setCopied(false), 1400); })
      .catch(() => {});
  };

  const _readRecycle = () => { try { return JSON.parse(localStorage.getItem('ac.recycleModifiedClips') || 'false'); } catch { return false; } };

  const onCopyUpper = (e) => {
    e.stopPropagation();
    const text = _stripHtml(clip.text).toUpperCase();
    if (!_readRecycle()) window.anarchive?.clipboard?.ignoreNext?.(text);
    navigator.clipboard?.writeText(text)
      .then(() => { setCopied('upper'); setTimeout(() => setCopied(false), 1400); })
      .catch(() => {});
  };

  const onCopyLower = (e) => {
    e.stopPropagation();
    const text = _stripHtml(clip.text).toLowerCase();
    if (!_readRecycle()) window.anarchive?.clipboard?.ignoreNext?.(text);
    navigator.clipboard?.writeText(text)
      .then(() => { setCopied('lower'); setTimeout(() => setCopied(false), 1400); })
      .catch(() => {});
  };

  const COLOR_RE = /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*[\d.]+)?\s*\))$/i;
  const colorValue = COLOR_RE.test(clip.text.trim()) ? clip.text.trim() : null;

  const iconBtn = (onClick, title, iconName, active) => (
    <button onClick={onClick} title={title} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 6,
      background: active ? (dark ? '#2a1e40' : '#fff2e5') : 'transparent',
      border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
      color: active ? (dark ? '#FF8A33' : '#b34a02') : (dark ? '#80738f' : 'var(--ac-fg-3)'),
      cursor: 'pointer',
    }}><Icon name={iconName} size={12} strokeWidth={active ? 2.5 : 2} /></button>
  );

  return (
    <div
      ref={rowRef}
      onClick={() => onPreview?.(clip)}
      onDoubleClick={isBundleClip ? undefined : onPaste}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', clip.text);
        if (clip.kind === 'url') e.dataTransfer.setData('text/uri-list', clip.text);
        e.dataTransfer.setData('application/x-anarchive-item', JSON.stringify({ type: 'clip', id: clip.id }));
        e.dataTransfer.effectAllowed = 'copyMove';
      }}
      onMouseEnter={() => setRowHover(true)}
      onMouseLeave={() => setRowHover(false)}
      style={{
        display: 'flex', alignItems: compact ? 'flex-start' : 'center',
        flexWrap: (!compact && isNarrow) ? 'wrap' : 'nowrap', gap: 10,
        padding: compact ? '8px 10px' : (isBundleClip ? '12px 14px' : '8px 12px'),
        background: selected
          ? selectedBg
          : isBundleClip
            ? (rowHover ? (dark ? 'rgba(74,14,122,0.12)' : 'rgba(74,14,122,0.06)') : (dark ? 'rgba(74,14,122,0.06)' : 'rgba(74,14,122,0.03)'))
            : (rowHover ? (dark ? 'rgba(255,138,51,0.06)' : 'rgba(255,138,51,0.05)') : 'transparent'),
        borderRadius: 7, cursor: 'pointer', position: 'relative',
        opacity: clip.locked ? 0.75 : 1,
        // zIndex keeps the hovered/selected row on top so its ring renders over siblings
        zIndex: (rowHover || selected) ? 2 : 1,
        boxShadow: isBundleClip
          ? (rowHover
              ? `0 0 0 1.5px rgba(74,14,122,0.70), inset 3px 0 0 #4A0E7A, inset 0 0 10px rgba(74,14,122,0.12)`
              : `0 0 0 1px rgba(74,14,122,0.28), inset 3px 0 0 rgba(74,14,122,0.55)`)
          : (rowHover ? '0 0 0 1.5px rgba(255,138,51,0.70), inset 0 0 12px rgba(255,138,51,0.12)' : 'none'),
        transition: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), background 180ms ease',
      }}>
      <div style={{ position: 'relative', flex: 'none', paddingTop: compact ? 1 : 0 }}>
        <KindBadge kind={clip.kind} dark={dark} />
        {isBundleClip && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            minWidth: 14, height: 14, paddingInline: 3, borderRadius: 7,
            background: '#4A0E7A', color: '#fff',
            fontFamily: 'var(--ac-font-mono)', fontSize: 8, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 1.5px ' + (dark ? '#15101c' : '#faf7ee'),
          }}>{bundleItems.length}</span>
        )}
      </div>
      {compact ? (
        /* ── Compact two-row layout ── */
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Row 1: text preview — full width, never squeezed by buttons */}
          {isBundleClip ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
              {bundleItems.slice(0, 2).map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, color: fg1, lineHeight: 1.3, fontFamily: 'var(--ac-font-ui)',
                }}>
                  <span style={{ color: dark ? '#c4a9e8' : '#4A0E7A', fontSize: 8, flex: 'none' }}>▶</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                    {item.length > 80 ? item.slice(0, 77) + '…' : item}
                  </span>
                </div>
              ))}
              {bundleItems.length > 2 && (
                <div style={{ fontSize: 10, color: fg3, fontFamily: 'var(--ac-font-mono)', paddingLeft: 14 }}>
                  +{bundleItems.length - 2} altri…
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={isUrl ? openLink : undefined}
              onMouseEnter={isUrl ? () => setLinkHover(true) : undefined}
              onMouseLeave={isUrl ? () => setLinkHover(false) : undefined}
              title={isUrl ? 'Open in browser' : undefined}
              style={{
                fontFamily: monoText ? 'var(--ac-font-mono)' : 'var(--ac-font-ui)',
                fontSize: monoText ? 12 : 13,
                color: isUrl ? (dark ? '#FFA866' : 'var(--ac-plum-700)') : fg1,
                lineHeight: 1.35,
                cursor: isUrl ? 'pointer' : 'inherit',
                textDecoration: isUrl && linkHover ? 'underline' : 'none',
                display: 'flex', alignItems: 'center', gap: 5, maxWidth: '100%', overflow: 'hidden',
              }}>
              {colorValue && (
                <span style={{
                  flexShrink: 0, width: 14, height: 14, background: colorValue,
                  borderRadius: 'var(--ac-radius-xs)', border: '1px solid var(--ac-border-strong)',
                  display: 'inline-block',
                }} />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{clip.text}</span>
            </div>
          )}
          {/* Row 2: meta + action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              flex: 1, minWidth: 0, display: 'flex', gap: 6, alignItems: 'center',
              fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: fg3, overflow: 'hidden',
            }}>
              <span style={{ flex: 'none' }}>{formatAgo(clip.at)}</span>
              <span style={{ flex: 'none' }}>·</span>
              {isBundleClip
                ? <span style={{ flex: 'none', color: dark ? '#c4a9e8' : '#4A0E7A', fontWeight: 600 }}>{bundleItems.length} elementi</span>
                : <span style={{ flex: 'none' }}>{clip.meta}</span>}
              {clip.app && <><span style={{ flex: 'none' }}>·</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: dark ? '#9d8fb8' : 'var(--ac-plum-600)' }}>{clip.app}</span></>}
              {(clip.capCount > 1) && <><span style={{ flex: 'none' }}>·</span><span style={{ flex: 'none', color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)' }}>×{clip.capCount}</span></>}
              {clip.pinned && <span style={{ flex: 'none', color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)' }}>★</span>}
              {clip.locked && <span style={{ flex: 'none' }}>🔒</span>}
            </div>
            {(selected || rowHover) ? (
              <div style={{
                display: 'flex', gap: 4, alignItems: 'center', flex: 'none',
                background: dark ? 'rgba(26,18,42,0.88)' : 'rgba(255,253,246,0.90)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                borderRadius: 8, padding: '2px 4px 2px 2px',
              }}>
                <button
                  onClick={onCopy}
                  title="Copy back to clipboard"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 6,
                    fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 600,
                    background: copied === 'error' ? (dark ? '#3a1010' : '#fadfd5') : (copied && copied !== 'error') ? (dark ? '#1f2e1f' : '#eef0dc') : '#FF6B00',
                    color: copied === 'error' ? (dark ? '#ff8080' : 'var(--ac-danger)') : (copied && copied !== 'error') ? (dark ? '#a3c777' : '#4a5621') : '#fff',
                    border: copied === 'error' ? '1px solid ' + (dark ? '#7a2020' : 'var(--ac-danger)') : 0,
                    cursor: 'pointer',
                    boxShadow: copied ? 'none' : '0 1px 2px rgba(255,107,0,0.30)',
                    transition: 'background 140ms',
                  }}>
                  <Icon name={copied === 'error' ? 'alertCircle' : copied ? 'check' : 'copy'} size={12} strokeWidth={2.25} />
                  {copied === 'error' ? 'No access' : copied === 'plain' ? 'Plain copied' : copied === 'upper' ? 'UPPER copied' : copied === 'lower' ? 'lower copied' : copied ? 'Copied' : isBundleClip ? 'Copy Block' : 'Copy'}
                </button>
                {!isBundleClip && <button onClick={onCopyPlain} title="Copy as plain text (strips HTML)" style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 6,
                  background: copied === 'plain' ? (dark ? '#1f2e1f' : '#eef0dc') : 'transparent',
                  border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
                  color: copied === 'plain' ? (dark ? '#a3c777' : '#4a5621') : (dark ? '#80738f' : 'var(--ac-fg-3)'),
                  cursor: 'pointer', fontFamily: 'var(--ac-font-mono)', fontSize: 9, fontWeight: 600,
                }}>T</button>}
                {!isBundleClip && <button onClick={onCopyUpper} title="Copy as UPPERCASE" style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 6,
                  background: copied === 'upper' ? (dark ? '#1f2e1f' : '#eef0dc') : 'transparent',
                  border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
                  color: copied === 'upper' ? (dark ? '#a3c777' : '#4a5621') : (dark ? '#80738f' : 'var(--ac-fg-3)'),
                  cursor: 'pointer', fontFamily: 'var(--ac-font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.5px',
                }}>AA</button>}
                {!isBundleClip && <button onClick={onCopyLower} title="Copy as lowercase" style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 6,
                  background: copied === 'lower' ? (dark ? '#1f2e1f' : '#eef0dc') : 'transparent',
                  border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
                  color: copied === 'lower' ? (dark ? '#a3c777' : '#4a5621') : (dark ? '#80738f' : 'var(--ac-fg-3)'),
                  cursor: 'pointer', fontFamily: 'var(--ac-font-mono)', fontSize: 8, fontWeight: 600,
                }}>aa</button>}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: fg3 }}>
                {idx != null && idx < 9 && !clip.locked ? idx + 1 : ''}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Full (non-compact) layout — unchanged ── */
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            {isBundleClip ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                {bundleItems.slice(0, 3).map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, color: fg1, lineHeight: 1.3, fontFamily: 'var(--ac-font-ui)',
                  }}>
                    <span style={{ color: dark ? '#c4a9e8' : '#4A0E7A', fontSize: 8, flex: 'none' }}>▶</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                      {item.length > 80 ? item.slice(0, 77) + '…' : item}
                    </span>
                  </div>
                ))}
                {bundleItems.length > 3 && (
                  <div style={{ fontSize: 10, color: fg3, fontFamily: 'var(--ac-font-mono)', paddingLeft: 14 }}>
                    +{bundleItems.length - 3} altri…
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={isUrl ? openLink : undefined}
                onMouseEnter={isUrl ? () => setLinkHover(true) : undefined}
                onMouseLeave={isUrl ? () => setLinkHover(false) : undefined}
                title={isUrl ? 'Open in browser' : undefined}
                style={{
                  fontFamily: monoText ? 'var(--ac-font-mono)' : 'var(--ac-font-ui)',
                  fontSize: monoText ? 12 : 13,
                  color: isUrl ? (dark ? '#FFA866' : 'var(--ac-plum-700)') : fg1,
                  lineHeight: 1.35,
                  cursor: isUrl ? 'pointer' : 'inherit',
                  textDecoration: isUrl && linkHover ? 'underline' : 'none',
                  display: 'flex', alignItems: 'center', gap: 5, maxWidth: '100%', overflow: 'hidden',
                }}>
                {colorValue && (
                  <span style={{
                    flexShrink: 0, width: 14, height: 14, background: colorValue,
                    borderRadius: 'var(--ac-radius-xs)', border: '1px solid var(--ac-border-strong)',
                    display: 'inline-block',
                  }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{clip.text}</span>
              </div>
            )}
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center', marginTop: 2,
              fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: fg3,
            }}>
              <span>{formatAgo(clip.at)}</span>
              <span>·</span>
              {isBundleClip
                ? <span style={{ color: dark ? '#c4a9e8' : '#4A0E7A', fontWeight: 600 }}>{bundleItems.length} elementi</span>
                : <span>{clip.meta}</span>}
              {clip.app && <><span>·</span><span style={{ color: dark ? '#9d8fb8' : 'var(--ac-plum-600)' }}>{clip.app}</span></>}
              {(clip.capCount > 1) && <><span>·</span><span style={{ color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)' }}>×{clip.capCount}</span></>}
              {clip.pinned && <><span>·</span><span style={{ color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)' }}>★</span></>}
              {clip.locked && <><span>·</span><span style={{ color: dark ? '#7eb661' : '#4a5621' }}>🔒</span></>}
            </div>
          </div>
          {(selected || rowHover) ? (
            <div style={{
              display: 'flex', gap: 4, alignItems: 'center', flex: 'none',
              marginLeft: isNarrow ? 'auto' : undefined,
              flexBasis: isNarrow ? '100%' : undefined,
              justifyContent: isNarrow ? 'flex-end' : undefined,
              background: dark ? 'rgba(26,18,42,0.88)' : 'rgba(255,253,246,0.90)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              borderRadius: 8, padding: '2px 4px 2px 2px',
            }}>
              {onPin && iconBtn((e) => { e.stopPropagation(); onPin(!clip.pinned); }, clip.pinned ? 'Unpin' : 'Pin', 'star', clip.pinned)}
              {onLock && iconBtn((e) => { e.stopPropagation(); onLock(!clip.locked); }, clip.locked ? 'Unlock' : 'Lock', 'shieldCheck', clip.locked)}
              {projects.length > 0 && onAssignItem && (
                <select
                  value={currentProject || ''}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { e.stopPropagation(); onAssignItem(clip.id, e.target.value || null); }}
                  title="Assign to project"
                  style={{
                    padding: '4px 6px', borderRadius: 5, fontSize: 11, height: 28,
                    background: dark ? '#110b1a' : '#fffdf6',
                    border: '1px solid ' + (currentProject ? '#4A0E7A' : (dark ? '#3d2f56' : 'var(--ac-dust)')),
                    color: dark ? (currentProject ? '#c4a9e8' : '#80738f') : (currentProject ? '#4A0E7A' : 'var(--ac-fg-3)'),
                    outline: 'none', cursor: 'pointer', fontFamily: 'var(--ac-font-ui)',
                    maxWidth: 120,
                  }}>
                  <option value="">📁 No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.emoji || '📁'} {p.name.length > 14 ? p.name.slice(0, 12) + '…' : p.name}</option>)}
                </select>
              )}
              <button
                onClick={onCopy}
                title="Copy back to clipboard"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 6,
                  fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 600,
                  background: copied === 'error' ? (dark ? '#3a1010' : '#fadfd5') : (copied && copied !== 'error') ? (dark ? '#1f2e1f' : '#eef0dc') : '#FF6B00',
                  color: copied === 'error' ? (dark ? '#ff8080' : 'var(--ac-danger)') : (copied && copied !== 'error') ? (dark ? '#a3c777' : '#4a5621') : '#fff',
                  border: copied === 'error' ? '1px solid ' + (dark ? '#7a2020' : 'var(--ac-danger)') : 0,
                  cursor: 'pointer',
                  boxShadow: copied ? 'none' : '0 1px 2px rgba(255,107,0,0.30)',
                  transition: 'background 140ms',
                }}>
                <Icon name={copied === 'error' ? 'alertCircle' : copied ? 'check' : 'copy'} size={12} strokeWidth={2.25} />
                {copied === 'error' ? 'No access' : copied === 'plain' ? 'Plain copied' : copied === 'upper' ? 'UPPER copied' : copied === 'lower' ? 'lower copied' : copied ? 'Copied' : isBundleClip ? 'Copy Block' : 'Copy'}
              </button>
              {!isBundleClip && <button onClick={onCopyPlain} title="Copy as plain text (strips HTML)" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6,
                background: copied === 'plain' ? (dark ? '#1f2e1f' : '#eef0dc') : 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
                color: copied === 'plain' ? (dark ? '#a3c777' : '#4a5621') : (dark ? '#80738f' : 'var(--ac-fg-3)'),
                cursor: 'pointer', fontFamily: 'var(--ac-font-mono)', fontSize: 9, fontWeight: 600,
              }}>T</button>}
              {!isBundleClip && <button onClick={onCopyUpper} title="Copy as UPPERCASE" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6,
                background: copied === 'upper' ? (dark ? '#1f2e1f' : '#eef0dc') : 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
                color: copied === 'upper' ? (dark ? '#a3c777' : '#4a5621') : (dark ? '#80738f' : 'var(--ac-fg-3)'),
                cursor: 'pointer', fontFamily: 'var(--ac-font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.5px',
              }}>AA</button>}
              {!isBundleClip && <button onClick={onCopyLower} title="Copy as lowercase" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6,
                background: copied === 'lower' ? (dark ? '#1f2e1f' : '#eef0dc') : 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust)'),
                color: copied === 'lower' ? (dark ? '#a3c777' : '#4a5621') : (dark ? '#80738f' : 'var(--ac-fg-3)'),
                cursor: 'pointer', fontFamily: 'var(--ac-font-mono)', fontSize: 8, fontWeight: 600,
              }}>aa</button>}
              {onDelete && (
                <div style={{ opacity: clip.locked ? 0 : 1, pointerEvents: clip.locked ? 'none' : 'auto' }}>
                  {iconBtn((e) => { e.stopPropagation(); onDelete(); }, 'Delete', 'trash', false)}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex', gap: 5, alignItems: 'center',
              fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: fg3,
            }}>
              {clip.locked && <span style={{ fontSize: 9 }}>🔒</span>}
              {idx != null && idx < 9 && !clip.locked ? idx + 1 : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================
// File-kind placeholder thumbnail (non-image kinds)
// =============================================================
export function KindThumb({ kind, ext, dark }) {
  const bg     = dark ? '#261e36' : '#f3ecda';
  const purple = dark ? '#c4a9e8' : '#8b7ab8';
  const amber  = dark ? '#FFA866' : '#c4903c';

  const wrap = (children) => (
    <div style={{ height: 92, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </div>
  );

  if (kind === 'document') return wrap(
    <svg width="48" height="58" viewBox="0 0 48 58" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="36" height="48" rx="4" fill={purple} fillOpacity="0.18" stroke={purple} strokeOpacity="0.5" strokeWidth="1.5"/>
      <path d="M26 2 L38 14 L26 14 Z" fill={purple} fillOpacity="0.3"/>
      <rect x="26" y="2" width="12" height="12" rx="2" fill={purple} fillOpacity="0.12" stroke={purple} strokeOpacity="0.35" strokeWidth="1"/>
      <line x1="9" y1="22" x2="31" y2="22" stroke={purple} strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round"/>
      <line x1="9" y1="29" x2="31" y2="29" stroke={purple} strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round"/>
      <line x1="9" y1="36" x2="22" y2="36" stroke={purple} strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 46 C12 42 15 50 19 46 C21 44 23 46 26 45" stroke={amber} strokeWidth="1.75" strokeLinecap="round" fill="none"/>
    </svg>
  );

  if (kind === 'spreadsheet') return wrap(
    <svg width="58" height="56" viewBox="0 0 58 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="34" height="36" rx="3" fill={purple} fillOpacity="0.15" stroke={purple} strokeOpacity="0.45" strokeWidth="1.5"/>
      <line x1="13.5" y1="2" x2="13.5" y2="38" stroke={purple} strokeOpacity="0.35" strokeWidth="1"/>
      <line x1="25" y1="2" x2="25" y2="38" stroke={purple} strokeOpacity="0.35" strokeWidth="1"/>
      <line x1="2" y1="14" x2="36" y2="14" stroke={purple} strokeOpacity="0.35" strokeWidth="1"/>
      <line x1="2" y1="26" x2="36" y2="26" stroke={purple} strokeOpacity="0.35" strokeWidth="1"/>
      <rect x="5" y="17" width="7" height="8" rx="1" fill={amber} fillOpacity="0.55"/>
      <rect x="16.5" y="5" width="7" height="8" rx="1" fill={amber} fillOpacity="0.38"/>
      <circle cx="46" cy="43" r="11" fill={amber} fillOpacity="0.12" stroke={amber} strokeOpacity="0.6" strokeWidth="1.5"/>
      <path d="M46 43 L46 32 A11 11 0 0 1 56.5 48.5 Z" fill={amber} fillOpacity="0.55"/>
      <path d="M46 43 L35.5 47.5 A11 11 0 0 1 46 32 Z" fill={purple} fillOpacity="0.4"/>
    </svg>
  );

  if (kind === 'presentation') return wrap(
    <svg width="62" height="50" viewBox="0 0 62 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="58" height="38" rx="4" fill={purple} fillOpacity="0.15" stroke={purple} strokeOpacity="0.45" strokeWidth="1.5"/>
      <rect x="8" y="8" width="18" height="13" rx="2" fill={purple} fillOpacity="0.22"/>
      <rect x="10" y="10" width="14" height="9" rx="1" fill={amber} fillOpacity="0.28"/>
      <rect x="32" y="16" width="6" height="16" rx="1.5" fill={amber} fillOpacity="0.7"/>
      <rect x="40" y="20" width="6" height="12" rx="1.5" fill={amber} fillOpacity="0.5"/>
      <rect x="48" y="11" width="6" height="21" rx="1.5" fill={purple} fillOpacity="0.6"/>
      <line x1="31" y1="40" x2="31" y2="48" stroke={purple} strokeOpacity="0.5" strokeWidth="1.75" strokeLinecap="round"/>
      <line x1="23" y1="48" x2="39" y2="48" stroke={purple} strokeOpacity="0.5" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  );

  if (kind === 'audio') return wrap(
    <svg width="62" height="40" viewBox="0 0 62 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {[6, 16, 9, 30, 20, 38, 24, 36, 20, 28, 14, 22, 9, 14, 6].map((h, i) => (
        <rect key={i} x={i * 4 + 2} y={(40 - h) / 2} width="2.5" height={h} rx="1.25"
          fill={amber} fillOpacity={0.48 + (h / 38) * 0.52}/>
      ))}
    </svg>
  );

  if (kind === 'video') return wrap(
    <svg width="60" height="48" viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="56" height="44" rx="5" fill={purple} fillOpacity="0.15" stroke={purple} strokeOpacity="0.45" strokeWidth="1.5"/>
      {[8, 20, 32, 44].map(x => (
        <rect key={x}    x={x} y={5}  width={6} height={5} rx={1} fill={purple} fillOpacity={0.4}/>
      ))}
      {[8, 20, 32, 44].map(x => (
        <rect key={x+99} x={x} y={38} width={6} height={5} rx={1} fill={purple} fillOpacity={0.4}/>
      ))}
      <circle cx="30" cy="24" r="11" fill={amber} fillOpacity="0.15" stroke={amber} strokeOpacity="0.5" strokeWidth="1.5"/>
      <polygon points="26,19 26,29 38,24" fill={amber} fillOpacity="0.85"/>
    </svg>
  );

  if (kind === 'code') return wrap(
    <svg width="54" height="40" viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 4 L2 20 L15 36" stroke={amber} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M39 4 L52 20 L39 36" stroke={amber} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="31" y1="2" x2="23" y2="38" stroke={purple} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );

  if (kind === 'archive') return wrap(
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="14" width="44" height="40" rx="4" fill={purple} fillOpacity="0.15" stroke={purple} strokeOpacity="0.45" strokeWidth="1.5"/>
      <rect x="2" y="4"  width="44" height="13" rx="4" fill={purple} fillOpacity="0.25" stroke={purple} strokeOpacity="0.45" strokeWidth="1.5"/>
      <rect x="17" y="4" width="14" height="13" rx="2" fill={amber} fillOpacity="0.28"/>
      <circle cx="24" cy="37" r="9" fill={amber} fillOpacity="0.12" stroke={amber} strokeOpacity="0.6" strokeWidth="1.5"/>
      <circle cx="24" cy="37" r="3.5" fill={amber} fillOpacity="0.55"/>
      <line x1="24" y1="28" x2="24" y2="31" stroke={amber} strokeOpacity="0.7" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  );

  if (kind === 'app') return wrap(
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 20 C2 10 8 4 18 4 L30 4 L46 18 L46 46 C46 48 44 50 42 50 L8 50 C5 50 2 48 2 46 Z" fill={purple} fillOpacity="0.18" stroke={purple} strokeOpacity="0.45" strokeWidth="1.5"/>
      <path d="M30 4 L30 18 L46 18" fill={purple} fillOpacity="0.1" stroke={purple} strokeOpacity="0.38" strokeWidth="1.5"/>
      <rect x="14" y="28" width="22" height="14" rx="3" fill={amber} fillOpacity="0.38" stroke={amber} strokeOpacity="0.4" strokeWidth="1"/>
    </svg>
  );

  // Generic fallback — show ext label inside a file outline
  return wrap(
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <svg width="34" height="40" viewBox="0 0 34 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 4 C2 3 3 2 4 2 L22 2 L32 12 L32 36 C32 37 31 38 30 38 L4 38 C3 38 2 37 2 36 Z"
          fill={purple} fillOpacity="0.15" stroke={purple} strokeOpacity="0.45" strokeWidth="1.5"/>
        <path d="M22 2 L22 12 L32 12" fill={purple} fillOpacity="0.08" stroke={purple} strokeOpacity="0.35" strokeWidth="1.5"/>
      </svg>
      <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 9, color: purple, opacity: 0.75 }}>{ext}</span>
    </div>
  );
}

// =============================================================
// File tile
// =============================================================
export function FileTile({ file, dark = false, selected = false, onClick, onDragOut, onShare, canShare = true, projects = [], currentProject = null, onAssignItem }) {
  const [hovered, setHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const hasThumb = file.kind === 'image' && file.path;
  const isImg = file.kind === 'image';
  const bg = dark ? '#1d1729' : '#fffdf6';
  const border = selected
    ? (dark ? '#a875e0' : '#4A0E7A')
    : (dark ? '#2e2440' : 'var(--ac-dust)');

  let thumb;
  if (hasThumb) {
    thumb = (
      <div style={{ height: 92, position: 'relative', overflow: 'hidden', background: dark ? '#261e36' : '#f3ecda' }}>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: dark ? '#80738f' : 'var(--ac-fg-3)',
          opacity: imgLoaded ? 0 : 1,
          transition: 'opacity 150ms',
          pointerEvents: 'none',
        }}>
          <Icon name="image" size={28} strokeWidth={1.5} />
        </div>
        <img
          src={`ac-file://${file.path}`}
          alt={file.name}
          onLoad={() => setImgLoaded(true)}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 150ms',
          }}
        />
      </div>
    );
  } else if (isImg && file.color) {
    thumb = <div style={{ height: 92, background: file.color }} />;
  } else {
    thumb = <KindThumb kind={file.kind} ext={file.ext} dark={dark} />;
  }

  return (
    <div
      onClick={onClick}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-anarchive-item', JSON.stringify({ type: 'file', id: file.id }));
        e.dataTransfer.effectAllowed = 'copyMove';
        if (onDragOut) { e.preventDefault(); onDragOut(); }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowAssign(false); }}
      style={{
        background: bg,
        border: '1px solid ' + (hovered ? '#FF8A33' : border),
        borderRadius: 10, overflow: showAssign ? 'visible' : 'hidden', position: 'relative',
        cursor: hovered && onDragOut ? 'grab' : 'pointer',
        transform: hovered ? 'scale(1.035)' : 'scale(1)',
        zIndex: hovered ? 2 : 1,
        boxShadow: selected
          ? '0 0 0 3px rgba(74,14,122,0.18), 0 0 0 5px rgba(255,107,0,0.10)'
          : (hovered
              ? '0 0 0 1px rgba(255,138,51,0.45), 0 0 28px 6px rgba(255,138,51,0.30), 0 10px 26px rgba(0,0,0,0.32)'
              : 'none'),
        transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 220ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms ease',
      }}>
      {thumb}
      {hovered && onDragOut && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          width: 22, height: 22, borderRadius: 5,
          background: 'rgba(0,0,0,0.50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', pointerEvents: 'none',
        }}>
          <Icon name="externalLink" size={11} strokeWidth={2.25} />
        </div>
      )}
      {/* Share button — overlay bottom-right, visible on hover, native macOS Share Sheet */}
      {onShare && hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); if (canShare && file.path) onShare(); }}
          disabled={!canShare || !file.path}
          title={!file.path ? 'Path not available' : (canShare ? 'Condividi…' : 'Share non disponibile')}
          style={{
            position: 'absolute', bottom: 6, right: 6,
            width: 22, height: 22, borderRadius: 5,
            background: 'rgba(0,0,0,0.55)',
            border: 0, cursor: (canShare && file.path) ? 'pointer' : 'not-allowed',
            opacity: (canShare && file.path) ? 1 : 0.4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', padding: 0,
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}>
          <Icon name="share" size={11} strokeWidth={2.25} />
        </button>
      )}
      {hovered && projects.length > 0 && onAssignItem && (
        <div style={{ position: 'absolute', top: 6, left: 6 }}
          onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); setShowAssign(p => !p); }}
            title={currentProject ? 'Riassegna progetto' : 'Assegna a progetto'}
            style={{
              width: 22, height: 22, borderRadius: 5, border: 0, cursor: 'pointer',
              background: currentProject ? 'rgba(74,14,122,0.75)' : 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11,
            }}>📁</button>
          {showAssign && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowAssign(false)} />
              <div style={{
                position: 'absolute', top: '110%', left: 0, zIndex: 100,
                background: dark ? '#1d1729' : '#fffdf6',
                border: '1px solid ' + (dark ? '#3d2f56' : 'rgba(74,14,122,0.22)'),
                borderRadius: 8, boxShadow: '0 8px 24px rgba(15,8,28,0.3)',
                overflow: 'hidden', minWidth: 140,
              }}>
                <div style={{ padding: '5px 10px', fontFamily: 'var(--ac-font-ui)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: dark ? '#80738f' : 'var(--ac-fg-3)' }}>Assegna a</div>
                <div onClick={() => { onAssignItem(file.id, null); setShowAssign(false); }} style={{ padding: '7px 12px', fontFamily: 'var(--ac-font-ui)', fontSize: 12, color: !currentProject ? (dark ? '#c4a9e8' : '#4A0E7A') : (dark ? '#f3eef9' : 'var(--ac-fg-1)'), fontWeight: !currentProject ? 600 : 400, cursor: 'pointer', background: !currentProject ? (dark ? 'rgba(74,14,122,0.15)' : 'rgba(74,14,122,0.06)') : 'transparent' }}>
                  Nessun progetto
                </div>
                {projects.map(p => (
                  <div key={p.id} onClick={() => { onAssignItem(file.id, p.id); setShowAssign(false); }}
                    style={{ padding: '7px 12px', fontFamily: 'var(--ac-font-ui)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: currentProject === p.id ? (dark ? '#c4a9e8' : '#4A0E7A') : (dark ? '#f3eef9' : 'var(--ac-fg-1)'), fontWeight: currentProject === p.id ? 600 : 400, background: currentProject === p.id ? (dark ? 'rgba(74,14,122,0.15)' : 'rgba(74,14,122,0.06)') : 'transparent' }}>
                    <span>{p.emoji || '📁'}</span>
                    {p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {isImg && (
        <span style={{
          position: 'absolute', top: 6, left: 6, padding: '2px 6px', borderRadius: 4,
          fontFamily: 'var(--ac-font-mono)', fontSize: 9, fontWeight: 600,
          background: 'rgba(31,14,46,0.7)', color: '#fff', letterSpacing: '0.04em',
        }}>{file.ext}</span>
      )}
      {file.locked && (
        <span style={{
          position: 'absolute', top: 6, right: onDragOut ? 34 : 6,
          width: 18, height: 18, borderRadius: 4, fontSize: 10,
          background: 'rgba(31,14,46,0.7)', color: '#7eb661',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>🔒</span>
      )}
      {file.category && file.category !== 'unknown' && (
        <span style={{
          position: 'absolute', bottom: 34, left: 6, padding: '1px 5px', borderRadius: 3,
          fontFamily: 'var(--ac-font-mono)', fontSize: 8, fontWeight: 600, letterSpacing: '0.06em',
          background: 'rgba(31,14,46,0.75)', color: '#FF8A33', textTransform: 'uppercase',
        }}>{file.category}</span>
      )}
      {/* Bottom padding leaves room (32px) for the share button overlay so the metadata
          row never sits under the button. Right padding on the meta row protects it
          when hovered (share button is 22px + 6px inset = ~30px right gutter). */}
      <div style={{ padding: '7px 10px 32px' }}>
        <div style={{
          fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500,
          color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{file.name}</div>
        <div style={{
          fontFamily: 'var(--ac-font-mono)', fontSize: 9.5,
          color: dark ? '#80738f' : 'var(--ac-fg-3)', marginTop: 1,
          display: 'flex', alignItems: 'center', gap: 4,
          paddingRight: 32,
        }}>
          <span>{file.size} · {formatAgo(file.at)}</span>
          {file.tags?.length > 0 && (
            <span style={{ color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)' }}>· {file.tags.length} tag{file.tags.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Search input
// =============================================================
export function SearchInput({ value, onChange, placeholder = 'Search clips, files, tags…', dark = false, autoFocus = false, kbd = '⌘ K', focusRef }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(autoFocus);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);
  useEffect(() => { if (focusRef) focusRef.current = { focus: () => ref.current?.focus() }; }, [focusRef]);

  const accent = dark ? '#FF8A33' : '#4A0E7A';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      background: dark ? '#110b1a' : '#fffdf6',
      border: '1px solid ' + (focused ? accent : (dark ? '#2e2440' : 'var(--ac-dust)')),
      borderRadius: 10,
      boxShadow: focused ? `0 0 0 3px ${dark ? 'rgba(255,138,51,0.14)' : 'rgba(74,14,122,0.10)'}` : 'none',
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
export function EmptyState({ icon, iconName, title, body, dark = false }) {
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
// Drop overlay
// =============================================================
export function DropOverlay({ visible, dark = false, onDropInto, projects = [], onDismiss }) {
  const T = useT();
  const [hoverTarget, setHoverTarget] = useState('auto');
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === 'Escape') onDismiss?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onDismiss]);
  if (!visible) return null;

  const targets = [
    { id: 'auto',  icon: 'zap',     label: T('overlay.auto'),       sub: T('overlay.autoSub') },
    { id: 'text',  icon: 'pilcrow', label: T('sidebar.text'),       sub: T('overlay.textSub') },
    { id: 'code',  icon: 'code',    label: T('sidebar.code'),       sub: T('overlay.codeSub') },
    { id: 'url',   icon: 'link',    label: T('sidebar.links'),      sub: T('overlay.linksSub') },
    { id: 'files', icon: 'inbox',   label: 'Drop Zone',             sub: T('overlay.dropZoneSub') },
    { id: 'pin',   icon: 'star',    label: T('sidebar.pinned'),     sub: T('overlay.pinnedSub') },
  ];

  const handleDrop = (id) => (e) => { e.preventDefault(); e.stopPropagation(); onDropInto?.(id, e); };
  const allowDrop = (e) => e.preventDefault();

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(255,107,0,0.10)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      animation: 'ac-drop-in 200ms cubic-bezier(0.22,0.61,0.36,1)',
    }}>
      <div style={{ position: 'absolute', inset: 16, border: '2.5px dashed #FF6B00', borderRadius: 18, pointerEvents: 'none' }} />
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 10,
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <AnarchiveMark size={64} />
        <div style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 30, color: dark ? '#fff' : '#1f0e2e', lineHeight: 1.05 }}>{T('overlay.dropTitle')}</div>
        <div style={{ fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 13, color: dark ? '#ffc899' : '#5a2a78' }}>
          {T('overlay.dropSub')}
        </div>
      </div>
      <div style={{ flex: 'none', padding: '14px 22px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: dark ? '#ffc899' : '#b34a02', textAlign: 'center',
        }}>{T('overlay.dropInto')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(100px, 1fr))`, gap: 8 }}>
          {targets.map(t => {
            const isAuto = t.id === 'auto';
            const isHover = hoverTarget === t.id;
            return (
              <div
                key={t.id}
                onDragEnter={() => setHoverTarget(t.id)}
                onDragOver={allowDrop}
                onDrop={handleDrop(t.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 6, padding: '14px 8px 12px',
                  background: isHover ? (isAuto ? '#FF6B00' : (dark ? '#261e36' : '#fffdf6')) : (dark ? 'rgba(29,23,41,0.85)' : 'rgba(255,253,246,0.92)'),
                  border: isHover ? '2px solid #FF6B00' : `2px dashed ${isAuto ? '#FF6B00' : (dark ? '#3d2f56' : '#d9d2c1')}`,
                  borderRadius: 12,
                  color: isHover && isAuto ? '#fff' : (dark ? '#f3eef9' : '#1f0e2e'),
                  cursor: 'copy',
                  transition: 'all 120ms cubic-bezier(0.22,0.61,0.36,1)',
                  transform: isHover ? 'translateY(-2px)' : 'none',
                  boxShadow: isHover ? '0 10px 24px -8px rgba(255,107,0,0.4)' : 'none',
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: isHover && isAuto ? 'rgba(255,255,255,0.18)' : (isAuto ? '#FF6B00' : 'transparent'),
                  color: isAuto && !isHover ? '#fff' : (isHover && !isAuto ? '#FF6B00' : (dark ? '#FFA866' : 'var(--ac-vermillion-600)')),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={t.icon} size={16} strokeWidth={2} />
                </div>
                <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600, lineHeight: 1 }}>{t.label}</div>
                <div style={{
                  fontFamily: 'var(--ac-font-mono)', fontSize: 9.5,
                  color: isHover && isAuto ? 'rgba(255,255,255,0.85)' : (dark ? '#80738f' : 'var(--ac-fg-3)'),
                  textAlign: 'center', lineHeight: 1.3,
                }}>{t.sub}</div>
              </div>
            );
          })}
        </div>
        {projects.length > 0 && (
          <>
            <div style={{
              fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: dark ? '#ffc899' : '#b34a02', textAlign: 'center', marginTop: 6,
            }}>Drop into a project</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {projects.map(p => {
                const tid = `project:${p.id}`;
                const isHover = hoverTarget === tid;
                return (
                  <div
                    key={p.id}
                    onDragEnter={() => setHoverTarget(tid)}
                    onDragOver={allowDrop}
                    onDrop={handleDrop(tid)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px',
                      background: isHover ? '#4A0E7A' : (dark ? 'rgba(29,23,41,0.85)' : 'rgba(255,253,246,0.92)'),
                      border: isHover ? '2px solid #4A0E7A' : `2px dashed ${dark ? '#3d2f56' : '#c4b8d8'}`,
                      borderRadius: 10, cursor: 'copy',
                      color: isHover ? '#fff' : (dark ? '#c4a9e8' : '#4A0E7A'),
                      transition: 'all 120ms cubic-bezier(0.22,0.61,0.36,1)',
                      transform: isHover ? 'translateY(-2px)' : 'none',
                      boxShadow: isHover ? '0 10px 24px -8px rgba(74,14,122,0.4)' : 'none',
                    }}>
                    <Icon name="briefcase" size={12} strokeWidth={2} />
                    <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600 }}>
                      {p.name.length > 16 ? p.name.slice(0, 14) + '…' : p.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div style={{
          fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: dark ? '#80738f' : 'var(--ac-fg-3)',
          textAlign: 'center', marginTop: 2,
        }}>Release on a section to override · <Kbd dark={dark}>esc</Kbd> to cancel</div>
      </div>
    </div>
  );
}
