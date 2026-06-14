import React, { useState, useEffect } from 'react';
import { Icon, TrafficLights, AnarchiveMark, Kbd } from './components.jsx';
import { useT } from './i18n.js';

export function OnboardingView({ onFinish }) {
  const T = useT();
  const [step, setStep] = useState(0);
  const steps = [
    { id: 'welcome' }, { id: 'storage' }, { id: 'shortcut' },
    { id: 'access' },  { id: 'ready' },
  ];

  const handleFinish = () => {
    try { localStorage.setItem('ac.onboardingDone', '1'); } catch {}
    onFinish();
  };

  return (
    <div data-screen-label="05 Onboarding"
      style={{
        width: 560, height: 600, borderRadius: 14, overflow: 'hidden',
        background: '#faf7ee',
        boxShadow: '0 0 0 1px rgba(31,14,46,0.10), 0 24px 60px rgba(31,14,46,0.25)',
        display: 'flex', flexDirection: 'column',
        position: 'relative', fontFamily: 'var(--ac-font-ui)',
      }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 14px', height: 38, flex: 'none',
        background: '#fffdf6', borderBottom: '1px solid var(--ac-dust)',
      }}>
        <TrafficLights />
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--ac-font-brand)', fontSize: 14, color: 'var(--ac-plum-900)' }}>
          Anarchive
        </div>
        <div style={{ width: 52, fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: 'var(--ac-fg-3)', textAlign: 'right' }}>
          {step + 1} / {steps.length}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {step === 0 && <StepWelcome  T={T} onNext={() => setStep(1)} />}
        {step === 1 && <StepStorage  T={T} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
        {step === 2 && <StepShortcut T={T} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <StepAccess   T={T} onBack={() => setStep(2)} onNext={() => setStep(4)} />}
        {step === 4 && <StepReady    T={T} onFinish={handleFinish} />}
      </div>

      <div style={{
        flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '14px 0 18px',
        background: '#fffdf6', borderTop: '1px solid var(--ac-dust)',
      }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{
            width: i === step ? 22 : 6, height: 6, borderRadius: 999,
            background: i <= step ? '#FF6B00' : 'var(--ac-dust-strong)',
            transition: 'all 200ms cubic-bezier(0.22,0.61,0.36,1)',
          }} />
        ))}
      </div>
    </div>
  );
}

function StepBody({ children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 48px', gap: 22,
      minHeight: '100%', textAlign: 'center',
    }}>{children}</div>
  );
}

function StepTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--ac-font-brand)', fontSize: 32, fontWeight: 400,
      color: 'var(--ac-plum-900)', lineHeight: 1.05, letterSpacing: '-0.01em', maxWidth: 380,
    }}>{children}</div>
  );
}

function StepLede({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 14,
      color: 'var(--ac-fg-2)', lineHeight: 1.55, maxWidth: 360,
    }}>{children}</div>
  );
}

function StepActions({ children }) {
  return <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>{children}</div>;
}

function PrimaryButton({ children, onClick, icon }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px',
        background: hover ? '#FF7E1F' : '#FF6B00',
        color: '#fff', border: 0, borderRadius: 8,
        fontFamily: 'var(--ac-font-ui)', fontSize: 13.5, fontWeight: 600,
        cursor: 'pointer',
        transform: hover ? 'scale(1.04)' : 'scale(1)',
        boxShadow: hover
          ? '0 0 0 1px rgba(255,138,51,0.55), 0 0 22px 3px rgba(255,138,51,0.40), 0 6px 16px rgba(255,107,0,0.35)'
          : '0 1px 2px rgba(31,14,46,0.04), 0 2px 6px -1px rgba(255,107,0,0.35)',
        transition: 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), background 180ms ease',
      }}>
      {children}
      {icon && <Icon name={icon} size={13} strokeWidth={2.25} />}
    </button>
  );
}

function GhostBtn({ children, onClick, icon }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px',
        background: hover ? 'rgba(255,138,51,0.08)' : 'transparent',
        color: hover ? '#b34a02' : 'var(--ac-plum-800)',
        border: '1px solid ' + (hover ? '#FF8A33' : 'var(--ac-dust-strong)'),
        borderRadius: 8,
        fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
        transform: hover ? 'scale(1.04)' : 'scale(1)',
        boxShadow: hover ? '0 0 0 1px rgba(255,138,51,0.40), 0 0 12px 0 rgba(255,138,51,0.30)' : 'none',
        transition: 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 180ms cubic-bezier(0.4, 0, 0.2, 1), background 180ms ease, border-color 180ms ease, color 180ms ease',
      }}>
      {icon && <Icon name={icon} size={12} strokeWidth={2} />}
      {children}
    </button>
  );
}

