// views-settings.jsx — Settings full window.
// Sidebar with categories on the left, form on the right.
// Loaded AFTER components.jsx.

const { useState: useStateS } = React;

function SettingsView({ theme = 'light', onTheme, onClose, canGoBack = false, onBack }) {
  const dark = theme === 'dark';
  const [cat, setCat] = useStateS('general');

  // palette
  const bg     = dark ? '#15101c' : '#faf7ee';
  const panel  = dark ? '#1d1729' : '#fffdf6';
  const sunken = dark ? '#110b1a' : '#f3ecda';
  const border = dark ? '#2e2440' : 'var(--ac-dust)';
  const fg1    = dark ? '#f3eef9' : 'var(--ac-fg-1)';
  const fg2    = dark ? '#b9accd' : 'var(--ac-fg-2)';
  const fg3    = dark ? '#80738f' : 'var(--ac-fg-3)';

  const cats = [
    { id: 'general',   label: 'General',   icon: 'settings' },
    { id: 'shortcuts', label: 'Shortcuts', icon: 'keyboard' },
    { id: 'storage',   label: 'Storage',   icon: 'hardDrive' },
    { id: 'privacy',   label: 'Privacy',   icon: 'shieldCheck' },
    { id: 'about',     label: 'About',     icon: 'fileText' },
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
      {/* Titlebar */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 14px', height: 38, flex: 'none',
        background: panel,
        borderBottom: '1px solid ' + border,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrafficLights dark={dark} onClose={onClose} />
          {canGoBack && <BackButton onClick={onBack} dark={dark} />}
        </div>
        <div style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 14, color: fg1, textAlign: 'center' }}>
          Settings
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
            const itemFg = dark
              ? (active ? '#f3eef9' : fg2)
              : (active ? '#fff' : 'rgba(243,238,249,0.78)');
            const iconFg = active
              ? '#FF8A33'
              : (dark ? fg3 : 'rgba(243,238,249,0.52)');
            return (
              <div key={c.id} onClick={() => setCat(c.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 12px', margin: '0 8px', borderRadius: 6,
                cursor: 'pointer',
                background: active ? '#4A0E7A' : 'transparent',
                color: itemFg,
                fontWeight: active ? 500 : 400,
                fontSize: 13,
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
          {cat === 'general' && <GeneralSection {...{ dark, theme, onTheme, fg1, fg2, fg3, panel, border, sunken }} />}
          {cat === 'shortcuts' && <ShortcutsSection {...{ dark, fg1, fg2, fg3, panel, border, sunken }} />}
          {cat === 'storage' && <StorageSection {...{ dark, fg1, fg2, fg3, panel, border, sunken }} />}
          {cat === 'privacy' && <PrivacySection {...{ dark, fg1, fg2, fg3, panel, border, sunken }} />}
          {cat === 'about' && <AboutSection {...{ dark, fg1, fg2, fg3 }} />}
        </div>
      </div>
    </div>
  );
}

// ---- shared form atoms ----
function Section({ title, children, fg1 }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: 'var(--ac-font-brand)', fontSize: 20,
        color: fg1, marginBottom: 14, letterSpacing: '-0.005em',
      }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </div>
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
      borderLeft: '1px solid ' + border, borderRight: '1px solid ' + border,
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
        width: 16, height: 16, borderRadius: 999,
        background: '#fff',
        boxShadow: '0 1px 2px rgba(31,14,46,0.2)',
        transition: 'left 140ms cubic-bezier(0.22,0.61,0.36,1)',
      }} />
    </div>
  );
}

function TextField({ value, onChange, dark, mono = false, monospace = mono }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} style={{
      width: 280, padding: '7px 10px',
      background: dark ? '#110b1a' : '#fffdf6',
      border: '1px solid ' + (dark ? '#2e2440' : 'var(--ac-dust)'),
      borderRadius: 6,
      color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
      fontFamily: monospace ? 'var(--ac-font-mono)' : 'var(--ac-font-ui)',
      fontSize: monospace ? 12 : 13,
      outline: 'none',
    }} />
  );
}

function Select({ value, options, onChange, dark }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      padding: '6px 10px',
      background: dark ? '#110b1a' : '#fffdf6',
      border: '1px solid ' + (dark ? '#2e2440' : 'var(--ac-dust)'),
      borderRadius: 6,
      color: dark ? '#f3eef9' : 'var(--ac-fg-1)',
      fontFamily: 'var(--ac-font-ui)', fontSize: 13,
      outline: 'none', cursor: 'pointer',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function KbdCapture({ keys, onRebind, dark }) {
  return (
    <div onClick={onRebind} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 8px', borderRadius: 6,
      background: dark ? '#110b1a' : '#fffdf6',
      border: '1px solid ' + (dark ? '#2e2440' : 'var(--ac-dust)'),
      cursor: 'pointer',
    }}>
      {keys.map(k => <Kbd key={k} dark={dark}>{k}</Kbd>)}
      <span style={{
        fontFamily: 'var(--ac-font-ui)', fontSize: 10.5,
        color: dark ? '#80738f' : 'var(--ac-fg-3)', marginLeft: 6,
      }}>click to rebind</span>
    </div>
  );
}

