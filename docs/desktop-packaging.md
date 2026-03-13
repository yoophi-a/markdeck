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
- `npm --prefix apps/desktop run release:mac`
  - alias for the macOS distribution path used in release docs/scripts

## Verified on 2026-03-13

### Desktop dev / build

- `npm run typecheck` succeeded.
- `npm run desktop:build:web` succeeded.
- `npm run desktop:pack` succeeded and produced `release/desktop/mac-arm64/MarkDeck.app`.
- desktop renderer shell / watcher / recent folders / menu-command palette follow-up changes stayed buildable after the desktop-first refactor wave.

## Signing / notarization follow-up

`apps/desktop/package.json` now carries the macOS hardened runtime baseline:

- `hardenedRuntime: true`
- `gatekeeperAssess: false`
- shared entitlements file at `apps/desktop/build/entitlements.mac.plist`

This does **not** mean notarization is fully automated yet. The current local verification reaches ad-hoc signing and explicitly skips notarization when Apple credentials are absent. It means the packaging config is closer to a release-ready baseline and the remaining manual inputs are clearer.

### Remaining release inputs

You still need the usual Apple credentials/environment for a real signed distribution:

- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
- valid signing identity available to `electron-builder`

### Recommended release flow

1. `npm run desktop:build:web`
2. `npm run desktop:pack`
3. verify `release/desktop/mac-arm64/MarkDeck.app`
4. export Apple signing/notarization env vars
5. `npm run desktop:dist` (or `npm --prefix apps/desktop run release:mac`)
6. verify zip on a clean macOS machine

## Current constraints

- macOS-first only. Windows/Linux packaging is not configured yet.
- App icon and notarization automation are still not fully configured.
- The build currently packages the web standalone server as an app resource; this is intentional for the current architecture, but it keeps the desktop app coupled to the embedded Next runtime.

## Build artifact outline

```text
release/
  desktop/
    mac-arm64/
      MarkDeck.app
```

## Follow-up topics

- wire actual notarization execution once Apple credentials are available in the release environment
- add app icon and clean release metadata
- verify `desktop:dist` zip output on a clean machine
- keep moving file access/search logic from web server code into Electron main over time
