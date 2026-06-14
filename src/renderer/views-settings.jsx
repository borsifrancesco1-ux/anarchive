import React, { useState, useEffect } from 'react';
import { Icon, TrafficLights, BackButton, Kbd, AnarchiveMark } from './components.jsx';
import { useT, LangContext, LANG_OPTIONS } from './i18n.js';
import { TUTORIAL_STEP_COMPONENTS } from './tutorial-animations.jsx';
import aboutMascotGif from './assets/about-mascot.gif';

// Persists a value to localStorage; survives navigation and restarts.
function usePersisted(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });
  const set = (v) => {
    setValue(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  return [value, set];
}

export function SettingsView({ theme = 'light', onTheme, onClose, canGoBack = false, onBack, lang, onLang }) {
  const dark = theme === 'dark';
  const [cat, setCat] = useState('general');
  const T = useT();

  const bg     = dark ? '#15101c' : '#faf7ee';
  const panel  = dark ? '#1d1729' : '#fffdf6';
  const sunken = dark ? '#110b1a' : '#f3ecda';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const fg1    = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2    = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';

  const cats = [
    { id: 'general',         label: T('nav.general'),         icon: 'settings'    },
    { id: 'shortcuts',       label: T('nav.shortcuts'),       icon: 'keyboard'    },
    { id: 'storage',         label: T('nav.storage'),         icon: 'hardDrive'   },
    { id: 'privacy',         label: T('nav.privacy'),         icon: 'shieldCheck' },
    { id: 'functionalities', label: T('nav.functionalities'),  icon: 'zap'         },
    { id: 'about',           label: T('nav.about'),           icon: 'fileText'    },
  ];

  return (
    <div data-screen-label="04 Settings"
      style={{
        width: 760, height: 560, borderRadius: 12, overflow: 'hidden',
        background: bg,
        boxShadow: dark
          ? '0 0 0 1px rgba(0,0,0,0.5), 0 24px 60px rgba(15,8,28,0.55)'
          : '0 0 0 1px rgba(31,14,46,0.10), 0 24px 60px rgba(31,14,46,0.20)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'var(--ac-font-ui)',
      }}>
      {/* Titlebar — drag region with no-drag exceptions for interactive controls */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 14px', height: 38, flex: 'none',
        background: panel, borderBottom: '1px solid ' + border,
        WebkitAppRegion: 'drag', userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' }}>
          <TrafficLights dark={dark} onClose={onClose} />
          {canGoBack && <BackButton onClick={onBack} dark={dark} label={T('nav.back')} />}
        </div>
        <div style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 14, color: fg1, textAlign: 'center' }}>
          {T('nav.settings')}
        </div>
        <div />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{
          width: 180, flex: 'none',
          background: dark ? panel : '#2a0e3f',
          borderRight: '1px solid ' + (dark ? border : '#4A0E7A'),
          padding: '14px 0',
        }}>
          {cats.map(c => {
            const active = cat === c.id;
            const itemFg = dark ? (active ? '#f3eef9' : fg2) : (active ? '#fff' : 'rgba(243,238,249,0.78)');
            const iconFg = active ? '#FF8A33' : (dark ? fg3 : 'rgba(243,238,249,0.52)');
            return (
              <div key={c.id} onClick={() => setCat(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 12px', margin: '0 8px', borderRadius: 6,
                cursor: 'pointer',
                background: active ? '#4A0E7A' : 'transparent',
                color: itemFg, fontWeight: active ? 500 : 400, fontSize: 13,
                boxShadow: active ? '0 1px 0 rgba(0,0,0,0.18)' : 'none',
              }}>
                <span style={{ color: iconFg, display: 'flex' }}>
                  <Icon name={c.icon} size={14} strokeWidth={1.75} />
                </span>
                {c.label}
              </div>
            );
          })}
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {cat === 'general'         && <GeneralSection         {...{ dark, theme, onTheme, fg1, fg2, fg3, panel, border, sunken, lang, onLang }} />}
          {cat === 'shortcuts'       && <ShortcutsSection       {...{ dark, fg1, fg2, fg3, panel, border, sunken }} />}
          {cat === 'storage'         && <StorageSection         {...{ dark, fg1, fg2, fg3, panel, border, sunken }} />}
          {cat === 'privacy'         && <PrivacySection         {...{ dark, fg1, fg2, fg3, panel, border, sunken }} />}
          {cat === 'functionalities' && <FunctionalitiesSection {...{ dark, fg1, fg2, fg3, panel, border }} />}
          {cat === 'about'           && <AboutSection           {...{ dark, fg1, fg2, fg3 }} />}
        </div>
      </div>
    </div>
  );
}

// ---- shared form atoms ----
function Section({ title, children, fg1 }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 20, color: fg1, marginBottom: 14, letterSpacing: '-0.005em' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</div>
    </section>
  );
}

function Row({ label, sub, control, fg1, fg3, panel, border, first }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '12px 14px',
      background: panel,
      borderTop: first ? '1px solid ' + border : 0,
      borderBottom: '1px solid ' + border,
      borderLeft: '1px solid ' + border,
      borderRight: '1px solid ' + border,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 500, color: fg1 }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, color: fg3, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flex: 'none' }}>{control}</div>
    </div>
  );
}

