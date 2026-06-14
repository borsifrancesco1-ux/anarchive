import React, { useState } from 'react';
import { Icon } from '../components.jsx';
import { EASTER_EGGS } from '../easterEggs.js';
import subarubaracca from '../assets/subarubaracca.txt?raw';

export function SpecialAggResult({ query, dark }) {
  const cfg = EASTER_EGGS.specialSearchAGG;
  const [open, setOpen] = useState(false);
  if (!cfg.enabled || query !== cfg.trigger) return null;

  const cardBg    = dark ? 'linear-gradient(135deg, #1e0a30 0%, #2a1040 60%, #1a0820 100%)' : 'linear-gradient(135deg, #fff8f0 0%, #fff3e6 60%, #fdf0e0 100%)';
  const stampColor = dark ? 'rgba(255,138,51,0.22)' : 'rgba(255,107,0,0.18)';

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        title="Frammento riservato — clicca per leggere"
        style={{
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', borderRadius: 10, margin: '4px 0',
          background: cardBg, border: '1px solid rgba(255,138,51,0.55)',
          cursor: 'pointer',
          animation: 'acAggReveal 600ms cubic-bezier(0.22,0.61,0.36,1) both, acAggGlow 2800ms ease-in-out 650ms infinite',
        }}>
        <div style={{
          position: 'absolute', top: '50%', right: 18,
          transform: 'translateY(-50%) rotate(-18deg)',
          fontFamily: 'var(--ac-font-ui)', fontSize: 11, fontWeight: 800,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: stampColor, border: `2px solid ${stampColor}`,
          padding: '3px 8px', borderRadius: 3, pointerEvents: 'none', userSelect: 'none',
          animation: 'acAggStamp 550ms cubic-bezier(0.22,0.61,0.36,1) 300ms both',
        }}>RISERVATO</div>
        <div style={{
          width: 40, height: 40, borderRadius: 9, flex: 'none',
          background: 'linear-gradient(135deg, #FF6B00 0%, #c94000 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          boxShadow: '0 2px 12px rgba(255,107,0,0.50)',
        }}>
          <Icon name="fileText" size={20} strokeWidth={1.75} />
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 80 }}>
          <div style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 13.5, fontWeight: 700, color: dark ? '#FFD0A0' : '#b34a02', letterSpacing: '0.04em' }}>
            subarubaracca.txt
          </div>
          <div style={{ fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 11, color: dark ? '#c4a9e8' : '#6b4c8a', marginTop: 2 }}>
            frammento ritrovato — clicca per leggere
          </div>
        </div>
      </div>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 40, WebkitAppRegion: 'no-drag',
            animation: 'acAggBackdrop 500ms ease-out both',
          }}
          onClick={() => setOpen(false)}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
          tabIndex={-1}
          ref={el => el?.focus()}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 640, maxHeight: '82vh',
              background: dark ? '#130922' : '#fffdf6', borderRadius: 14,
              border: '1px solid rgba(255,138,51,0.55)',
              boxShadow: '0 0 0 1px rgba(255,138,51,0.25), 0 0 80px 20px rgba(255,107,0,0.18), 0 32px 80px rgba(0,0,0,0.65)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              WebkitAppRegion: 'no-drag',
              animation: 'acAggModalIn 520ms cubic-bezier(0.22,0.61,0.36,1) both',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px',
              background: dark ? 'rgba(255,107,0,0.10)' : 'rgba(255,107,0,0.06)',
              borderBottom: `1px solid ${dark ? 'rgba(255,138,51,0.30)' : 'rgba(255,107,0,0.20)'}`,
              flex: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg, #FF6B00, #b34a02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="fileText" size={13} strokeWidth={2} color="#fff" />
                </div>
                <span style={{ fontFamily: 'var(--ac-font-mono)', fontSize: 12, color: dark ? '#FFD0A0' : '#b34a02', fontWeight: 700 }}>subarubaracca.txt</span>
                <span style={{ fontFamily: 'var(--ac-font-ui)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: dark ? 'rgba(255,138,51,0.7)' : 'rgba(179,74,2,0.6)', border: `1px solid ${dark ? 'rgba(255,138,51,0.35)' : 'rgba(179,74,2,0.30)'}`, padding: '2px 6px', borderRadius: 3 }}>riservato</span>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 0, outline: 'none', cursor: 'pointer', color: dark ? '#6b5f7a' : '#9e8fa8', display: 'flex', padding: 4, borderRadius: 5, WebkitAppRegion: 'no-drag' }}>
                <Icon name="x" size={15} strokeWidth={2} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
              <pre style={{ fontFamily: 'var(--ac-font-serif)', fontSize: 13.5, lineHeight: 1.8, color: dark ? '#d4cce0' : '#3a2a4a', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                {subarubaracca}
              </pre>
            </div>
            <div style={{ padding: '8px 18px', flex: 'none', borderTop: `1px solid ${dark ? 'rgba(255,138,51,0.15)' : 'rgba(255,107,0,0.12)'}`, fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic', fontSize: 11, color: dark ? 'rgba(255,138,51,0.55)' : 'rgba(179,74,2,0.55)', textAlign: 'center' }}>
              premi Esc o clicca fuori per uscire
            </div>
          </div>
        </div>
      )}
    </>
  );
}
