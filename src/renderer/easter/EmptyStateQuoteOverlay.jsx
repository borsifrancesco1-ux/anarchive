import React, { useState, useEffect, useRef } from 'react';
import { EASTER_EGGS, pickEmptyStateQuote } from '../easterEggs.js';

export function EmptyStateQuoteOverlay({ active, dark }) {
  const cfg = EASTER_EGGS.emptyStateQuotes;
  const [quoteIdx, setQuoteIdx] = useState(-1);
  const [armed, setArmed] = useState(false);
  const lastQuoteIdx = useRef(-1);

  useEffect(() => {
    if (!cfg.enabled || !active) { setArmed(false); setQuoteIdx(-1); lastQuoteIdx.current = -1; return; }
    const t = setTimeout(() => setArmed(true), cfg.inactivityDelayMs);
    return () => clearTimeout(t);
  }, [active, cfg.enabled, cfg.inactivityDelayMs]);

  useEffect(() => {
    if (!armed) return;
    const tick = () => {
      const { index } = pickEmptyStateQuote(lastQuoteIdx.current);
      lastQuoteIdx.current = index;
      setQuoteIdx(index);
    };
    tick();
    const id = setInterval(tick, cfg.rotateMs);
    return () => clearInterval(id);
  }, [armed, cfg.rotateMs]);

  if (!cfg.enabled || !active || !armed || quoteIdx < 0) return null;
  const quote = cfg.quotes[quoteIdx];
  return (
    <div
      key={quoteIdx}
      style={{
        position: 'absolute', left: 0, right: 0, top: '60%',
        textAlign: 'center', pointerEvents: 'none', padding: '0 28px',
        fontFamily: 'var(--ac-font-serif)', fontStyle: 'italic',
        fontSize: 14, lineHeight: 1.45,
        color: dark ? 'rgba(255,138,51,0.62)' : 'rgba(74,14,122,0.55)',
        animation: `acQuoteFadeIn ${cfg.fadeMs}ms cubic-bezier(0.22,0.61,0.36,1) both`,
        maxWidth: 540, margin: '0 auto',
      }}>
      "{quote}"
    </div>
  );
}
