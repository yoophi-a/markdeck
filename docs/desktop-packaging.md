# Desktop packaging draft

## Current direction

1. `apps/web` keeps the existing Next.js UI.
2. `apps/desktop` wraps the web UI with Electron.
3. In development, Electron starts the web app and loads the local URL.
4. For packaging, the same split can be kept first: bundle Electron app, then point it at a production web build/runtime.

## Recommended first packaging target

- **macOS first**
- Output target: `.dmg` or zipped `.app`
- Focus on unsigned internal distribution first, then notarization/signing later

## Suggested follow-up scripts

- `desktop:build:web` → build `@markdeck/web`
- `desktop:pack` → package `@markdeck/desktop`
- `desktop:dist` → create distributable archive for macOS

## Build artifact outline

```text
release/
  web/
    .next/
  desktop/
    MarkDeck.app
    MarkDeck-darwin-arm64.zip
```

## Packaging concerns to resolve next

- whether production desktop should boot a bundled Next server or export a static/hybrid frontend
- app signing / notarization on macOS
- asset path handling for local images and attachments
- updater strategy (manual download first is fine)
- future Windows/Linux packaging once macOS flow stabilizes

## Short-term recommendation

Keep packaging simple:

- ship macOS internal builds first
- do not block on notarization/updater work
- validate desktop runtime ergonomics before broad distribution