function StepWelcome({ T, onNext }) {
  return (
    <StepBody>
      <AnarchiveMark size={96} />
      <StepTitle>{T('onboarding.welcome.title')}</StepTitle>
      <StepLede>{T('onboarding.welcome.lede')}</StepLede>
      <StepActions>
        <PrimaryButton onClick={onNext} icon="arrowRight">{T('onboarding.welcome.cta')}</PrimaryButton>
      </StepActions>
      <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: 'var(--ac-fg-3)', marginTop: 6, letterSpacing: '0.04em' }}>
        {T('onboarding.welcome.time')}
      </div>
    </StepBody>
  );
}

function StepStorage({ T, onBack, onNext }) {
  const [path, setPath] = useState('~/Anarchive');
  useEffect(() => {
    if (window.anarchive?.vault?.getPath) {
      window.anarchive.vault.getPath().then(p => { if (p) setPath(p); }).catch(() => {});
    }
  }, []);
  const browse = async () => {
    if (window.anarchive) {
      const p = await window.anarchive.vault.choosePath();
      if (p) setPath(p);
    }
  };
  // C10: persist the chosen path on Next
  const handleNext = async () => {
    if (window.anarchive?.settings?.setVaultPath && path && path !== '~/Anarchive') {
      try { await window.anarchive.settings.setVaultPath(path, { migrate: false }); } catch {}
    }
    try { localStorage.setItem('ac.vaultPath', JSON.stringify(path)); } catch {}
    onNext();
  };
  return (
    <StepBody>
      <div style={{ color: '#4A0E7A' }}><Icon name="folder" size={48} strokeWidth={1.25} /></div>
      <StepTitle>{T('onboarding.storage.title')}</StepTitle>
      <StepLede>{T('onboarding.storage.lede')}</StepLede>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: '#fffdf6', border: '1px solid var(--ac-dust)', borderRadius: 8, width: 360,
      }}>
        <span style={{ color: 'var(--ac-vermillion-600)', display: 'flex' }}>
          <Icon name="folder" size={14} strokeWidth={1.75} />
        </span>
        <input value={path} onChange={(e) => setPath(e.target.value)} style={{
          flex: 1, background: 'transparent', border: 0, outline: 'none',
          fontFamily: 'var(--ac-font-mono)', fontSize: 12, color: 'var(--ac-fg-1)',
        }} />
        <button onClick={browse} style={{
          background: 'transparent', border: 0, color: 'var(--ac-plum-700)',
          fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
        }}>{T('onboarding.storage.browse')}</button>
      </div>
      <StepActions>
        <GhostBtn onClick={onBack} icon="arrowLeft">{T('onboarding.back')}</GhostBtn>
        <PrimaryButton onClick={handleNext} icon="arrowRight">{T('onboarding.next')}</PrimaryButton>
      </StepActions>
    </StepBody>
  );
}

function StepShortcut({ T, onBack, onNext }) {
  const [keys, setKeys] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem('ac.shortcut') || '["Alt","Space"]');
      return Array.isArray(v) ? v : ['Alt', 'Space'];
    } catch { return ['Alt', 'Space']; }
  });
  const [recording, setRecording] = useState(false);

  // C9: actually capture keystrokes during recording
  useEffect(() => {
    if (!recording) return;
    const onKeyDown = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const mods = [];
      if (e.ctrlKey)  mods.push('Ctrl');
      if (e.altKey)   mods.push('Alt');
      if (e.metaKey)  mods.push('Super');
      if (e.shiftKey) mods.push('Shift');
      if (['Control','Alt','Meta','Shift'].includes(e.key)) return;
      const key = e.key === ' ' ? 'Space' : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
      const parts = [...mods, key];
      if (parts.length < 2) return; // require at least one modifier
      setKeys(parts);
      setRecording(false);
      try { localStorage.setItem('ac.shortcut', JSON.stringify(parts)); } catch {}
      if (window.anarchive?.settings?.setShortcut) {
        await window.anarchive.settings.setShortcut(parts.join('+')).catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('ac:shortcutChanged', { detail: parts }));
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recording]);

  return (
    <StepBody>
      <div style={{ color: '#4A0E7A' }}><Icon name="keyboard" size={48} strokeWidth={1.25} /></div>
      <StepTitle>{T('onboarding.shortcut.title')}</StepTitle>
      <StepLede>{T('onboarding.shortcut.lede')}</StepLede>
      <div
        onClick={() => setRecording(r => !r)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 16px',
          background: recording ? 'rgba(255,107,0,0.10)' : '#fffdf6',
          border: '2px ' + (recording ? 'dashed #FF6B00' : 'solid var(--ac-dust)'),
          borderRadius: 10, cursor: 'pointer',
        }}>
        {recording ? (
          <span style={{ fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ac-vermillion-700)' }}>
            {T('onboarding.shortcut.recording')}
          </span>
        ) : (
          <>
            {keys.map(k => <Kbd key={k}>{k}</Kbd>)}
            <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500, color: 'var(--ac-plum-700)', marginLeft: 8 }}>
              {T('onboarding.shortcut.changeHint')}
            </span>
          </>
        )}
      </div>
      <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 10.5, color: 'var(--ac-fg-3)' }}>
        {T('onboarding.shortcut.registered')} <kbd style={{ fontFamily: 'inherit', fontSize: 10, padding: '1px 5px', background: 'var(--ac-plum-50)', color: 'var(--ac-plum-700)', borderRadius: 3 }}>{keys.join(' ')}</kbd>
      </div>
      <StepActions>
        <GhostBtn onClick={onBack} icon="arrowLeft">{T('onboarding.back')}</GhostBtn>
        <PrimaryButton onClick={onNext} icon="arrowRight">{T('onboarding.next')}</PrimaryButton>
      </StepActions>
    </StepBody>
  );
}

