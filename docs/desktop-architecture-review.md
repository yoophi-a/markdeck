# Desktop architecture review

## Current direction

MarkDeck is now a **desktop-first Electron app** built with `electron-vite`.
The earlier "Electron wraps the web app" phase has been replaced by a hybrid desktop structure where Electron main owns local capabilities and the renderer is a client UI.

## Runtime model

- **main** (`apps/desktop/src/main`) owns content roots, recent workspaces, launch target handling, watcher lifecycle, local file reads, asset reads, and search.
- **preload** (`apps/desktop/src/preload`) exposes the minimum IPC bridge to the renderer.
- **renderer** (`apps/desktop/src/renderer/src`) owns route state, React Query state, reading/review UI, and annotation draft UX.

The desktop main structure follows a hexagonal split:

- `core` for pure rules and policy
- `application` for use-case orchestration
- `infrastructure/electron` for Electron shell/menu/window boundaries
- `infrastructure/node` for filesystem/config/content watcher boundaries

## Why this direction

### Benefits

- Desktop-specific filesystem behavior lives in the process that can safely access it.
- Renderer code can stay focused on UI composition and query state.
- IPC contracts make the main/preload/renderer boundary easier to test and review.
- Packaging no longer depends on a separate local web server mental model.

### Trade-offs

- IPC payloads and error shapes need deliberate naming/versioning discipline.
- Renderer views can still become large if data derivation and layout policy stay inline too long.
- Some main runtime modules are still JavaScript, so TypeScript conversion remains a follow-up hardening path.

## Current status (2026-05-09)

Already in place:

- electron-vite separate `main / preload / renderer` build
- desktop main `core / application / infrastructure` organization
- content root selection and recent workspace persistence in Electron main
- directory browsing, document loading, asset reads, search, and watcher refresh through IPC-backed flows
- renderer `HashRouter` + React Query data flow
- desktop shell UI, command palette, shortcut help, refresh status, reader layout controls
- main-process regression tests for launch/content-root/watcher/application behavior

Recently prioritized cleanup:

1. Continue practical renderer structure cleanup.
2. Keep README and architecture docs aligned with the implemented desktop-first structure.
3. Resume larger feature work such as `.memo` persistence after boundaries are clearer.

## Remaining candidates

- Convert remaining desktop main runtime modules from JavaScript to TypeScript.
- Remove the `sync-main-runtime.mjs` compatibility copy step once the main runtime is fully electron-vite friendly.
- Tighten IPC request/response naming and error payload consistency.
- Add renderer integration smoke coverage for route restore, content root switching, and IPC-backed query flows.
- Add packaged-app smoke coverage for launch/open/browse/read/search/annotation draft paths.

## Related docs

- [`platform-boundaries.md`](./platform-boundaries.md)
- [`desktop-cache-strategy.md`](./desktop-cache-strategy.md)
- [`desktop-packaging.md`](./desktop-packaging.md)
- [`markdown-source-render-mapping.md`](./markdown-source-render-mapping.md)
- [`split-view-editor-preview-plan.md`](./split-view-editor-preview-plan.md)
