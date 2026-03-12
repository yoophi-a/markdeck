# Desktop packaging draft

## Current direction

1. `apps/web` keeps the existing Next.js UI.
2. `apps/desktop` wraps the web UI with Electron.
3. In development, Electron starts the web app and loads the local URL.
4. In production/package mode, Electron starts the bundled Next.js standalone server from app resources and loads that local URL.

## Implemented scripts

- `npm run desktop:build:web`
  - builds the Next.js standalone output
  - runs `apps/desktop/scripts/prepare-standalone.mjs` to mirror `node_modules` into `apps/web/.next/standalone/apps/web/node_modules`
- `npm run desktop:pack`
  - creates an unpacked macOS app bundle via `electron-builder --dir`
- `npm run desktop:dist`
  - creates a macOS zip distribution via `electron-builder --mac zip`

## Verified on 2026-03-12

### Desktop dev

- `npm run desktop:dev` successfully launched Electron and booted the local Next dev server on port `3210`.
- Next warned about cross-origin dev requests from `127.0.0.1`, so `allowedDevOrigins` was added in `apps/web/next.config.ts`.

### Production web bundle

- `npm run desktop:build:web` succeeded.
- Standalone output confirmed at `apps/web/.next/standalone/apps/web/server.js`.

### Desktop packaging

- `npm run desktop:pack` produced `release/desktop/mac-arm64/MarkDeck.app`.
- The packaged executable at `release/desktop/mac-arm64/MarkDeck.app/Contents/MacOS/MarkDeck` was launched successfully far enough to stay running until manually terminated.
- `electron-builder` still exited non-zero after packaging/signing flow in this environment, so `.app` creation is verified but `desktop:dist` should be treated as **partially verified** until the remaining builder exit condition is fully pinned down.

## Current constraints

- macOS-first only. Windows/Linux packaging is not configured yet.
- App icon, signing identity, notarization, and updater flow are not configured.
- The build currently packages the web standalone server as an app resource; this is intentional for the current architecture, but it keeps the desktop app coupled to the embedded Next runtime.

## Build artifact outline

```text
release/
  desktop/
    mac-arm64/
      MarkDeck.app
```

## Follow-up topics

- pin down the remaining `electron-builder` non-zero exit after `.app` generation
- add app icon and proper signing/notarization for macOS distribution
- verify `desktop:dist` zip output on a clean machine
- keep moving file access/search logic from web server code into Electron main over time
