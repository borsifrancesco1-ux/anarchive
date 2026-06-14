# Anarchive desktop UI kit

A pixel-correct recreation of the Anarchive desktop application — the keyboard-driven clipboard manager and file archive. **Five views**, light + dark, all in one demo. Switch between them with the floating mode strip at the bottom of the page.

## The five views

| View | Description |
|---|---|
| **Onboarding** | First-launch 5-step flow (welcome → storage → shortcut → permission → ready). Light paper background, narrow centred column, progress dots. |
| **Launcher** | Spotlight-style compact dark window (620 wide). Big search at the top, recent clips below, keyboard hints in the status bar. |
| **Menu bar** | Tiny popover that drops down from the macOS menu-bar icon. Search + Recent/Pinned tabs + footer actions (Open archive / Settings / Quit). |
| **Full window** | Sidebar (clipboard / drop zone / pinned + filters + tags) + main column with search & list. Toggleable light / dark. **Hover-drag triggers the categorized drop overlay** — auto-sort by default, or release on a specific section. |
| **Settings** | Full window with sidebar of 5 categories — General, Shortcuts, Storage, Privacy, About. Form atoms: Toggle, Select, TextField, KbdCapture, GhostButton. |

## Files

- `index.html` — page setup, loads everything.
- `data.js` — fake clipboard items + files. Exposes `window.AnarchiveData = { clips, files, formatAgo }`.
- `icons.js` — Lucide path map (`window.AnarchiveIcons`) used by the React `<Icon>` and inline-SVG cards.
- `components.jsx` — shared primitives. Exports to window: `Icon`, `TrafficLights`, `Kbd`, `AnarchiveMark`, `AnarchiveWordmark`, `KindBadge`, `ClipRow`, `FileTile`, `SearchInput`, `EmptyState`, `DropOverlay`.
- `app.jsx` — `LauncherView`, `FullView`, `Sidebar`, `ClipboardListView`, `DropZoneView`, `StatusBar`, `DropToast`, and the root `App` with view + theme state.
- `views-onboarding.jsx` — `OnboardingView` with `StepWelcome / StepStorage / StepShortcut / StepAccess / StepReady`.
- `views-menubar.jsx` — `MenuBarView` + `MenuClipRow` + `FooterButton`.
- `views-settings.jsx` — `SettingsView` + `Section / Row / Toggle / Select / TextField / KbdCapture / GhostButton` + per-category sub-views.

## What's wired (and what isn't)

The kit cuts corners on real functionality to keep the visual side honest:

- **The Copy button** on a selected clipboard row calls `navigator.clipboard.writeText(clip.text)`. That actually works inside a browser.
- **Drag-and-drop** opens the categorized overlay on `dragenter` and dismisses on `drop` / `dragleave`. Drop targets route to the right tab + filter (Files → Drop Zone, Pinned → pinned list, etc.) and a toast confirms. Nothing is actually ingested.
- **Onboarding** is purely visual — buttons advance steps; nothing is saved.
- **Settings** values are React state, not persisted.
- **Keyboard navigation** in the launcher handles ↑ / ↓ only.
- **Theme** is in-memory; "Match system" doesn't read the OS.

## Forking

Take what you need:
- Need only the launcher? Lift `LauncherView` from `app.jsx` plus `components.jsx` + `data.js` + `icons.js`.
- Need the menu-bar dropdown? `views-menubar.jsx` + components + data + icons.
- Settings panel can be lifted whole as a standalone window.

The reference to `../../colors_and_type.css` brings the design tokens; rewire it to wherever your CSS lives.
