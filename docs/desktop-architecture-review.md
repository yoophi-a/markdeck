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

1. **Now**: keep Electron wrapping the current web app.
2. **Next**: move content root selection, file reads, directory traversal, and search indexing into Electron main.
3. **Later**: evaluate whether the renderer can become fully serverless/hybrid without a Next server.

## Migration candidates for Electron main

- content root persistence
- directory listing
- markdown file reads
- asset reads
- search indexing / query execution

This keeps the current 1차 Electron 방향을 유지하면서도, 장기적으로는 서버를 별도로 느끼지 않는 구조로 갈 수 있는 이행 경로를 남깁니다.
