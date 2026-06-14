import React, { useState, useRef } from 'react';
import { AnarchiveMark } from '../components.jsx';
import { EASTER_EGGS } from '../easterEggs.js';

export function BrandLogoEgg({ color, onTrigger }) {
  const clickTimes = useRef([]);
  const [spinKey, setSpinKey] = useState(0);
  const cfg = EASTER_EGGS.logoSpin;

  const handleClick = () => {
    if (!cfg.enabled) return;
    const now = Date.now();
    clickTimes.current = [...clickTimes.current.filter(t => now - t < cfg.windowMs), now];
    if (clickTimes.current.length >= cfg.requiredClicks) {
      clickTimes.current = [];
      setSpinKey(k => k + 1);
      onTrigger?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div
        key={spinKey}
        style={{
          display: 'inline-flex',
          animation: spinKey > 0 ? `acLogoSpin ${cfg.spinDurationMs}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : undefined,
          transformOrigin: 'center',
        }}>
        <AnarchiveMark size={20} />
      </div>
      <span style={{ fontFamily: 'var(--ac-font-brand)', fontSize: 22, color, letterSpacing: '-0.01em', lineHeight: 1 }}>
        Anarchive
      </span>
    </div>
  );
}
