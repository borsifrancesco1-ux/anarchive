import React, { useState, useEffect } from 'react';
import { Icon } from './components.jsx';
import { useT } from './i18n.js';

// =============================================================
// Scene wrapper style — defined first so all components can use it
// =============================================================
const sceneStyle = {
  height: 130,
  background: '#0e0918',
  borderRadius: 8,
  overflow: 'hidden',
  position: 'relative',
};

// =============================================================
// Shared primitives
// =============================================================

function KeyPill({ label, active }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '5px 11px', borderRadius: 6, minWidth: 34,
      fontFamily: 'var(--ac-font-mono)', fontSize: 12, fontWeight: 600,
      background: active ? '#FF6B00' : '#1d1729',
      color: active ? '#fff' : '#5a4f6c',
      border: `1.5px solid ${active ? '#FF6B00' : '#2e2440'}`,
      boxShadow: active ? '0 0 14px rgba(255,107,0,0.55)' : 'none',
      transition: 'all 220ms cubic-bezier(0.22,0.61,0.36,1)',
      transform: active ? 'scale(1.06) translateY(-1px)' : 'scale(1) translateY(0)',
      userSelect: 'none',
    }}>{label}</div>
  );
}

function KeyPlus() {
  return (
    <span style={{ color: '#2e2440', fontFamily: 'var(--ac-font-mono)', fontSize: 13, userSelect: 'none' }}>+</span>
  );
}

function MiniClipRow({ icon, text, selected, fading }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 7px', borderRadius: 5,
      background: selected ? '#261e36' : 'transparent',
      opacity: fading ? 0 : 1,
      transform: fading ? 'translateX(6px)' : 'none',
      transition: 'all 320ms cubic-bezier(0.22,0.61,0.36,1)',
    }}>
      <div style={{
        width: 17, height: 17, borderRadius: 4, flex: 'none',
        background: selected ? '#FF6B00' : '#261e36',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: selected ? '#fff' : '#80738f',
        transition: 'background 220ms',
      }}>
        <Icon name={icon} size={9} strokeWidth={2.2} />
      </div>
      <div style={{
        fontFamily: 'var(--ac-font-ui)', fontSize: 10.5,
        color: selected ? '#f3eef9' : '#5a4f6c',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        flex: 1, transition: 'color 220ms',
      }}>{text}</div>
      {selected && (
        <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 8.5, color: 'rgba(255,255,255,0.45)' }}>↵</div>
      )}
    </div>
  );
}

function MiniLauncher({ selIdx = 0, fadingIdx = -1 }) {
  const T = useT();
  const clips = [
    { icon: 'pilcrow', text: 'Remember to call…' },
    { icon: 'link',    text: 'https://github.com' },
    { icon: 'code',    text: 'const x = require(…)' },
  ];
  return (
    <div style={{
      width: 210, borderRadius: 10, overflow: 'hidden',
      background: '#15101c',
      border: '1px solid #2e2440',
      boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px',
        background: '#110b1a', borderBottom: '1px solid #1d1729',
      }}>
        <Icon name="search" size={11} strokeWidth={2.2} color="#FF6B00" />
        <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: '#3d2f56' }}>{T('anim.searchArchive')}</span>
      </div>
      <div style={{ padding: '4px' }}>
        {clips.map((c, i) => (
          <MiniClipRow key={i} icon={c.icon} text={c.text} selected={i === selIdx} fading={i === fadingIdx} />
        ))}
      </div>
    </div>
  );
}

