// views-onboarding.jsx — First-launch flow.
// Four-step walkthrough; light paper background, centered narrow column.
// Loaded AFTER components.jsx.

const { useState: useStateO } = React;

function OnboardingView({ onFinish }) {
  const [step, setStep] = useStateO(0);
  const steps = [
    { id: 'welcome',  title: 'Welcome' },
    { id: 'storage',  title: 'Choose where it lives' },
    { id: 'shortcut', title: 'Pick a shortcut' },
    { id: 'access',   title: 'Grant access' },
    { id: 'ready',    title: 'Ready' },
  ];

  return (
    <div data-screen-label="05 Onboarding"
      style={{
        width: 560, height: 600, borderRadius: 14, overflow: 'hidden',
        background: '#faf7ee',
        boxShadow: '0 0 0 1px rgba(31,14,46,0.10), 0 24px 60px rgba(31,14,46,0.25)',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        fontFamily: 'var(--ac-font-ui)',
      }}>
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 14px', height: 38, flex: 'none',
        background: '#fffdf6',
        borderBottom: '1px solid var(--ac-dust)',
      }}>
        <TrafficLights />
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--ac-font-brand)', fontSize: 14, color: 'var(--ac-plum-900)' }}>
          Anarchive
        </div>
        <div style={{ width: 52, fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: 'var(--ac-fg-3)', textAlign: 'right' }}>
          {step + 1} / {steps.length}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {step === 0 && <StepWelcome  onNext={() => setStep(1)} />}
        {step === 1 && <StepStorage  onBack={() => setStep(0)} onNext={() => setStep(2)} />}
        {step === 2 && <StepShortcut onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <StepAccess   onBack={() => setStep(2)} onNext={() => setStep(4)} />}
        {step === 4 && <StepReady    onFinish={onFinish} />}
      </div>

      {/* Progress dots */}
      <div style={{
        flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '14px 0 18px',
        background: '#fffdf6',
        borderTop: '1px solid var(--ac-dust)',
      }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{
            width: i === step ? 22 : 6,
            height: 6, borderRadius: 999,
            background: i <= step ? '#FF6B00' : 'var(--ac-dust-strong)',
            transition: 'all 200ms cubic-bezier(0.22,0.61,0.36,1)',
          }} />
        ))}
      </div>
    </div>
  );
}

// ---- shared atoms ----
function StepBody({ children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 48px', gap: 22, minHeight: '100%',
      textAlign: 'center',
    }}>{children}</div>
  );
}

function StepTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--ac-font-brand)', fontSize: 32, fontWeight: 400,
      color: 'var(--ac-plum-900)', lineHeight: 1.05, letterSpacing: '-0.01em',
      maxWidth: 380,
    }}>{children}</div>
  );
}

function StepLede({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 14,
      color: 'var(--ac-fg-2)', lineHeight: 1.55, maxWidth: 360,
      textWrap: 'pretty',
    }}>{children}</div>
  );
}

function StepActions({ children }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>{children}</div>
  );
}

function PrimaryButton({ children, onClick, icon }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '9px 18px',
      background: '#FF6B00', color: '#fff',
      border: 0, borderRadius: 8,
      fontFamily: 'var(--ac-font-ui)', fontSize: 13.5, fontWeight: 600,
      cursor: 'pointer',
      boxShadow: '0 1px 2px rgba(31,14,46,0.04), 0 2px 6px -1px rgba(255,107,0,0.35)',
    }}>
      {children}
      {icon && <Icon name={icon} size={13} strokeWidth={2.25} />}
    </button>
  );
}

function GhostBtn({ children, onClick, icon }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '9px 16px',
      background: 'transparent', color: 'var(--ac-plum-800)',
      border: '1px solid var(--ac-dust-strong)', borderRadius: 8,
      fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 500,
      cursor: 'pointer',
    }}>
      {icon && <Icon name={icon} size={12} strokeWidth={2} />}
      {children}
    </button>
  );
}

// ---- steps ----
function StepWelcome({ onNext }) {
  return (
    <StepBody>
      <AnarchiveMark size={96} />
      <StepTitle>An archive of your own.</StepTitle>
      <StepLede>
        Anarchive keeps a quiet copy of everything you copy — text, links, snippets,
        the file you almost lost. Local-only. Keyboard-first. Out of your way until you need it.
      </StepLede>
      <StepActions>
        <PrimaryButton onClick={onNext} icon="arrowRight">Get started</PrimaryButton>
      </StepActions>
      <div style={{
        fontFamily: 'var(--ac-font-mono)', fontSize: 10, color: 'var(--ac-fg-3)',
        marginTop: 6, letterSpacing: '0.04em',
      }}>takes about 60 seconds.</div>
    </StepBody>
  );
}