function Toggle({ on, onChange, dark }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 34, height: 20, borderRadius: 999,
      background: on ? '#FF6B00' : (dark ? '#3d2f56' : 'var(--ac-dust-strong)'),
      position: 'relative', cursor: 'pointer', transition: 'background 140ms',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 16 : 2,
        width: 16, height: 16, borderRadius: 999, background: '#fff',
        boxShadow: '0 1px 2px rgba(31,14,46,0.2)',
        transition: 'left 140ms cubic-bezier(0.22,0.61,0.36,1)',
      }} />
    </div>
  );
}

function TextField({ value, onChange, dark, monospace = false }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} style={{
      width: 280, padding: '7px 10px',
      background: dark ? '#110b1a' : '#fffdf6',
      border: '1px solid ' + (dark ? '#2e2440' : 'var(--ac-dust)'),
      borderRadius: 6, color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
      fontFamily: monospace ? 'var(--ac-font-mono)' : 'var(--ac-font-ui)',
      fontSize: monospace ? 12 : 13, outline: 'none',
    }} />
  );
}

function Select({ value, options, onChange, dark }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      padding: '6px 10px',
      background: dark ? '#110b1a' : '#fffdf6',
      border: '1px solid ' + (dark ? '#2e2440' : 'var(--ac-dust)'),
      borderRadius: 6, color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
      fontFamily: 'var(--ac-font-ui)', fontSize: 13, outline: 'none', cursor: 'pointer',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// H-3: KbdCapture actually records keypresses and calls onKeys(keysArray, acceleratorString)
function KbdCapture({ keys, onKeys, dark }) {
  const T = useT();
  const [recording, setRecording] = useState(false);
  const [currentKeys, setCurrentKeys] = useState(keys);

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e) => {
      e.preventDefault();
      const mods = [];
      if (e.ctrlKey)  mods.push('Ctrl');
      if (e.altKey)   mods.push('Alt');
      if (e.metaKey)  mods.push('Super');
      if (e.shiftKey) mods.push('Shift');
      if (['Control', 'Alt', 'Meta', 'Shift'].includes(e.key)) return;
      const key = e.key === ' ' ? 'Space' : e.key;
      const parts = [...mods, key];
      setCurrentKeys(parts);
      setRecording(false);
      onKeys?.(parts, parts.join('+'));
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recording, onKeys]);

  return (
    <div
      onClick={() => setRecording(r => !r)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6,
        background: recording ? (dark ? 'rgba(255,107,0,0.12)' : 'rgba(255,107,0,0.06)') : (dark ? '#110b1a' : '#fffdf6'),
        border: '1px solid ' + (recording ? '#FF6B00' : (dark ? '#2e2440' : 'var(--ac-dust)')),
        cursor: 'pointer', transition: 'all 120ms',
      }}>
      {recording ? (
        <span style={{ fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 11, color: '#FF6B00' }}>
          {T('settings.shortcuts.pressCombo')}
        </span>
      ) : (
        <>
          {currentKeys.map(k => <Kbd key={k} dark={dark}>{k}</Kbd>)}
          <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 10.5, color: dark ? '#80738f' : 'var(--ac-fg-3)', marginLeft: 6 }}>
            {T('settings.shortcuts.clickToRebind')}
          </span>
        </>
      )}
    </div>
  );
}

function GhostButton({ children, onClick, dark, danger, disabled }) {
  const [hover, setHover] = useState(false);
  const active = hover && !disabled;
  const baseBorder = danger ? 'var(--ac-danger)' : (dark ? '#3d2f56' : 'var(--ac-dust-strong)');
  const hoverBorder = danger ? 'var(--ac-danger)' : '#FF8A33';
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        background: active
          ? (danger ? 'rgba(229,67,58,0.10)' : (dark ? 'rgba(255,138,51,0.10)' : 'rgba(255,138,51,0.06)'))
          : 'transparent',
        border: '1px solid ' + (active ? hoverBorder : baseBorder),
        borderRadius: 6,
        color: disabled
          ? (dark ? '#3d2f56' : 'var(--ac-dust-strong)')
          : (danger ? 'var(--ac-danger)' : (dark ? '#f3eef9' : 'var(--ac-plum-800)')),
        fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 500,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: active ? 'scale(1.04)' : 'scale(1)',
        zIndex: active ? 2 : 1,
        boxShadow: active
          ? (danger
              ? '0 0 0 1px rgba(229,67,58,0.45), 0 0 10px 0 rgba(229,67,58,0.30)'
              : '0 0 0 1px rgba(255,138,51,0.45), 0 0 10px 0 rgba(255,138,51,0.32)')
          : 'none',
        transition: 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 180ms cubic-bezier(0.4, 0, 0.2, 1), background 180ms ease, border-color 180ms ease',
      }}>{children}</button>
  );
}