function MiniAppWindow({ text = '', cursor = false, focused = false }) {
  return (
    <div style={{
      width: 110, borderRadius: 7, overflow: 'hidden',
      background: '#1d1729', border: '1px solid #2e2440',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <div style={{
        height: 18, background: '#261e36', borderBottom: '1px solid #2e2440',
        display: 'flex', alignItems: 'center', padding: '0 7px', gap: 4,
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 5, height: 5, borderRadius: 999, background: '#2e2440' }} />
        ))}
      </div>
      <div style={{ padding: '8px 9px', minHeight: 44 }}>
        {text && (
          <div style={{
            fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, color: '#FF8A33',
            lineHeight: 1.4, wordBreak: 'break-all',
          }}>{text}</div>
        )}
        {cursor && (
          <BlinkingCursor />
        )}
        {!text && !cursor && (
          <>
            {[0,1,2].map(i => (
              <div key={i} style={{
                height: 5, borderRadius: 2, background: '#2e2440', marginBottom: 4,
                width: ['70%','55%','40%'][i],
              }} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function BlinkingCursor() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOn(v => !v), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{
      display: 'inline-block', width: 6, height: 11,
      background: on ? '#FF6B00' : 'transparent',
      borderRadius: 1, verticalAlign: 'text-bottom',
      transition: 'background 80ms',
    }} />
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--ac-font-mono)', fontSize: 9, fontWeight: 600,
      letterSpacing: '0.10em', textTransform: 'uppercase',
      color: '#3d2f56',
    }}>{children}</div>
  );
}

// =============================================================
// Open Anarchive — 3 steps
// =============================================================

function OpenStep0() {
  const T = useT();
  return (
    <div style={sceneStyle}>
      {/* desktop with a blurred "other app" window */}
      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #1a0f2e 0%, #2a1848 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {/* fake menubar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 18,
          background: 'rgba(10,5,20,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 10px', gap: 8,
        }}>
          <div style={{
            width: 11, height: 11, borderRadius: 3, background: '#FF6B00',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 7.5, color: '#4A0E7A', lineHeight: 1 }}>A</span>
          </div>
          <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>13:42</span>
        </div>
        {/* blurred app window */}
        <div style={{
          width: 170, height: 80, borderRadius: 8, marginTop: 14,
          background: 'rgba(255,253,246,0.06)',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: 10,
        }}>
          {[60, 85, 70, 45].map((w, i) => (
            <div key={i} style={{ height: 5, borderRadius: 2, background: 'rgba(255,255,255,0.08)', width: w + '%', marginBottom: 4 }} />
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 6, right: 0, left: 0, display: 'flex', justifyContent: 'center' }}>
          <Label>{T('anim.anyAppOpen')}</Label>
        </div>
      </div>
    </div>
  );
}

function OpenStep1() {
  const T = useT();
  const [active, setActive] = useState(false);
  useEffect(() => {
    const fire = () => {
      setActive(true);
      setTimeout(() => setActive(false), 650);
    };
    fire();
    const id = setInterval(fire, 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyPill label="Alt" active={active} />
          <KeyPlus />
          <KeyPill label="Space" active={active} />
        </div>
        <div style={{
          fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 11,
          color: active ? 'rgba(255,107,0,0.8)' : '#2e2440',
          transition: 'color 220ms',
        }}>{T('anim.globalShortcutFires')}</div>
      </div>
    </div>
  );
}

function OpenStep2() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = () => {
      setVisible(false);
      setTimeout(() => setVisible(true), 350);
    };
    show();
    const id = setInterval(show, 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #1a0f2e 0%, #2a1848 100%)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          height: 18, background: 'rgba(10,5,20,0.75)',
          display: 'flex', alignItems: 'center', padding: '0 10px', flex: 'none',
        }}>
          <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>Finder · Edit</span>
        </div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6,
        }}>
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
            transition: 'all 300ms cubic-bezier(0.22,0.61,0.36,1)',
          }}>
            <MiniLauncher selIdx={0} />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Paste — 3 steps
// =============================================================

function PasteStep0() {
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <MiniLauncher selIdx={0} />
      </div>
    </div>
  );
}

function PasteStep1() {
  const T = useT();
  const [sel, setSel] = useState(0);
  const [keyActive, setKeyActive] = useState(false);
  useEffect(() => {
    const tick = () => {
      setKeyActive(true);
      setTimeout(() => {
        setKeyActive(false);
        setSel(s => (s + 1) % 3);
      }, 320);
    };
    const id = setInterval(tick, 950);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', height: '100%', padding: '0 12px' }}>
        <MiniLauncher selIdx={sel} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <KeyPill label="↓" active={keyActive} />
          <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 8.5, color: '#2e2440' }}>{T('anim.navigate')}</div>
        </div>
      </div>
    </div>
  );
}