function StepStorage({ onBack, onNext }) {
  const [path, setPath] = useStateO('~/Library/Anarchive');
  return (
    <StepBody>
      <div style={{ color: '#4A0E7A' }}><Icon name="folder" size={48} strokeWidth={1.25} /></div>
      <StepTitle>Where should it live?</StepTitle>
      <StepLede>
        Anarchive stores everything in a folder on this Mac. Nothing is uploaded anywhere.
        You can move it later in Settings.
      </StepLede>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        background: '#fffdf6', border: '1px solid var(--ac-dust)',
        borderRadius: 8, width: 360,
      }}>
        <span style={{ color: 'var(--ac-vermillion-600)', display: 'flex' }}>
          <Icon name="folder" size={14} strokeWidth={1.75} />
        </span>
        <input value={path} onChange={(e) => setPath(e.target.value)} style={{
          flex: 1, background: 'transparent', border: 0, outline: 'none',
          fontFamily: 'var(--ac-font-mono)', fontSize: 12, color: 'var(--ac-fg-1)',
        }} />
        <button style={{
          background: 'transparent', border: 0, color: 'var(--ac-plum-700)',
          fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500,
          cursor: 'pointer',
        }}>Browse…</button>
      </div>
      <StepActions>
        <GhostBtn onClick={onBack} icon="arrowLeft">Back</GhostBtn>
        <PrimaryButton onClick={onNext} icon="arrowRight">Next</PrimaryButton>
      </StepActions>
    </StepBody>
  );
}

function StepShortcut({ onBack, onNext }) {
  const [keys, setKeys] = useStateO(['⌥', 'Space']);
  const [recording, setRecording] = useStateO(false);
  return (
    <StepBody>
      <div style={{ color: '#4A0E7A' }}><Icon name="keyboard" size={48} strokeWidth={1.25} /></div>
      <StepTitle>Press one combo to bring it up.</StepTitle>
      <StepLede>
        Pick a shortcut you'll remember. Anarchive will open from anywhere — on top of any other app —
        when you press it.
      </StepLede>
      <div
        onClick={() => setRecording(r => !r)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '12px 16px',
          background: recording ? 'rgba(255,107,0,0.10)' : '#fffdf6',
          border: '2px ' + (recording ? 'dashed #FF6B00' : 'solid var(--ac-dust)'),
          borderRadius: 10, cursor: 'pointer',
        }}>
        {recording ? (
          <span style={{
            fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
            fontSize: 14, color: 'var(--ac-vermillion-700)',
          }}>press your combo…</span>
        ) : (
          <>
            {keys.map(k => <Kbd key={k}>{k}</Kbd>)}
            <span style={{
              fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, fontWeight: 500,
              color: 'var(--ac-plum-700)', marginLeft: 8,
            }}>tap to change</span>
          </>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--ac-font-mono)', fontSize: 10.5, color: 'var(--ac-fg-3)',
      }}>recommended: <kbd style={{ fontFamily: 'inherit', fontSize: 10, padding: '1px 5px', background: 'var(--ac-plum-50)', color: 'var(--ac-plum-700)', borderRadius: 3 }}>⌥ Space</kbd> · doesn't clash with macOS defaults.</div>
      <StepActions>
        <GhostBtn onClick={onBack} icon="arrowLeft">Back</GhostBtn>
        <PrimaryButton onClick={onNext} icon="arrowRight">Next</PrimaryButton>
      </StepActions>
    </StepBody>
  );
}

function StepAccess({ onBack, onNext }) {
  const [granted, setGranted] = useStateO(false);
  return (
    <StepBody>
      <div style={{ color: '#4A0E7A' }}><Icon name="shieldCheck" size={48} strokeWidth={1.25} /></div>
      <StepTitle>One quick permission.</StepTitle>
      <StepLede>
        Anarchive needs to read the system clipboard. Nothing is sent anywhere —
        clips stay in the folder you just picked.
      </StepLede>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', width: 360,
        background: granted ? '#eef0dc' : '#fffdf6',
        border: '1px solid ' + (granted ? '#a3c777' : 'var(--ac-dust)'),
        borderRadius: 10, transition: 'all 200ms',
      }}>
        <span style={{ color: granted ? '#4a5621' : 'var(--ac-fg-3)', display: 'flex' }}>
          <Icon name={granted ? 'check' : 'shieldCheck'} size={22} strokeWidth={1.75} />
        </span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ac-fg-1)' }}>
            Clipboard access
          </div>
          <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11.5, color: 'var(--ac-fg-3)', marginTop: 2 }}>
            {granted ? 'Granted — Anarchive can read what you copy.' : 'Required for the app to work.'}
          </div>
        </div>
        <button onClick={() => setGranted(g => !g)} style={{
          padding: '6px 12px',
          background: granted ? 'transparent' : '#4A0E7A',
          color: granted ? '#4a5621' : '#fff',
          border: granted ? '1px solid #a3c777' : 0,
          borderRadius: 6,
          fontFamily: 'var(--ac-font-ui)', fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
        }}>{granted ? 'Granted' : 'Grant access'}</button>
      </div>
      <StepActions>
        <GhostBtn onClick={onBack} icon="arrowLeft">Back</GhostBtn>
        <PrimaryButton onClick={onNext} icon="arrowRight">Next</PrimaryButton>
      </StepActions>
    </StepBody>
  );
}

function StepReady({ onFinish }) {
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
      <StepTitle>You're set.</StepTitle>
      <StepLede>
        Copy something — anything — and Anarchive will keep it.
        Hit <Kbd>⌥</Kbd> <Kbd>Space</Kbd> to come back to it.
      </StepLede>
      <StepActions>
        <PrimaryButton onClick={onFinish} icon="arrowRight">Open Anarchive</PrimaryButton>
      </StepActions>
    </StepBody>
  );
}

Object.assign(window, { OnboardingView });