// ---- Shortcut tutorial modal ----
function getShortcutSteps(T) {
  const s = (k) => [
    { title: T(`shortcut.${k}.s1.title`), body: T(`shortcut.${k}.s1.body`) },
    { title: T(`shortcut.${k}.s2.title`), body: T(`shortcut.${k}.s2.body`) },
    { title: T(`shortcut.${k}.s3.title`), body: T(`shortcut.${k}.s3.body`) },
  ];
  return { open: s('open'), paste: s('paste'), pasteKeep: s('pasteKeep'), forget: s('forget'), search: s('search') };
}

function ShortcutTutorialModal({ shortcutKey, title, explanation, steps: stepsProp, dark, onClose }) {
  const T = useT();
  const [step, setStep] = useState(0);
  const steps = stepsProp || getShortcutSteps(T)[shortcutKey] || [];
  const total = steps.length;
  const current = steps[step] || {};
  const StepAnim = TUTORIAL_STEP_COMPONENTS[shortcutKey]?.[step];

  const bg     = dark ? '#1d1729' : '#fffdf6';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const fg1    = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2    = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';
  const panel  = dark ? '#261e36' : '#f3ecda';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,8,28,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <div style={{
        width: 420, borderRadius: 14,
        background: bg, border: '1px solid ' + border,
        boxShadow: '0 32px 80px rgba(15,8,28,0.45)',
        overflow: 'hidden', fontFamily: 'var(--ac-font-ui)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 18px 14px',
          borderBottom: '1px solid ' + border,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--ac-font-ui)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)', marginBottom: 4,
            }}>{T('settings.shortcuts.tutorialTitle')}</div>
            <div style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 18, color: fg1, lineHeight: 1, letterSpacing: '-0.005em' }}>{title}</div>
            <div style={{ fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 12.5, color: fg2, marginTop: 5, lineHeight: 1.45 }}>{explanation}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid ' + border,
            color: fg3, borderRadius: 5, width: 22, height: 22, flex: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={11} strokeWidth={2.25} />
          </button>
        </div>

        {/* Step visual — placeholder architecture for future real assets */}
        <div style={{ padding: '20px 18px 16px' }}>
          <div style={{
            background: panel, borderRadius: 10,
            padding: '20px 18px', minHeight: 110,
            display: 'flex', flexDirection: 'column', gap: 10,
            border: '1px solid ' + border,
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Step counter badge */}
            <div style={{
              position: 'absolute', top: 12, right: 14,
              fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, color: fg3,
            }}>{T('settings.shortcuts.step')} {step + 1} {T('settings.shortcuts.of')} {total}</div>

            {/* Placeholder visual: step indicator dots */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              {steps.map((_, i) => (
                <div key={i} onClick={() => setStep(i)} style={{
                  width: i === step ? 20 : 6, height: 6, borderRadius: 3,
                  background: i === step ? '#FF6B00' : (dark ? '#3d2f56' : 'var(--ac-dust-strong)'),
                  cursor: 'pointer', transition: 'all 180ms cubic-bezier(0.22,0.61,0.36,1)',
                  flex: 'none',
                }} />
              ))}
            </div>

            <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 14, fontWeight: 600, color: fg1, lineHeight: 1.2 }}>
              {current.title}
            </div>
            <div style={{ fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 12.5, color: fg2, lineHeight: 1.5 }}>
              {current.body}
            </div>

            {StepAnim && (
              <div style={{ marginTop: 8 }}>
                <StepAnim />
              </div>
            )}
          </div>

          {/* Step nav */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 6,
                background: 'transparent',
                border: '1px solid ' + border,
                color: step === 0 ? fg3 : fg1,
                opacity: step === 0 ? 0.4 : 1,
                fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 500, cursor: step === 0 ? 'default' : 'pointer',
              }}>
              <Icon name="arrowLeft" size={12} strokeWidth={2} /> {T('settings.shortcuts.prev')}
            </button>

            {step < total - 1 ? (
              <button onClick={() => setStep(s => Math.min(total - 1, s + 1))} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 6,
                background: '#FF6B00', color: '#fff', border: 0,
                fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(255,107,0,0.35)',
              }}>
                {T('settings.shortcuts.next')} <Icon name="arrowRight" size={12} strokeWidth={2} />
              </button>
            ) : (
              <button onClick={onClose} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 6,
                background: '#FF6B00', color: '#fff', border: 0,
                fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(255,107,0,0.35)',
              }}>
                <Icon name="check" size={12} strokeWidth={2.5} /> {T('settings.shortcuts.dismiss')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Shortcut row with help button
function ShortcutRow({ label, sub, keys, onKeys, dark, tutorialKey, fg1, fg2, fg3, panel, border, first }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const T = useT();

  const helpText = {
    open:       T('settings.shortcuts.openHelp'),
    paste:      T('settings.shortcuts.pasteHelp'),
    pasteKeep:  T('settings.shortcuts.pasteKeepHelp'),
    forget:     T('settings.shortcuts.forgetHelp'),
    search:     T('settings.shortcuts.focusSearchHelp'),
  }[tutorialKey] || '';

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, padding: '12px 14px',
        background: panel,
        borderTop: first ? '1px solid ' + border : 0,
        borderBottom: '1px solid ' + border,
        borderLeft: '1px solid ' + border,
        borderRight: '1px solid ' + border,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 500, color: fg1 }}>{label}</div>
          <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, color: fg3, marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          {onKeys ? (
            <KbdCapture keys={keys} onKeys={onKeys} dark={dark} />
          ) : (
            <KbdCapture keys={keys} dark={dark} />
          )}
          <button
            onClick={() => setHelpOpen(true)}
            title={T('settings.shortcuts.learnMore')}
            style={{
              width: 22, height: 22, borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent',
              border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust-strong)'),
              color: dark ? '#80738f' : 'var(--ac-fg-3)',
              fontFamily: 'var(--ac-font-ui)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', transition: 'all 120ms', flex: 'none',
            }}>
            ?
          </button>
        </div>
      </div>
      {helpOpen && (
        <ShortcutTutorialModal
          shortcutKey={tutorialKey}
          title={label}
          explanation={helpText}
          dark={dark}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </>
  );
}

