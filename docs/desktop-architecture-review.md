# Desktop architecture review

## 1st phase: Electron wraps the current web app

### Pros

- fastest path to a usable desktop app
- existing routing / markdown rendering / search code stays intact
- low-risk migration from current web-first structure

### Cons

- desktop runtime still feels like a small local web stack
- content root changes currently restart the dev web process
- filesystem/search logic still lives on the web/server side

## Long-term options

### Option A. Keep Next.js-driven local server inside desktop

**Good for**
- fastest delivery
- reuse of current app/router code
- minimal rewrite cost

**Trade-offs**
- desktop app depends on embedded local server behavior
- packaging/runtime complexity stays higher

### Option B. Hybrid desktop architecture

Move filesystem/search/document-loading logic into Electron main, and let renderer focus on UI only.

**Good for**
- more natural desktop boundary
- content root and file access become first-class desktop capabilities
- better control over caching, indexing, and security boundaries

**Trade-offs**
- requires API bridge design between renderer and main
- more refactoring around routes/data fetching

### Option C. Static renderer + Electron-only backend bridge

Replace server-driven document reads with IPC/data APIs, and keep the renderer as a client app.

**Good for**
- closest to a serverless desktop experience
- packaging can become simpler in the long run

**Trade-offs**
- largest migration cost
- markdown/document/search flow needs redesign

## Recommended path

1. **Done**: move content root selection, file reads, directory traversal, search indexing, and asset reads behind Electron main/preload IPC.
2. **Now**: keep the Electron + electron-vite renderer boundary stable while cleaning renderer route/view/widget/helper structure.
3. **Next**: add `.memo` persistence and richer feedback workflows on top of the existing main/preload/renderer contract.
4. **Later**: evaluate deeper desktop-native packaging, release, and OS integration polish.

## Current status (2026-07-28)

The desktop path has moved past the initial Electron-wraps-web migration:

- content root selection/persistence lives in Electron main
- desktop browse refresh can load directory entries through Electron IPC
- desktop document refresh can load markdown content, sibling tree data, and known markdown paths through Electron IPC
- asset reads and search queries also go through the desktop IPC boundary
- renderer route state uses `HashRouter`, while async desktop data is coordinated through React Query
- renderer route/data-flow/state helpers now have lightweight Node test coverage

So the current model is intentionally **desktop-first with a client renderer**:

- main process: local filesystem, content root, watcher, search, asset reads, desktop lifecycle
- preload: typed `markdeckDesktop` bridge
- renderer: route state, query state, document/review UI, local view-state helpers

This keeps filesystem access out of React components and leaves larger reviewer features to build on top of a clearer boundary.

## Remaining architecture candidates

- convert remaining JavaScript main runtime modules to TypeScript when it reduces risk
- remove the `sync-main-runtime.mjs` compatibility copy step once the main runtime is fully electron-vite friendly
- audit preload API surface and IPC error payload consistency
- define `.memo` file IO and annotation conflict handling inside the existing desktop contract

This keeps the current 1차 Electron 방향을 유지하면서도, 장기적으로는 서버를 별도로 느끼지 않는 구조로 갈 수 있는 이행 경로를 남깁니다.
