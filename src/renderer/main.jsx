import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './colors_and_type.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/lora/400.css';
import '@fontsource/lora/400-italic.css';
import '@fontsource/lora/500.css';
import '@fontsource/lora/600.css';
import App from './App.jsx';
import { SettingsView } from './views-settings.jsx';
import { LangContext } from './i18n.js';
import { setCurrentLang } from './utils.js';

// Prevent Electron from navigating to dropped files
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop',     (e) => e.preventDefault());

// Standalone settings window — rendered only when window.location.hash === '#/settings'.
// Bypasses the full App entirely; owns its own theme/lang state.
function SettingsApp() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('ac.theme') || 'light'; } catch { return 'light'; }
  });
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('ac.lang') || 'en'; } catch { return 'en'; }
  });
  const [systemTheme, setSystemTheme] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => { setCurrentLang(lang); }, [lang]);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemTheme(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const effectiveTheme = theme === 'auto' ? systemTheme : theme;

  const handleTheme = (t) => {
    setTheme(t);
    try { localStorage.setItem('ac.theme', t); } catch {}
    window.anarchive?.window.broadcast({ theme: t });
  };

  const handleLang = (l) => {
    setLang(l);
    setCurrentLang(l);
    try { localStorage.setItem('ac.lang', l); } catch {}
    window.anarchive?.window.broadcast({ lang: l });
  };

  return (
    <LangContext.Provider value={lang}>
      <SettingsView
        theme={effectiveTheme}
        onTheme={handleTheme}
        onClose={() => window.close()}
        canGoBack={false}
        lang={lang}
        onLang={handleLang}
      />
    </LangContext.Provider>
  );
}

const isSettingsWindow = window.location.hash === '#/settings';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isSettingsWindow ? <SettingsApp /> : <App />}
  </React.StrictMode>
);