function GhostButton({ children, onClick, dark, danger }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px',
      background: 'transparent',
      border: '1px solid ' + (danger ? 'var(--ac-danger)' : (dark ? '#3d2f56' : 'var(--ac-dust-strong)')),
      borderRadius: 6,
      color: danger ? 'var(--ac-danger)' : (dark ? '#f3eef9' : 'var(--ac-plum-800)'),
      fontFamily: 'var(--ac-font-ui)', fontSize: 12.5, fontWeight: 500,
      cursor: 'pointer',
    }}>{children}</button>
  );
}

// ---- sections ----
function GeneralSection({ dark, theme, onTheme, fg1, fg2, fg3, panel, border, sunken }) {
  const [launchAtLogin, setLaunchAtLogin] = useStateS(true);
  const [showInDock,    setShowInDock]    = useStateS(false);
  const [confirmDelete, setConfirmDelete] = useStateS(true);
  return (
    <>
      <Section title="General" fg1={fg1}>
        <Row first first first label="Launch at login" sub="Anarchive starts with your Mac and runs in the menu bar."
          control={<Toggle on={launchAtLogin} onChange={setLaunchAtLogin} dark={dark} />}
          {...{ fg1, fg3, panel, border, first: true }}
        />
        <Row label="Show in Dock" sub="Also keep an icon in the macOS Dock."
          control={<Toggle on={showInDock} onChange={setShowInDock} dark={dark} />}
          {...{ fg1, fg3, panel, border }}
        />
        <Row label="Theme" sub="Match the OS, or stick to one."
          control={<Select value={theme} options={[
            { value: 'light', label: 'Light' },
            { value: 'dark',  label: 'Dark' },
            { value: 'auto',  label: 'Match system' },
          ]} onChange={onTheme} dark={dark} />}
          {...{ fg1, fg3, panel, border }}
        />
        <Row label="Confirm before deleting" sub="Ask once before forgetting an item."
          control={<Toggle on={confirmDelete} onChange={setConfirmDelete} dark={dark} />}
          {...{ fg1, fg3, panel, border }}
        />
      </Section>
    </>
  );
}

function ShortcutsSection({ dark, fg1, fg2, fg3, panel, border, sunken }) {
  return (
    <>
      <Section title="Shortcuts" fg1={fg1}>
        <Row first label="Open Anarchive" sub="From anywhere — brings up the launcher."
          control={<KbdCapture keys={['⌥', 'Space']} dark={dark} />}
          {...{ fg1, fg3, panel, border, first: true }}
        />
        <Row label="Paste current selection" sub="Inside the launcher."
          control={<KbdCapture keys={['⏎']} dark={dark} />}
          {...{ fg1, fg3, panel, border }}
        />
        <Row label="Paste &amp; keep" sub="Paste without removing from history."
          control={<KbdCapture keys={['⌘', '⏎']} dark={dark} />}
          {...{ fg1, fg3, panel, border }}
        />
        <Row label="Forget item" sub="Delete the selected clip from history."
          control={<KbdCapture keys={['⌫']} dark={dark} />}
          {...{ fg1, fg3, panel, border }}
        />
        <Row label="Show next / previous" sub="Navigate the recent stack without opening the window."
          control={<KbdCapture keys={['⌘', '⇧', 'V']} dark={dark} />}
          {...{ fg1, fg3, panel, border }}
        />
      </Section>
    </>
  );
}