function PasteStep2() {
  const [phase, setPhase] = useState(0);
  // 0=launcher open, 1=enter pressed, 2=pasted in app, loop
  useEffect(() => {
    const seq = [0, 0, 1, 2, 2, 2, 2, 0];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % seq.length;
      setPhase(seq[i]);
    }, 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', height: '100%', padding: '0 8px' }}>
        {/* launcher fades when pasted */}
        <div style={{ opacity: phase < 2 ? 1 : 0.18, transition: 'opacity 280ms' }}>
          <MiniLauncher selIdx={1} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <KeyPill label="↵" active={phase === 1} />
          {/* target app shows pasted text */}
          <div style={{
            opacity: phase === 2 ? 1 : 0,
            transform: phase === 2 ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.96)',
            transition: 'all 260ms cubic-bezier(0.22,0.61,0.36,1)',
          }}>
            <MiniAppWindow text="https://github.com" />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// PasteKeep — 3 steps
// =============================================================

function PasteKeepStep0() {
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <MiniLauncher selIdx={1} />
      </div>
    </div>
  );
}

function PasteKeepStep1() {
  const T = useT();
  const [active, setActive] = useState(false);
  useEffect(() => {
    const fire = () => { setActive(true); setTimeout(() => setActive(false), 650); };
    fire();
    const id = setInterval(fire, 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyPill label="Ctrl" active={active} />
          <KeyPlus />
          <KeyPill label="↵" active={active} />
        </div>
        <div style={{
          fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 11,
          color: active ? 'rgba(255,107,0,0.8)' : '#2e2440', transition: 'color 220ms',
        }}>{T('anim.pasteWithoutRemoving')}</div>
      </div>
    </div>
  );
}

function PasteKeepStep2() {
  const T = useT();
  const [pasted, setPasted] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPasted(p => !p), 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-evenly', height: '100%', padding: '0 12px' }}>
        {/* launcher still shows item — stays */}
        <div style={{ position: 'relative' }}>
          <MiniLauncher selIdx={1} />
          {/* "still here" badge */}
          <div style={{
            position: 'absolute', top: -5, right: -5,
            width: 15, height: 15, borderRadius: 999,
            background: '#FF6B00',
            border: '1.5px solid #110b1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: pasted ? 1 : 0,
            transform: pasted ? 'scale(1)' : 'scale(0.5)',
            transition: 'all 280ms cubic-bezier(0.22,0.61,0.36,1)',
          }}>
            <Icon name="check" size={8} strokeWidth={3} color="#fff" />
          </div>
        </div>
        {/* target app also shows it */}
        <div style={{
          opacity: pasted ? 1 : 0.2,
          transform: pasted ? 'translateY(0)' : 'translateY(4px)',
          transition: 'all 280ms cubic-bezier(0.22,0.61,0.36,1)',
        }}>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 8.5, color: '#5a4f6c', marginBottom: 3 }}>{T('anim.activeApp')}</div>
            <MiniAppWindow text="https://github.com" />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Forget — 3 steps
// =============================================================

function ForgetStep0() {
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <MiniLauncher selIdx={1} />
      </div>
    </div>
  );
}

function ForgetStep1() {
  const T = useT();
  const [active, setActive] = useState(false);
  useEffect(() => {
    const fire = () => { setActive(true); setTimeout(() => setActive(false), 650); };
    fire();
    const id = setInterval(fire, 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, height: '100%' }}>
        <KeyPill label="⌫  Delete" active={active} />
        <div style={{
          fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 11,
          color: active ? '#e5433a' : '#2e2440', transition: 'color 220ms',
        }}>{T('anim.removesPermanently')}</div>
      </div>
    </div>
  );
}