// Fixed (in-app) shortcut row — displays keys statically, no rebind UI
function InAppShortcutRow({ label, sub, keys, dark, tutorialKey, fg1, fg3, panel, border, first }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const T = useT();
  const helpText = {
    paste:      T('settings.shortcuts.pasteHelp'),
    pasteKeep:  T('settings.shortcuts.pasteKeepHelp'),
    forget:     T('settings.shortcuts.forgetHelp'),
    search:     T('settings.shortcuts.focusSearchHelp'),
  }[tutorialKey] || '';
  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, padding: '12px 14px',
        background: panel,
        borderTop: first ? '1px solid ' + border : 0,
        borderBottom: '1px solid ' + border,
        borderLeft: '1px solid ' + border,
        borderRight: '1px solid ' + border,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 500, color: fg1 }}>{label}</div>
          {sub && <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, color: fg3, marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            {keys.map(k => <Kbd key={k} dark={dark}>{k}</Kbd>)}
          </div>
          <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 10, color: fg3, opacity: 0.6, whiteSpace: 'nowrap' }}>{T('settings.shortcuts.builtIn')}</span>
          {tutorialKey && (
            <button onClick={() => setHelpOpen(true)} title={T('settings.shortcuts.learnMore')}
              style={{
                width: 22, height: 22, borderRadius: 999, flex: 'none',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust-strong)'),
                color: dark ? '#80738f' : 'var(--ac-fg-3)',
                fontFamily: 'var(--ac-font-ui)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>?</button>
          )}
        </div>
      </div>
      {helpOpen && (
        <ShortcutTutorialModal shortcutKey={tutorialKey} title={label} explanation={helpText || sub} dark={dark} onClose={() => setHelpOpen(false)} />
      )}
    </>
  );
}

// ---- sections ----
// C14: persist + push to main IPC so the toggle actually takes effect
function usePersistedAndSynced(key, defaultValue, mainKey) {
  const [val, setVal] = usePersisted(key, defaultValue);
  const setSynced = (v) => {
    setVal(v);
    if (window.anarchive?.settings?.set && mainKey) {
      window.anarchive.settings.set({ [mainKey]: v }).catch(() => {});
    }
  };
  return [val, setSynced];
}

