# Anarchive

> Uno scaffale silenzioso per tutto ciò che copi.

Anarchive è un'app desktop che cattura, salva e organizza automaticamente in locale tutto ciò che passa dai tuoi appunti — testo, file, snippet — così non perdi mai più ciò che hai copiato.

Gli appunti di sistema tengono solo l'ultima cosa copiata: tutto il resto sparisce. Anarchive risolve il problema costruendo una **cronologia persistente e privata** di ciò che copi, che puoi ritrovare, riorganizzare in progetti e riutilizzare in qualsiasi momento. Tutto resta in locale, sul tuo computer — nessun cloud.

## Funzionalità

- **Cattura automatica degli appunti** — ogni testo, file o snippet che copi viene archiviato senza che tu debba fare nulla.
- **Cronologia persistente** — niente più clip perse: ritrovi ciò che hai copiato giorni fa.
- **Organizzazione in progetti e workspace** — raggruppa e ordina le clip per contesto.
- **Tutto in locale e privato** — i dati restano sul tuo dispositivo, senza dipendere da servizi esterni.
- **Esclusione delle password** — opzione per ignorare ciò che proviene da gestori di password, per non archiviare dati sensibili.
- **Interfaccia multilingua** (i18n).
- **Vassoio di sistema (tray)** per un accesso rapido e discreto.

## Stack tecnologico

- **[Electron](https://www.electronjs.org/)** — app desktop (processo main + bridge IPC nel preload)
- **[React](https://react.dev/)** (JSX) — interfaccia utente nel renderer
- **[Zustand](https://github.com/pmndrs/zustand)** — gestione dello stato globale
- **[Vite](https://vitejs.dev/) + [electron-vite](https://electron-vite.org/)** — build e sviluppo
- **CSS** — stile e animazioni

JavaScript puro (nessun TypeScript); i tipi sono documentati via JSDoc in `types.js`.

## Requisiti

- [Node.js](https://nodejs.org/) (versione LTS consigliata)
- npm

## Installazione e avvio in sviluppo

```bash
git clone https://github.com/borsifrancesco1-ux/anarchive.git
cd anarchive
npm install      # solo la prima volta
npm run dev
```

`npm run dev` avvia l'app in modalità sviluppo con hot-reload. Lo script `predev` parte automaticamente prima e ripulisce eventuali istanze già aperte e la cache di Vite per evitare crash all'avvio.

## Script disponibili

| Script | Comando | Cosa fa |
|---|---|---|
| `dev` | `electron-vite dev` | Avvio in sviluppo con hot-reload (uso normale) |
| `dev:clean` | svuota la cache Vite + `electron-vite dev` | Come `dev` ma azzera tutta la cache — utile se lo sviluppo fa cose strane |
| `build` | `electron-vite build` | Compila l'app (output in `out/`) |
| `preview` | `electron-vite preview` | Anteprima del build di produzione |
| `package:mac` | `electron-vite build && electron-builder --mac` | Crea il `.dmg` installabile per macOS |
| `package:win` | `electron-vite build && electron-builder --win` | Crea l'installer Windows (NSIS) |

Se qualcosa si incastra durante lo sviluppo, lancia `npm run dev:clean`.

## Build per la distribuzione

```bash
npm run package:mac   # genera il .dmg per macOS
npm run package:win   # genera l'installer per Windows
```

## Struttura del progetto

```
src/
├── main/        # processo principale Electron (clipboard monitor, vault, entry point)
├── preload/     # bridge IPC tra main e renderer
└── renderer/    # interfaccia React (componenti, viste, hooks, store, i18n)
```

## Privacy

Anarchive è progettato per restare locale: i dati copiati vengono salvati sul tuo dispositivo e non vengono inviati a server esterni. È inoltre disponibile un'opzione per escludere automaticamente i contenuti provenienti dai gestori di password.

## Licenza

Distribuito con licenza MIT. Vedi il file [`LICENSE`](./LICENSE).
