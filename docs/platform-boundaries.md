# Platform boundaries

MarkDeck now runs as a **desktop-first Electron app** built with `electron-vite`.
Filesystem and OS access stay in Electron main; the renderer talks through the preload IPC bridge and keeps UI/query state client-side.

## Runtime layers

### Electron main

Location:

- `apps/desktop/src/main/index.ts`
- `apps/desktop/src/main/core/*`
- `apps/desktop/src/main/application/*`
- `apps/desktop/src/main/infrastructure/electron/*`
- `apps/desktop/src/main/infrastructure/node/*`

Responsibilities:

- own content root persistence, recent roots, launch target handling, and watcher lifecycle
- read local markdown/assets and execute search through Node-side infrastructure
- expose use-case oriented IPC handlers instead of leaking filesystem primitives
- keep pure rules in `core`, orchestration in `application`, and side effects in `infrastructure/*`

### Preload

Location:

- `apps/desktop/src/preload/index.ts`

Responsibilities:

- expose the minimum `markdeckDesktop` bridge used by the renderer
- keep IPC channel names and payload shapes explicit
- avoid exposing raw Electron or Node APIs to renderer code

### Desktop renderer adapter

Location:

- `apps/desktop/src/renderer/src/platform/desktop/renderer/desktop-api.ts`
- `apps/desktop/src/renderer/src/platform/desktop/renderer/desktop-queries.ts`
- `apps/desktop/src/renderer/src/platform/desktop/renderer/desktop-router.tsx`
- `apps/desktop/src/renderer/src/platform/desktop/renderer/desktop-shell.tsx`

Responsibilities:

- adapt the preload bridge into typed renderer-facing functions
- own React Query keys/hooks for desktop data access
- own desktop routing/bootstrap concerns such as `HashRouter`
- keep route/query state in the renderer; never import `fs` or Electron main modules

### Renderer UI boundaries

Location examples:

- `apps/desktop/src/renderer/src/views/desktop/*`
- `apps/desktop/src/renderer/src/features/*`
- `apps/desktop/src/renderer/src/widgets/*`
- `apps/desktop/src/renderer/src/shared/*`

Rules:

- `views/desktop/*`: route-level page composition only
- `features/*`: focused feature UI such as search or theme controls
- `widgets/*`: reusable page sections and desktop/document/navigation UI blocks
- `shared/lib`: pure data shapes and helpers only; no `window`, Electron IPC, `fs`, or route components
- `shared/ui`: reusable UI primitives without app-specific data fetching
- `shared/types`: ambient desktop/preload types

## Current desktop data flow

1. `electron-vite` loads main, preload, and renderer from separate entrypoints.
2. Preload exposes the `markdeckDesktop` bridge.
3. Renderer adapter functions call the bridge and wrap the results in React Query hooks.
4. Electron main handles content root, watcher, search, local file reads, and asset reads.
5. Renderer updates route/query/UI state entirely on the client via `HashRouter` + React Query.

## Migration guideline

When adding new content access behavior:

1. Put reusable shapes/helpers in `shared`.
2. Put renderer-side bridge/query access in `platform/desktop/renderer`.
3. Put filesystem, OS, watcher, or process access in Electron main infrastructure.
4. Add application/core helpers when the behavior has reusable policy or orchestration.
5. Avoid importing Node-only code into renderer components.

## Near-term follow-up

- Continue the practical renderer structure cleanup before larger feature work.
- Keep search/indexing and asset loading behind the same IPC boundary.
- Keep IPC request/response names and error payloads consistent.
- Update this document when a new boundary or package-level convention is introduced.