function GeneralSection({ dark, theme, onTheme, fg1, fg3, panel, border, lang, onLang }) {
  const T = useT();
  const [launchAtLogin, setLaunchAtLogin] = usePersisted('ac.launchAtLogin', true);
  const [showInDock,    setShowInDock]    = usePersisted('ac.showInDock',    false);
  const [confirmDelete, setConfirmDelete] = usePersisted('ac.confirmDelete', true);

  // Sync from vault settings on mount so localStorage never shows stale defaults
  useEffect(() => {
    if (!window.anarchive) return;
    window.anarchive.settings.get().then(s => {
      if (!s) return;
      if (typeof s.launchAtLogin === 'boolean') setLaunchAtLogin(s.launchAtLogin);
      if (typeof s.showInDock    === 'boolean') setShowInDock(s.showInDock);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyLaunchAtLogin = (v) => {
    setLaunchAtLogin(v);
    window.anarchive?.settings?.set({ launchAtLogin: v }).catch(() => {});
  };
  const applyShowInDock = (v) => {
    setShowInDock(v);
    window.anarchive?.settings?.set({ showInDock: v }).catch(() => {});
  };
  return (
    <Section title={T('settings.general.title')} fg1={fg1}>
      <Row first label={T('settings.general.launchAtLogin')} sub={T('settings.general.launchSub')}
        control={<Toggle on={launchAtLogin} onChange={applyLaunchAtLogin} dark={dark} />}
        {...{ fg1, fg3, panel, border, first: true }} />
      <Row label={T('settings.general.showInDock')} sub={T('settings.general.showInDockSub')}
        control={<Toggle on={showInDock} onChange={applyShowInDock} dark={dark} />}
        {...{ fg1, fg3, panel, border }} />
      <Row label={T('settings.general.theme')} sub={T('settings.general.themeSub')}
        control={<Select value={theme} options={[
          { value: 'light', label: T('settings.general.themeLight') },
          { value: 'dark',  label: T('settings.general.themeDark') },
          { value: 'auto',  label: T('settings.general.themeAuto') },
        ]} onChange={onTheme} dark={dark} />}
        {...{ fg1, fg3, panel, border }} />
      <Row label={T('settings.general.confirmDelete')} sub={T('settings.general.confirmSub')}
        control={<Toggle on={confirmDelete} onChange={setConfirmDelete} dark={dark} />}
        {...{ fg1, fg3, panel, border }} />
      <Row label={T('settings.general.language')} sub={T('settings.general.languageSub')}
        control={<Select value={lang || 'en'} options={LANG_OPTIONS} onChange={onLang} dark={dark} />}
        {...{ fg1, fg3, panel, border }} />
    </Section>
  );
}

function ShortcutsSection({ dark, fg1, fg2, fg3, panel, border }) {
  const T = useT();
  const [launcherKeys, setLauncherKeys] = usePersisted('ac.shortcut', ['Alt', 'Space']);
  const [shortcutMsg, setShortcutMsg]   = useState(null);

  useEffect(() => {
    if (!window.anarchive) return;
    window.anarchive.settings.get().then(s => {
      if (s?.shortcut) setLauncherKeys(s.shortcut.split('+'));
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLauncherShortcut = async (keys, accelerator) => {
    setLauncherKeys(keys);
    window.dispatchEvent(new CustomEvent('ac:shortcutChanged', { detail: keys }));
    if (window.anarchive) {
      const ok = await window.anarchive.settings.setShortcut(accelerator);
      setShortcutMsg(ok ? T('settings.shortcuts.updated') : `"${accelerator}" ${T('settings.shortcuts.taken')}`);
    } else {
      setShortcutMsg(T('settings.shortcuts.savedRestart'));
    }
    setTimeout(() => setShortcutMsg(null), 3000);
  };

  const rowProps = { dark, fg1, fg3, panel, border };

  return (
    <>
      <Section title={T('settings.shortcuts.globalTitle')} fg1={fg1}>
        <div style={{
          fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
          fontSize: 12, color: fg3, marginBottom: 10, lineHeight: 1.55,
        }}>
          {T('settings.shortcuts.globalSub')}
        </div>
        <ShortcutRow first
          label={T('settings.shortcuts.openAnarchive')}
          sub={T('settings.shortcuts.openSub')}
          keys={launcherKeys} onKeys={handleLauncherShortcut}
          tutorialKey="open"
          {...rowProps}
        />
        {shortcutMsg && (
          <div style={{
            padding: '8px 14px', fontSize: 12,
            fontFamily: 'var(--ac-font-ui)', color: fg3,
            background: panel, borderBottom: '1px solid ' + border,
            borderLeft: '1px solid ' + border, borderRight: '1px solid ' + border,
          }}>{shortcutMsg}</div>
        )}
      </Section>

      <Section title={T('settings.shortcuts.inAppTitle')} fg1={fg1}>
        <div style={{
          fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
          fontSize: 12, color: fg3, marginBottom: 10, lineHeight: 1.55,
        }}>
          {T('settings.shortcuts.inAppSub')}
        </div>
        <InAppShortcutRow first
          label={T('settings.shortcuts.pasteSelection')}
          sub={T('settings.shortcuts.pasteSub')}
          keys={['Enter']} tutorialKey="paste" {...rowProps} />
        <InAppShortcutRow
          label={T('settings.shortcuts.pasteKeep')}
          sub={T('settings.shortcuts.pasteKeepSub')}
          keys={['Ctrl', 'Enter']} tutorialKey="pasteKeep" {...rowProps} />
        <InAppShortcutRow
          label={T('settings.shortcuts.forgetItem')}
          sub={T('settings.shortcuts.forgetSub')}
          keys={['Delete']} tutorialKey="forget" {...rowProps} />
        <InAppShortcutRow
          label={T('settings.shortcuts.focusSearch')}
          sub={T('settings.shortcuts.focusSearchSub')}
          keys={['Ctrl', 'K']} tutorialKey="search" {...rowProps} />
      </Section>
    </>
  );
}

function StorageSection({ dark, fg1, fg2, fg3, panel, border }) {
  const T = useT();
  const [savedPath, setSavedPath] = usePersisted('ac.vaultPath', '~/Anarchive');
  const [path,      setPath]      = useState(savedPath);
  // Retention as numeric days; "forever" = 0
  const [retention, setRet]       = usePersisted('ac.retention', 0);
  const [maxItems,  setMaxItems]  = usePersisted('ac.maxItems',  5000);
  const [maxSize,   setMaxSize]   = usePersisted('ac.maxSize',   500);
  const [saveMsg,   setSaveMsg]   = useState(null);
  const [trashCount, setTrashCount] = useState(null);

  const applyRet      = (v) => { setRet(v);      window.anarchive?.settings?.set({ retention: v }).catch(() => {}); };
  const applyMaxItems = (v) => { setMaxItems(v);  window.anarchive?.settings?.set({ maxItems:  v }).catch(() => {}); };
  const applyMaxSize  = (v) => { setMaxSize(v);   window.anarchive?.settings?.set({ maxSize:   v }).catch(() => {}); };

  // Sanitize numeric inputs
  const onChangeMaxItems = (v) => applyMaxItems(Math.max(50,  Math.min(50000, parseInt(String(v).replace(/\D/g, ''), 10) || 50)));
  const onChangeMaxSize  = (v) => applyMaxSize(Math.max(10,   Math.min(10000, parseInt(String(v).replace(/\D/g, ''), 10) || 10)));

  useEffect(() => {
    if (!window.anarchive) return;
    window.anarchive.vault.getPath().then(p => {
      if (p) { setPath(p); setSavedPath(p); }
    }).catch(() => {});
    window.anarchive.settings.get().then(s => {
      if (!s) return;
      if (s.retention != null) setRet(Number(s.retention));
      if (s.maxItems  != null) setMaxItems(Number(s.maxItems));
      if (s.maxSize   != null) setMaxSize(Number(s.maxSize));
    }).catch(() => {});
    window.anarchive.vault.trashCount?.().then(n => setTrashCount(n ?? 0)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choosePath = async () => {
    if (window.anarchive) {
      const p = await window.anarchive.vault.choosePath();
      if (p) setPath(p);
    } else {
      window.alert(T('settings.storage.choose'));
    }
  };

  // A19/C1: confirm + migrate vault contents to new folder
  const savePath = async () => {
    if (!window.confirm(T('misc.confirmChangePath'))) return;
    if (window.anarchive) {
      const result = await window.anarchive.settings.setVaultPath(path).catch(() => ({ ok: false }));
      if (result?.ok) {
        setSavedPath(path);
        setSaveMsg(T('settings.storage.savedRestart'));
      } else {
        setSaveMsg(result?.message || result?.reason || T('settings.storage.savedRestart'));
      }
    } else {
      setSavedPath(path);
      setSaveMsg(T('settings.storage.savedRestart'));
    }
    setTimeout(() => setSaveMsg(null), 3500);
  };

  const emptyTrash = async () => {
    if (!window.confirm(T('settings.storage.confirmEmpty'))) return;
    if (window.anarchive?.vault?.emptyTrash) {
      await window.anarchive.vault.emptyTrash().catch(() => {});
    }
    setTrashCount(0);
    setSaveMsg(T('settings.storage.emptied'));
    setTimeout(() => setSaveMsg(null), 2500);
  };

  const pathChanged = path !== savedPath;
  const retentionOpts = [
    { value: 1,   label: T('retention.1day') },
    { value: 7,   label: T('retention.7days') },
    { value: 30,  label: T('retention.30days') },
    { value: 0,   label: T('retention.forever') },
  ];

  return (
    <Section title={T('settings.storage.title')} fg1={fg1}>
      <Row first label={T('settings.storage.location')} sub={T('settings.storage.locationSub')}
        control={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TextField value={path} onChange={setPath} dark={dark} monospace />
          <GhostButton dark={dark} onClick={choosePath}>{T('settings.storage.choose')}</GhostButton>
          {pathChanged && (
            <GhostButton dark={dark} onClick={savePath}>{T('settings.storage.save')}</GhostButton>
          )}
        </div>}
        {...{ fg1, fg3, panel, border, first: true }} />
      {saveMsg && (
        <div style={{
          padding: '8px 14px', fontSize: 12,
          fontFamily: 'var(--ac-font-ui)', color: fg3,
          background: panel, borderBottom: '1px solid ' + border,
          borderLeft: '1px solid ' + border, borderRight: '1px solid ' + border,
        }}>{saveMsg}</div>
      )}
      <Row label={T('settings.storage.retention')} sub={T('settings.storage.retentionSub')}
        control={<Select value={Number(retention) || 0} options={retentionOpts}
          onChange={(v) => applyRet(Number(v))} dark={dark} />}
        {...{ fg1, fg3, panel, border }} />
      <Row label={T('settings.storage.maxItems')} sub={T('settings.storage.maxItemsSub')}
        control={<TextField value={String(maxItems)} onChange={onChangeMaxItems} dark={dark} monospace />}
        {...{ fg1, fg3, panel, border }} />
      <Row label={T('settings.storage.maxSize')} sub={T('settings.storage.maxSizeSub')}
        control={<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TextField value={String(maxSize)} onChange={onChangeMaxSize} dark={dark} monospace />
          <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 12, color: fg3 }}>MB</span>
        </div>}
        {...{ fg1, fg3, panel, border }} />
      <Row label={T('settings.storage.emptyTrash')}
        sub={trashCount != null
          ? (trashCount === 0 ? T('settings.storage.emptyTrashEmpty') : T('settings.storage.emptyTrashSub'))
          : T('settings.storage.emptyTrashSub')}
        control={
          <GhostButton dark={dark} danger onClick={emptyTrash}
            disabled={trashCount === 0}>
            {T('settings.storage.emptyTrash')}{trashCount != null && trashCount > 0 ? ` (${trashCount})` : ''}
          </GhostButton>
        }
        {...{ fg1, fg3, panel, border }} />
    </Section>
  );
}

function PrivacySection({ dark, fg1, fg2, fg3, panel, border }) {
  const T = useT();
  const [excludePw, setExcludePw] = usePersisted('ac.excludePw', true);
  const accent = dark ? '#FF8A33' : 'var(--ac-vermillion-600)';

  useEffect(() => {
    if (!window.anarchive) return;
    window.anarchive.settings.get().then(s => {
      if (typeof s?.excludePw === 'boolean') setExcludePw(s.excludePw);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyExcludePw = (v) => {
    setExcludePw(v);
    window.anarchive?.settings?.set({ excludePw: v }).catch(() => {});
  };
  const guarantees = [
    { ok: true,  key: 'g1' },
    { ok: true,  key: 'g2' },
    { ok: true,  key: 'g3' },
    { ok: true,  key: 'g4' },
    { ok: false, key: 'g5' },
    { ok: false, key: 'g6' },
  ];
  return (
    <Section title={T('settings.privacy.title')} fg1={fg1}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '16px 18px', marginBottom: 20,
        background: dark ? 'rgba(255,107,0,0.08)' : 'var(--ac-vermillion-50)',
        border: '1px solid ' + (dark ? 'rgba(255,107,0,0.25)' : 'var(--ac-vermillion-200)'),
        borderRadius: 10,
      }}>
        <span style={{ color: accent, display: 'flex', marginTop: 2 }}>
          <Icon name="cloudOff" size={22} strokeWidth={1.75} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 14, fontWeight: 600, color: fg1, marginBottom: 5 }}>
            {T('settings.privacy.localOnly')}
          </div>
          <div style={{ fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 13, color: fg2, lineHeight: 1.6 }}>
            {T('settings.privacy.localOnlySub')}
          </div>
        </div>
      </div>

      <div style={{ background: panel, border: '1px solid ' + border, borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
        {guarantees.map(({ ok, key }, i) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px',
            borderTop: i === 0 ? 0 : '1px solid ' + border,
          }}>
            <span style={{
              display: 'flex', marginTop: 1, flex: 'none',
              color: ok ? (dark ? '#7eb661' : '#4a5621') : (dark ? '#5a4f6c' : 'var(--ac-fg-3)'),
            }}>
              <Icon name={ok ? 'check' : 'x'} size={13} strokeWidth={2.5} />
            </span>
            <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, color: fg2, lineHeight: 1.5 }}>
              {T('settings.privacy.' + key)}
            </span>
          </div>
        ))}
      </div>

      <Row first label={T('settings.privacy.excludePw')} sub={T('settings.privacy.excludePwSub')}
        control={<Toggle on={excludePw} onChange={applyExcludePw} dark={dark} />}
        {...{ fg1, fg3, panel, border, first: true }} />

      <div style={{ marginTop: 14 }} />
      <div style={{
        padding: '11px 14px',
        fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
        fontSize: 12.5, color: fg3, lineHeight: 1.6,
        background: panel, border: '1px solid ' + border, borderRadius: 8,
      }}>
        {T('settings.privacy.openSource')}
      </div>
    </Section>
  );
}

// ---- Functionalities section ----
const FUNCTIONALITY_ICONS = {
  clipboard:           'clipboard',
  archive:             'archive',
  ocr:                 'scan',
  search:              'search',
  snippets:            'fileText',
  tags:                'tag',
  privacy:             'shieldCheck',
  batch:               'checkSquare',
  plainText:           'type',
  lock:                'lock',
  categories:          'layers',
  tray:                'monitor',
  recycleModifiedClips:'rotate',
};

const FUNC_KEYS = ['clipboard','archive','ocr','search','snippets','tags','privacy','batch','plainText','lock','categories','tray'];

function getFunctionalities(T) {
  return FUNC_KEYS.map(k => ({
    key:  k,
    icon: FUNCTIONALITY_ICONS[k],
    title: T(`func.${k}.title`),
    desc:  T(`func.${k}.desc`),
  }));
}

function getFunctionalitySteps(T) {
  const steps = (k) => [
    { title: T(`func.${k}.s1.title`), body: T(`func.${k}.s1.body`) },
    { title: T(`func.${k}.s2.title`), body: T(`func.${k}.s2.body`) },
    { title: T(`func.${k}.s3.title`), body: T(`func.${k}.s3.body`) },
  ];
  return Object.fromEntries([...FUNC_KEYS, 'recycleModifiedClips'].map(k => [k, steps(k)]));
}

function FuncRow({ icon, title, desc, dark, fg1, fg3, panel, border, first, onHelp }) {
  const T = useT();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: panel,
      borderTop: first ? '1px solid ' + border : 0,
      borderBottom: '1px solid ' + border,
      borderLeft: '1px solid ' + border,
      borderRight: '1px solid ' + border,
    }}>
      <span style={{ color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)', display: 'flex', flex: 'none' }}>
        <Icon name={icon} size={15} strokeWidth={1.75} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 500, color: fg1 }}>{title}</div>
        <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, color: fg3, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
      <button
        onClick={onHelp}
        title={T('shortcut.learnHow')}
        style={{
          width: 22, height: 22, borderRadius: 999, flex: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent',
          border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust-strong)'),
          color: dark ? '#80738f' : 'var(--ac-fg-3)',
          fontFamily: 'var(--ac-font-ui)', fontSize: 11, fontWeight: 600,
          cursor: 'pointer',
        }}>?</button>
    </div>
  );
}

function FuncRowWithToggle({ icon, title, desc, dark, fg1, fg3, panel, border, first, onHelp, toggled, onToggle }) {
  const T = useT();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: panel,
      borderTop: first ? '1px solid ' + border : 0,
      borderBottom: '1px solid ' + border,
      borderLeft: '1px solid ' + border,
      borderRight: '1px solid ' + border,
    }}>
      <span style={{ color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)', display: 'flex', flex: 'none' }}>
        <Icon name={icon} size={15} strokeWidth={1.75} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 500, color: fg1 }}>{title}</div>
        <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, color: fg3, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
        <Toggle on={toggled} onChange={onToggle} dark={dark} />
        <button
          onClick={onHelp}
          title={T('shortcut.learnHow')}
          style={{
            width: 22, height: 22, borderRadius: 999, flex: 'none',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            border: '1px solid ' + (dark ? '#3d2f56' : 'var(--ac-dust-strong)'),
            color: dark ? '#80738f' : 'var(--ac-fg-3)',
            fontFamily: 'var(--ac-font-ui)', fontSize: 11, fontWeight: 600,
            cursor: 'pointer',
          }}>?</button>
      </div>
    </div>
  );
}