function ForgetStep2() {
  const T = useT();
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setGone(false);
      setTimeout(() => setGone(true), 900);
    }, 2400);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{
          width: 210, borderRadius: 10, overflow: 'hidden',
          background: '#15101c', border: '1px solid #2e2440',
          boxShadow: '0 10px 30px rgba(0,0,0,0.55)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px',
            background: '#110b1a', borderBottom: '1px solid #1d1729',
          }}>
            <Icon name="search" size={11} strokeWidth={2.2} color="#FF6B00" />
            <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 11, color: '#3d2f56' }}>{T('anim.searchArchive')}</span>
          </div>
          <div style={{ padding: '4px' }}>
            <MiniClipRow icon="pilcrow" text="Remember to call…" selected={false} />
            {/* this one disappears */}
            <div style={{
              overflow: 'hidden',
              maxHeight: gone ? 0 : 28,
              opacity: gone ? 0 : 1,
              transform: gone ? 'translateX(8px)' : 'none',
              transition: 'max-height 360ms cubic-bezier(0.22,0.61,0.36,1), opacity 280ms, transform 280ms',
            }}>
              <MiniClipRow icon="link" text="https://github.com" selected={!gone} />
            </div>
            <MiniClipRow icon="code" text="const x = require(…)" selected={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Focus Search — 3 steps
// =============================================================

function SearchStep0() {
  const T = useT();
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 14px' }}>
        {/* mini full-view mockup, search bar unfocused */}
        <div style={{
          width: '100%', borderRadius: 7, border: '1px solid #2e2440', overflow: 'hidden',
          background: '#15101c',
        }}>
          <div style={{
            height: 18, background: '#1d1729', borderBottom: '1px solid #2e2440',
            display: 'flex', alignItems: 'center', padding: '0 8px', gap: 3,
          }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: 999, background: '#2e2440' }} />)}
          </div>
          {/* unfocused search bar */}
          <div style={{
            margin: '5px 7px', padding: '4px 8px', borderRadius: 5,
            background: '#110b1a', border: '1px solid #2e2440',
            display: 'flex', alignItems: 'center', gap: 6, opacity: 0.38,
          }}>
            <Icon name="search" size={9} strokeWidth={2} color="#2e2440" />
            <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 9.5, color: '#2e2440' }}>{T('anim.searchClipsFiles')}</span>
          </div>
          {[80, 65, 50].map((w, i) => (
            <div key={i} style={{ margin: '0 7px 4px', height: 11, borderRadius: 3, background: '#1d1729', width: w + '%' }} />
          ))}
          <div style={{ height: 6 }} />
        </div>
      </div>
    </div>
  );
}

function SearchStep1() {
  const T = useT();
  const [active, setActive] = useState(false);
  useEffect(() => {
    const fire = () => { setActive(true); setTimeout(() => setActive(false), 650); };
    fire();
    const id = setInterval(fire, 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyPill label="Ctrl" active={active} />
          <KeyPlus />
          <KeyPill label="K" active={active} />
        </div>
        <div style={{
          fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 11,
          color: active ? 'rgba(255,107,0,0.8)' : '#2e2440', transition: 'color 220ms',
        }}>{T('anim.focusJumpsToSearch')}</div>
      </div>
    </div>
  );
}

const TYPED = 'const x';
function SearchStep2() {
  const [charCount, setCharCount] = useState(0);
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    let typing = true;
    const typeId = setInterval(() => {
      if (!typing) return;
      setCharCount(n => {
        if (n >= TYPED.length) {
          typing = false;
          setTimeout(() => { setCharCount(0); typing = true; }, 1100);
          return n;
        }
        return n + 1;
      });
    }, 140);
    return () => clearInterval(typeId);
  }, []);

  const text = TYPED.slice(0, charCount);
  const hasText = charCount > 0;

  return (
    <div style={sceneStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 14px' }}>
        <div style={{
          width: '100%', borderRadius: 7, border: '1px solid #2e2440', overflow: 'hidden',
          background: '#15101c',
        }}>
          <div style={{
            height: 18, background: '#1d1729', borderBottom: '1px solid #2e2440',
            display: 'flex', alignItems: 'center', padding: '0 8px', gap: 3,
          }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: 999, background: '#2e2440' }} />)}
          </div>
          {/* focused search bar */}
          <div style={{
            margin: '5px 7px', padding: '4px 8px', borderRadius: 5,
            background: '#110b1a',
            border: `1px solid ${focused ? '#FF6B00' : '#2e2440'}`,
            boxShadow: focused ? '0 0 0 2px rgba(255,107,0,0.14)' : 'none',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'border-color 200ms, box-shadow 200ms',
          }}>
            <Icon name="search" size={9} strokeWidth={2} color="#FF6B00" />
            <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 9.5, color: '#f3eef9' }}>
              {text}
              <BlinkingCursor />
            </span>
          </div>
          {/* rows filter as text grows */}
          {[0,1,2].map(i => (
            <div key={i} style={{
              margin: '0 7px 4px', height: 11, borderRadius: 3,
              background: hasText ? (i === 0 ? '#261e36' : '#1d1729') : '#1d1729',
              width: hasText ? (['85%','60%','0%'][i]) : (['80%','65%','50%'][i]),
              opacity: hasText ? ([1, 0.5, 0][i]) : 0.5,
              transition: 'all 250ms',
            }} />
          ))}
          <div style={{ height: 6 }} />
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Lock Items — 3 steps
// =============================================================

