// =============================================================
// Easter eggs — centralized config + small utilities.
// Each effect can be toggled on/off via `enabled`. Texts are placeholders:
// search "TODO" to find them.
// =============================================================

export const EASTER_EGGS = {
  // 1) Logo "A" rapid 7-click → spin + scale pulse + toast
  logoSpin: {
    enabled: true,
    requiredClicks: 7,
    windowMs: 2500,
    spinDurationMs: 700,
    toastDurationMs: 2400,
    messages: [
      'Hai trovato qualcosa.',
      'Ok, questo era nascosto.',
      'Non era un bottone. Adesso sì.',
    ],
  },

  // 3) Search "AGG" exact (case-sensitive) → special file card + text reader overlay
  specialSearchAGG: {
    enabled: true,
    trigger: 'AGG',
  },

  // 5) Clip count milestones → one-shot toast + badge per milestone
  clipMilestones: {
    enabled: true,
    badgeDurationMs: 8000,
    toastDurationMs: 10000,
    persistKey: 'ac.easter.milestonesShown',
    milestones: [
      // TODO: customize milestone messages
      { value:  100, msg: 'Cento clip. Inizia a sembrare un archivio.' },
      { value:  500, msg: 'Cinquecento. Stai diventando preciso.' },
      { value: 1000, msg: 'Mille clip. È letteralmente un archivio.' },
      { value: 5000, msg: 'Cinquemila. Dovresti scriverci un libro.' },
    ],
  },

  // 8) Drop zone empty for a while → rotating quotes instead of bare empty state
  emptyStateQuotes: {
    enabled: true,
    inactivityDelayMs: 10_000, // wait this long after entering the empty state before showing
    rotateMs: 5500,            // swap quote every N ms
    fadeMs: 380,               // crossfade duration
    // Long-quote bias: shorter quotes appear more often. Quotes above this
    // character count are weighted ~0.4× in the random pick.
    longQuoteCharLimit: 60,
    // TODO: edit/append quotes here.
    quotes: [
      'Buona questa cadrega.',
      'Una cadrega non si rifiuta a nessuno.',
      'Il mio falegname con trentamila lire la fa meglio.',
      'Il nettare degli dei.',
      'E il settimo giorno Dio creò il cheeseburger.',
      'Fuori dal letto?',
      'Nessuno è perfetto.',
      'Sì ma niente di serio.',
      'Gastani Frinzi dei miei coglioni.',
      'Dove cazzo si esce da questo posto di merda?',
      'Acqua gassata.',
      'Acqua gassata a garganella.',
      'Peperonata, alle otto di mattina?',
      'A mezzogiorno... topi morti.',
      'Non sono professionisti.',
      'Sono presi dalla strada.',
      'Gente che entra.',
      'Gente che esce.',
      'La radiamo al suolo.',
      'Questa merda di casa.',
    ],
  },

  // 10) 3 consecutive aborted drag-outs → fleeting "don't run" toast + jar GIF
  dragoutAbort: {
    enabled: true,
    threshold: 3,
    durationMs: 2400,
    message: 'Non scappare adesso.',
  },
};

// ─── Utilities ───────────────────────────────────────────────────────────────

// Pick a random index from an array, biased away from `avoidIndex` so the same
// item doesn't repeat back-to-back.
export function pickIndexAvoiding(length, avoidIndex) {
  if (length <= 1) return 0;
  let i = Math.floor(Math.random() * length);
  if (i === avoidIndex) i = (i + 1) % length;
  return i;
}

// Pick a random message from a list, avoiding the previous one.
export function pickMessage(list, avoidIndex = -1) {
  if (!list || list.length === 0) return { msg: '', index: -1 };
  const i = pickIndexAvoiding(list.length, avoidIndex);
  return { msg: list[i], index: i };
}

// Pick a quote from EMPTY_STATE_QUOTES with bias against long quotes
// and against immediate repeats.
export function pickEmptyStateQuote(prevIndex = -1) {
  const cfg = EASTER_EGGS.emptyStateQuotes;
  const quotes = cfg.quotes || [];
  if (quotes.length === 0) return { quote: '', index: -1 };
  // Weighted pick: long quotes get 0.4× weight, short get 1×
  const weights = quotes.map((q, i) =>
    (i === prevIndex ? 0 : (q.length > cfg.longQuoteCharLimit ? 0.4 : 1))
  );
  const total = weights.reduce((s, w) => s + w, 0);
  if (total === 0) {
    // All weights are 0 (only the previous quote exists) — just pick it
    return { quote: quotes[Math.max(0, prevIndex)], index: Math.max(0, prevIndex) };
  }
  let r = Math.random() * total;
  for (let i = 0; i < quotes.length; i++) {
    r -= weights[i];
    if (r <= 0) return { quote: quotes[i], index: i };
  }
  return { quote: quotes[quotes.length - 1], index: quotes.length - 1 };
}

// Read the set of already-shown milestones from localStorage.
export function readShownMilestones() {
  if (!EASTER_EGGS.clipMilestones.enabled) return new Set();
  try {
    const raw = localStorage.getItem(EASTER_EGGS.clipMilestones.persistKey);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

export function persistShownMilestones(set) {
  try {
    localStorage.setItem(
      EASTER_EGGS.clipMilestones.persistKey,
      JSON.stringify(Array.from(set))
    );
  } catch {}
}

// Given an old and new clip count, return any milestones crossed by this update
// that haven't been shown yet. Filters out fakes ("already past" on first mount).
export function milestonesCrossed(oldCount, newCount, shown) {
  if (!EASTER_EGGS.clipMilestones.enabled) return [];
  if (oldCount == null) return []; // first mount — never trigger for legacy state
  if (newCount <= oldCount) return [];
  return EASTER_EGGS.clipMilestones.milestones.filter(
    m => oldCount < m.value && newCount >= m.value && !shown.has(m.value)
  );
}
