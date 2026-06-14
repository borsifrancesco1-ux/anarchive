import { t as translate } from './i18n.js';

let CURRENT_LANG = 'en';
export function setCurrentLang(l) { CURRENT_LANG = l || 'en'; }

export function formatAgo(ts, lang) {
  const L = lang || CURRENT_LANG;
  const diff = Date.now() - ts;
  if (diff < 60_000)      return translate(L, 'time.justNow');
  if (diff < 3_600_000)   return translate(L, 'time.minutes', { n: Math.floor(diff / 60_000) });
  if (diff < 86_400_000)  return translate(L, 'time.hours',   { n: Math.floor(diff / 3_600_000) });
  return                        translate(L, 'time.days',    { n: Math.floor(diff / 86_400_000) });
}

export function inferKind(text) {
  const t = text.trim();
  if (/^https?:\/\//i.test(t)) return 'url';
  if (/[{}();]/.test(t) && t.includes('\n')) return 'code';
  return 'text';
}
