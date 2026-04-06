# Platform boundaries

MarkDeck now runs as a **desktop-first Electron app** with an `electron-vite` renderer. Filesystem access stays in Electron main and the renderer talks only through preload IPC.

## Layers

### Shared

Location examples:

- `apps/desktop/src/renderer/src/shared/lib/content-types.ts`
- `apps/desktop/src/renderer/src/shared/lib/content-links.ts`
- `apps/desktop/src/renderer/src/shared/lib/markdown.ts`
- `apps/desktop/src/renderer/src/shared/lib/assets.ts`

Rules:

- pure data shapes and pure string/markdown/path helpers only
- no `window`, Electron IPC, `fs`, or Next route handlers here
- safe to use from renderer components and desktop IPC payloads

### Desktop renderer adapter

Location:

- `apps/desktop/src/renderer/src/platform/desktop/renderer/desktop-api.ts`
- `apps/desktop/src/renderer/src/platform/desktop/renderer/desktop-queries.ts`

Rules:

- renderer never touches `fs` directly
- renderer reads content only through preload-exposed IPC
- route state and query state stay on the renderer side

### Desktop main / preload

Location:

- `apps/desktop/src/main/index.js`
- `apps/desktop/src/preload/index.js`
- `apps/desktop/main/**/*`

Rules:

- renderer never touches Node/fs directly
- renderer calls preload API
- Electron main owns content root persistence and local filesystem reads

## Current flow

- electron-vite loads the renderer from `src/renderer`
- preload exposes the `markdeckDesktop` bridge
- Electron main handles content root, watcher, search, and local file reads
- renderer updates route/query state entirely on the client via `HashRouter` + React Query

## Migration guideline

When adding new content access behavior:

1. put reusable shapes/helpers in **shared**
2. put renderer-side access in **desktop renderer adapter**
3. put filesystem / OS access in **Electron main or preload**
4. avoid importing Node-only code into renderer components

## Near-term follow-up

- keep renderer route/view code independent from Electron internals
- keep search/indexing and asset loading behind the same IPC boundary
- move any remaining legacy `main/*` internals under `src/main` when the churn is worth it