function StepAccess({ T, onBack, onNext }) {
  const [granted, setGranted] = useState(false);

  const requestAccess = async () => {
    if (window.anarchive) {
      const ok = await window.anarchive.system.requestAccessibility().catch(() => false);
      setGranted(!!ok);
    } else {
      setGranted(true);
    }
  };

  return (
    <StepBody>
      <div style={{ color: '#4A0E7A' }}><Icon name="shieldCheck" size={48} strokeWidth={1.25} /></div>
      <StepTitle>{T('onboarding.access.title')}</StepTitle>
      <StepLede>{T('onboarding.access.lede')}</StepLede>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', width: 360,
        background: granted ? '#eef0dc' : '#fffdf6',
        border: '1px solid ' + (granted ? '#a3c777' : 'var(--ac-dust)'),
        borderRadius: 10, transition: 'all 200ms',
      }}>
        <span style={{ color: granted ? '#4a5621' : 'var(--ac-fg-3)', display: 'flex' }}>
          <Icon name={granted ? 'check' : 'shieldCheck'} size={22} strokeWidth={1.75} />
        </span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ac-fg-1)' }}>{T('onboarding.access.label')}</div>
          <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, color: 'var(--ac-fg-3)', marginTop: 2 }}>
            {granted ? T('onboarding.access.granted') : T('onboarding.access.required')}
          </div>
        </div>
        <button onClick={granted ? undefined : requestAccess} style={{
          padding: '6px 12px',
          background: granted ? 'transparent' : '#4A0E7A', color: granted ? '#4a5621' : '#fff',
          border: granted ? '1px solid #a3c777' : 0, borderRadius: 6,
          fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600,
          cursor: granted ? 'default' : 'pointer',
        }}>{granted ? T('onboarding.access.grantedBtn') : T('onboarding.access.grantBtn')}</button>
      </div>
      <StepActions>
        <GhostBtn onClick={onBack} icon="arrowLeft">{T('onboarding.back')}</GhostBtn>
        <PrimaryButton onClick={onNext} icon="arrowRight">{T('onboarding.next')}</PrimaryButton>
      </StepActions>
    </StepBody>
  );
}

function StepReady({ T, onFinish }) {
  // M23: re-read shortcut each render in case it was changed in a previous step
  const [shortcutKeys, setShortcutKeys] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem('ac.shortcut') || '["Alt","Space"]');
      return Array.isArray(v) ? v : ['Alt', 'Space'];
    } catch { return ['Alt', 'Space']; }
  });
  useEffect(() => {
    const handler = (e) => setShortcutKeys(e.detail);
    window.addEventListener('ac:shortcutChanged', handler);
    return () => window.removeEventListener('ac:shortcutChanged', handler);
  }, []);
  return (
    <StepBody>
      <div style={{ position: 'relative' }}>
        <AnarchiveMark size={96} />
        <div style={{
          position: 'absolute', bottom: -6, right: -10,
          width: 28, height: 28, borderRadius: 999,
          background: '#4A0E7A', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '3px solid #faf7ee',
        }}>
          <Icon name="check" size={14} strokeWidth={3} />
        </div>
      </div>
      <StepTitle>{T('onboarding.ready.title')}</StepTitle>
      <StepLede>
        {T('onboarding.ready.lede', { q: '' }).split('%q')[0]}
        {shortcutKeys.map((k, i) => <Kbd key={i}>{k}</Kbd>)}
        {T('onboarding.ready.lede', { q: '' }).split('%q')[1] || ''}
      </StepLede>
      <StepActions>
        <PrimaryButton onClick={onFinish} icon="arrowRight">{T('onboarding.ready.cta')}</PrimaryButton>
      </StepActions>
    </StepBody>
  );
}