function MiniItemRow({ text, icon, locked, showActions, actionPhase }) {
  // actionPhase: 0=idle, 1=clicking lock, 2=locked
  const isLocked = locked || actionPhase === 2;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6,
      background: showActions ? '#261e36' : 'transparent',
      border: `1px solid ${showActions ? '#3d2f56' : 'transparent'}`,
      transition: 'all 220ms',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 4, flex: 'none',
        background: showActions ? '#FF6B00' : '#261e36',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: showActions ? '#fff' : '#80738f', transition: 'all 220ms',
      }}>
        <Icon name={icon} size={9} strokeWidth={2.2} />
      </div>
      <div style={{
        fontFamily: 'var(--ac-font-ui)', fontSize: 10.5, color: '#b9accd',
        flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{text}</div>
      {isLocked && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, borderRadius: 3,
          background: '#1f2e1f', border: '1px solid #7eb661',
          opacity: actionPhase === 2 ? 1 : 0.7,
          transition: 'all 300ms',
        }}>
          <Icon name="lock" size={7} strokeWidth={2.5} color="#a3c777" />
        </div>
      )}
      {showActions && !isLocked && (
        <div style={{ display: 'flex', gap: 3 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 4,
            background: actionPhase === 1 ? '#261e36' : 'transparent',
            border: `1px solid ${actionPhase === 1 ? '#4A0E7A' : '#2e2440'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: actionPhase === 1 ? 'scale(0.93)' : 'scale(1)',
            boxShadow: actionPhase === 1 ? '0 0 8px rgba(74,14,122,0.5)' : 'none',
            transition: 'all 180ms',
          }}>
            <Icon name="lock" size={8} strokeWidth={2} color={actionPhase === 1 ? '#c4a9e8' : '#5a4f6c'} />
          </div>
          <div style={{
            width: 20, height: 20, borderRadius: 4, background: 'transparent',
            border: '1px solid #2e2440',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0.4,
          }}>
            <Icon name="trash" size={8} strokeWidth={2} color="#5a4f6c" />
          </div>
        </div>
      )}
    </div>
  );
}

function LockStep0() {
  const [sel, setSel] = useState(-1);
  useEffect(() => {
    const id = setTimeout(() => setSel(1), 600);
    return () => clearTimeout(id);
  }, []);
  const items = [
    { icon: 'pilcrow', text: 'Project brief v2.docx' },
    { icon: 'fileText', text: 'Legal contract draft.pdf' },
    { icon: 'code',    text: 'api_key = "sk-prod-..."' },
  ];
  return (
    <div style={sceneStyle}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', gap: 4 }}>
        {items.map((item, i) => (
          <MiniItemRow key={i} text={item.text} icon={item.icon} showActions={i === sel} actionPhase={0} />
        ))}
      </div>
    </div>
  );
}

function LockStep1() {
  const [phase, setPhase] = useState(0);
  // 0=row selected idle, 1=hovering lock, 2=clicking, loop
  useEffect(() => {
    const seq = [0,0,0,1,1,2,2,2,0,0];
    let i = 0;
    const id = setInterval(() => { i = (i+1) % seq.length; setPhase(seq[i]); }, 280);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', gap: 4 }}>
        <MiniItemRow text="Project brief v2.docx" icon="pilcrow" showActions={false} actionPhase={0} />
        <MiniItemRow text="Legal contract draft.pdf" icon="fileText" showActions actionPhase={phase} />
        <MiniItemRow text='api_key = "sk-prod-..."' icon="code" showActions={false} actionPhase={0} />
      </div>
    </div>
  );
}

function LockStep2() {
  const T = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px', gap: 4 }}>
        <MiniItemRow text="Project brief v2.docx" icon="pilcrow" showActions={false} actionPhase={0} />
        <div style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'scale(0.97)', transition: 'all 350ms cubic-bezier(0.22,0.61,0.36,1)' }}>
          <MiniItemRow text="Legal contract draft.pdf" icon="fileText" locked showActions={false} actionPhase={2} />
        </div>
        <MiniItemRow text='api_key = "sk-prod-..."' icon="code" showActions={false} actionPhase={0} />
        <div style={{
          opacity: show ? 1 : 0, transition: 'opacity 350ms 120ms',
          fontFamily: 'var(--ac-font-mono)', fontSize: 8.5, color: '#7eb661',
          textAlign: 'center', letterSpacing: '0.04em',
        }}>{T('anim.deleteDisabledUntilUnlocked')}</div>
      </div>
    </div>
  );
}

// =============================================================
// Live / Privacy — 3 steps
// =============================================================

function MiniTitleBar({ capturing }) {
  const T = useT();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
      background: '#1d1729', borderBottom: '1px solid #2e2440', borderRadius: '6px 6px 0 0',
    }}>
      {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: 999, background: '#2e2440' }} />)}
      <div style={{ flex: 1 }} />
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px', borderRadius: 4,
        background: capturing ? 'rgba(74,222,128,0.12)' : 'rgba(255,107,0,0.15)',
        border: `1px solid ${capturing ? '#4ade80' : '#FF6B00'}`,
        transition: 'all 350ms cubic-bezier(0.22,0.61,0.36,1)',
      }}>
        <div style={{
          width: 5, height: 5, borderRadius: 999, flex: 'none',
          background: capturing ? '#4ade80' : '#FF6B00',
          transition: 'background 350ms',
        }} />
        <span style={{
          fontFamily: 'var(--ac-font-ui)', fontSize: 8.5, fontWeight: 500,
          color: capturing ? '#4ade80' : '#FF6B00',
          transition: 'color 350ms',
        }}>{capturing ? T('anim.live') : T('anim.paused')}</span>
      </div>
      <div style={{ width: 16, height: 16, borderRadius: 3, background: '#2e2440', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="settings" size={8} strokeWidth={2} color="#5a4f6c" />
      </div>
    </div>
  );
}

function LiveStep0() {
  const T = useT();
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPulse(v => !v), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={sceneStyle}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px' }}>
        <div style={{
          borderRadius: 6, overflow: 'hidden',
          border: `1px solid ${pulse ? '#4ade80' : '#2e2440'}`,
          boxShadow: pulse ? '0 0 0 2px rgba(74,222,128,0.18)' : 'none',
          transition: 'border-color 700ms, box-shadow 700ms',
        }}>
          <MiniTitleBar capturing={true} />
          <div style={{ background: '#15101c', padding: '8px 10px' }}>
            {[70, 55, 40].map((w,i) => (
              <div key={i} style={{ height: 5, borderRadius: 2, background: '#1d1729', width: w+'%', marginBottom: 4 }} />
            ))}
          </div>
        </div>
        <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 8.5, color: '#4ade80', textAlign: 'center', marginTop: 6, letterSpacing: '0.04em' }}>
          {T('anim.capturingEverything')}
        </div>
      </div>
    </div>
  );
}

function LiveStep1() {
  const T = useT();
  // phase: 0=live idle, 1=clicking, 2=paused, then loops back
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const seq = [0, 0, 0, 1, 2, 2, 2, 2, 2, 0];
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % seq.length; setPhase(seq[i]); }, 380);
    return () => clearInterval(id);
  }, []);
  const capturing = phase < 2;
  return (
    <div style={sceneStyle}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px' }}>
        <div style={{
          borderRadius: 6, overflow: 'hidden', border: '1px solid #2e2440',
          transform: phase === 1 ? 'scale(0.99)' : 'scale(1)',
          transition: 'transform 120ms',
        }}>
          <MiniTitleBar capturing={capturing} />
          <div style={{ background: '#15101c', padding: '8px 10px' }}>
            {[70, 55, 40].map((w,i) => (
              <div key={i} style={{ height: 5, borderRadius: 2, background: '#1d1729', width: w+'%', marginBottom: 4 }} />
            ))}
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--ac-font-mono)', fontSize: 8.5, textAlign: 'center', marginTop: 6, letterSpacing: '0.04em',
          color: capturing ? '#4ade80' : '#FF6B00',
          transition: 'color 350ms',
        }}>
          {capturing ? T('anim.monitoringActive') : T('anim.monitoringPaused')}
        </div>
      </div>
    </div>
  );
}

function LiveStep2() {
  const T = useT();
  // phase: 0=paused+copy attempt, 1=not captured shown, 2=resumed+copy, 3=captured shown
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const seq = [0, 0, 1, 1, 1, 2, 2, 3, 3, 3, 0];
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % seq.length; setPhase(seq[i]); }, 460);
    return () => clearInterval(id);
  }, []);
  const paused = phase < 2;
  const popVisible = phase === 1 || phase === 3;
  return (
    <div style={sceneStyle}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px' }}>
        <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #2e2440', position: 'relative' }}>
          <MiniTitleBar capturing={!paused} />
          <div style={{ background: '#15101c', padding: '8px 10px', position: 'relative', minHeight: 38 }}>
            {[70, 55, 40].map((w,i) => (
              <div key={i} style={{ height: 5, borderRadius: 2, background: '#1d1729', width: w+'%', marginBottom: 4 }} />
            ))}
            <div style={{
              position: 'absolute', top: 6, right: 6,
              background: '#261e36', border: `1px solid ${paused ? '#3d2f56' : '#4ade80'}`,
              borderRadius: 4, padding: '2px 6px',
              display: 'flex', alignItems: 'center', gap: 3,
              fontFamily: 'var(--ac-font-mono)', fontSize: 7.5,
              color: paused ? '#80738f' : '#4ade80',
              opacity: popVisible ? 1 : 0,
              transform: popVisible ? 'translateY(0)' : 'translateY(-3px)',
              transition: 'opacity 220ms, transform 220ms',
            }}>
              <Icon name={paused ? 'cloudOff' : 'check'} size={7} strokeWidth={2} color={paused ? '#80738f' : '#4ade80'} />
              {paused ? T('anim.notSaved') : T('anim.saved')}
            </div>
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--ac-font-mono)', fontSize: 8.5, textAlign: 'center', marginTop: 6, letterSpacing: '0.04em',
          color: paused ? '#FF6B00' : '#4ade80',
          transition: 'color 350ms',
        }}>
          {paused ? T('anim.pausedCopiesIgnored') : T('anim.liveCopyIsSaved')}
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Export map: shortcutKey → [Step0, Step1, Step2]
// =============================================================
export const TUTORIAL_STEP_COMPONENTS = {
  open:      [OpenStep0,      OpenStep1,      OpenStep2],
  paste:     [PasteStep0,     PasteStep1,     PasteStep2],
  pasteKeep: [PasteKeepStep0, PasteKeepStep1, PasteKeepStep2],
  forget:    [ForgetStep0,    ForgetStep1,    ForgetStep2],
  search:    [SearchStep0,    SearchStep1,    SearchStep2],
  lock:      [LockStep0,      LockStep1,      LockStep2],
  privacy:   [LiveStep0,      LiveStep1,      LiveStep2],
};