function StorageSection({ dark, fg1, fg2, fg3, panel, border, sunken }) {
  const [path, setPath]         = useStateS('~/Library/Anarchive');
  const [retention, setRet]     = useStateS('forever');
  const [maxItems, setMaxItems] = useStateS('5000');
  const [maxSize, setMaxSize]   = useStateS('500');
  return (
    <>
      <Section title="Storage" fg1={fg1}>
        <Row first label="Location" sub="Everything is stored locally. Pick the folder."
          control={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <TextField value={path} onChange={setPath} dark={dark} monospace />
            <GhostButton dark={dark} onClick={() => window.alert('File picker not available in this demo.')}>Choose…</GhostButton>
          </div>}
          {...{ fg1, fg3, panel, border, first: true }}
        />
        <Row label="Retention" sub="How long to keep clipboard history."
          control={<Select value={retention} options={[
            { value: '1d',       label: '1 day' },
            { value: '7d',       label: '7 days' },
            { value: '30d',      label: '30 days' },
            { value: 'forever',  label: 'Forever' },
          ]} onChange={setRet} dark={dark} />}
          {...{ fg1, fg3, panel, border }}
        />
        <Row label="Max items" sub="When exceeded, oldest non-pinned items are forgotten."
          control={<TextField value={maxItems} onChange={setMaxItems} dark={dark} monospace />}
          {...{ fg1, fg3, panel, border }}
        />
        <Row label="Max size" sub="Hard cap on the Drop Zone in megabytes."
          control={<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TextField value={maxSize} onChange={setMaxSize} dark={dark} monospace />
            <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 12, color: fg3 }}>MB</span>
          </div>}
          {...{ fg1, fg3, panel, border }}
        />
        <Row label="Empty Trash" sub="Permanently delete 12 forgotten clips."
          control={<GhostButton dark={dark} danger onClick={() => { if (window.confirm('Permanently delete 12 forgotten clips? This cannot be undone.')) window.alert('Trash emptied.'); }}>Empty Trash</GhostButton>}
          {...{ fg1, fg3, panel, border }}
        />
      </Section>
    </>
  );
}

function PrivacySection({ dark, fg1, fg2, fg3, panel, border, sunken }) {
  const [analytics,  setAnalytics]  = useStateS(false);
  const [crashLogs,  setCrashLogs]  = useStateS(true);
  const [excludePw,  setExcludePw]  = useStateS(true);
  return (
    <>
      <Section title="Privacy" fg1={fg1}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', marginBottom: 16,
          background: dark ? 'rgba(255,107,0,0.08)' : 'var(--ac-vermillion-50)',
          border: '1px solid ' + (dark ? 'rgba(255,107,0,0.25)' : 'var(--ac-vermillion-200)'),
          borderRadius: 8,
        }}>
          <span style={{ color: dark ? '#FF8A33' : 'var(--ac-vermillion-600)', display: 'flex' }}>
            <Icon name="cloudOff" size={20} strokeWidth={1.75} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 13, fontWeight: 600, color: fg1 }}>
              Local-only by design
            </div>
            <div style={{ fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 12.5, color: fg2, marginTop: 2 }}>
              Anarchive never uploads your clipboard. Nothing leaves this Mac.
            </div>
          </div>
        </div>

        <Row first label="Exclude passwords" sub="Skip anything copied from a password manager or marked secret."
          control={<Toggle on={excludePw} onChange={setExcludePw} dark={dark} />}
          {...{ fg1, fg3, panel, border, first: true }}
        />
        <Row label="Anonymous usage data" sub="Send aggregate counts to help find bugs. Off by default."
          control={<Toggle on={analytics} onChange={setAnalytics} dark={dark} />}
          {...{ fg1, fg3, panel, border }}
        />
        <Row label="Crash reports" sub="Send a stack trace when Anarchive crashes."
          control={<Toggle on={crashLogs} onChange={setCrashLogs} dark={dark} />}
          {...{ fg1, fg3, panel, border }}
        />
        <Row label="Excluded apps" sub="Anarchive won't capture anything copied from these apps."
          control={<GhostButton dark={dark} onClick={() => window.alert('App exclusion list: 1Password, Keychain, Banking app, Slack (DMs). Edit in demo only.')}>Manage (4)</GhostButton>}
          {...{ fg1, fg3, panel, border }}
        />
      </Section>
    </>
  );
}

function AboutSection({ dark, fg1, fg2, fg3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '36px 24px', textAlign: 'center' }}>
      <AnarchiveMark size={72} />
      <div>
        <div style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 36, color: fg1, lineHeight: 1, letterSpacing: '-0.005em' }}>Anarchive</div>
        <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 11, color: fg3, marginTop: 6 }}>1.0.0 · build 2026.05.26</div>
      </div>
      <div style={{
        fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
        fontSize: 14, color: fg2, maxWidth: 360, lineHeight: 1.5,
      }}>
        A quiet shelf for everything you copy. Open-source, local-first, keyboard-driven.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <GhostButton dark={dark} onClick={() => window.open('https://github.com/', '_blank')}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <Icon name="externalLink" size={12} strokeWidth={2} /> Source on GitHub
          </span>
        </GhostButton>
        <GhostButton dark={dark} onClick={() => window.alert('Anarchive 1.0.0 is up to date.')}>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <Icon name="rotate" size={12} strokeWidth={2} /> Check for updates
          </span>
        </GhostButton>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsView });
