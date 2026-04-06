# Desktop packaging

## Current direction

1. `apps/desktop` is the only app package.
2. Electron main, preload, and renderer are built through `electron-vite`.
3. In development, Electron loads the Vite renderer URL injected by `electron-vite`.
4. In production/package mode, Electron loads the built `out/renderer/index.html`.

## Implemented scripts

- `npm run desktop:build`
  - runs renderer typecheck
  - builds `main`, `preload`, and `renderer` through `electron-vite`
- `npm run desktop:pack`
  - creates an unpacked macOS app bundle via `electron-builder --dir`
- `npm run desktop:dist`
  - creates a macOS zip distribution via `electron-builder --mac zip`
- `npm --prefix apps/desktop run release:mac`
  - alias for the macOS distribution path used in release docs/scripts

## Verified on 2026-03-13

### Desktop dev / build baseline

- `npm run typecheck` succeeded.
- `npm run desktop:build` succeeded.
- `npm run desktop:pack` succeeded and produced `release/desktop/mac-arm64/MarkDeck.app`.
- desktop renderer shell / watcher / recent folders / menu-command palette remain buildable after the electron-vite migration.

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

1. `npm run desktop:build`
2. `npm run desktop:pack`
3. verify `release/desktop/mac-arm64/MarkDeck.app`
4. export Apple signing/notarization env vars
5. `npm run desktop:dist` (or `npm --prefix apps/desktop run release:mac`)
6. verify zip on a clean macOS machine

## Current constraints

- macOS-first only. Windows/Linux packaging is not configured yet.
- App icon and notarization automation are still not fully configured.
- The current source tree still keeps some legacy main-process modules outside `src/main`; packaging is already electron-vite based, but internals can be consolidated further over time.

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