function FunctionalitiesSection({ dark, fg1, fg2, fg3, panel, border }) {
  const T = useT();
  const [openKey, setOpenKey] = useState(null);
  const [recycleModified, setRecycleModified] = usePersisted('ac.recycleModifiedClips', false);

  const functionalities = getFunctionalities(T);
  const functionalitySteps = getFunctionalitySteps(T);

  const openFunc = openKey
    ? (functionalities.find(f => f.key === openKey) || (openKey === 'recycleModifiedClips' ? {
        key: 'recycleModifiedClips',
        title: T('func.recycle.title'),
        desc:  T('func.recycle.desc'),
      } : null))
    : null;
  const openSteps = openKey ? (functionalitySteps[openKey] || []) : [];

  return (
    <>
      <Section title={T('settings.functionalities')} fg1={fg1}>
        {functionalities.map((f, i) => (
          <FuncRow
            key={f.key}
            first={i === 0}
            icon={f.icon}
            title={f.title}
            desc={f.desc}
            dark={dark}
            fg1={fg1} fg3={fg3} panel={panel} border={border}
            onHelp={() => setOpenKey(f.key)}
          />
        ))}
        <FuncRowWithToggle
          icon="rotate"
          title={T('func.recycle.title')}
          desc={T('func.recycle.desc')}
          dark={dark}
          fg1={fg1} fg3={fg3} panel={panel} border={border}
          toggled={recycleModified}
          onToggle={setRecycleModified}
          onHelp={() => setOpenKey('recycleModifiedClips')}
        />
      </Section>
      {openFunc && (
        <ShortcutTutorialModal
          shortcutKey={openFunc.key}
          title={openFunc.title}
          explanation={openFunc.desc}
          steps={openSteps}
          dark={dark}
          onClose={() => setOpenKey(null)}
        />
      )}
    </>
  );
}

function AboutSection({ dark, fg1, fg2, fg3 }) {
  const T = useT();
  const [version, setVersion] = useState('—');
  useEffect(() => {
    if (window.anarchive?.system?.getVersion) {
      window.anarchive.system.getVersion().then(v => setVersion(v || '—')).catch(() => setVersion('—'));
    }
  }, []);
  const githubUrl = 'https://github.com/anarchive-app/anarchive';
  const openRepo = () => {
    if (window.anarchive?.system?.openExternal) window.anarchive.system.openExternal(githubUrl);
    else window.open(githubUrl, '_blank');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '36px 24px', textAlign: 'center' }}>
      <AnarchiveMark size={72} />
      <div>
        <div style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 36, color: fg1, lineHeight: 1, letterSpacing: '-0.005em' }}>Anarchive</div>
        <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 11, color: fg3, marginTop: 6 }}>{version}</div>
      </div>
      <div style={{ fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 14, color: fg2, maxWidth: 380, lineHeight: 1.6 }}>
        {T('settings.about.description')}
      </div>
      <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 11.5, color: fg3, letterSpacing: '0.01em' }}>
        {T('settings.about.credit')}
      </div>
      <GhostButton dark={dark} onClick={openRepo}>
        {T('settings.about.github')}
      </GhostButton>
      <img
        src={aboutMascotGif}
        alt=""
        draggable={false}
        style={{
          marginTop: 18,
          width: 160, height: 'auto',
          borderRadius: 12,
          boxShadow: dark
            ? '0 4px 16px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,138,51,0.15)'
            : '0 4px 16px rgba(31,14,46,0.15), 0 0 0 1px rgba(74,14,122,0.10)',
          userSelect: 'none',
        }}
      />
    </div>
  );
}
