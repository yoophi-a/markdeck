# TODO.md

## Recommended next direction

### Current priority
- [ ] Do one more renderer structure cleanup pass after the first practical FSD refactor
- [ ] Update README / architecture docs to match the latest renderer and desktop main structure
- [ ] Only after that, resume larger feature work such as annotation persistence / feedback sharing / translation helpers

### Why this is the current recommendation
- desktop main is already in a relatively stable state after hexagonal refactors and test expansion
- renderer is still the area most likely to become expensive if structure cleanup is delayed
- future feedback/annotation features will be cheaper to add after renderer boundaries are clearer

## Electron Desktop App Improvements

### Packaging and distribution
- [ ] Establish a stable macOS release pipeline including signing, notarization, and artifact verification
- [ ] Validate packaged app behavior on a clean machine, especially first launch, file-open, and recent workspace restore flows
- [ ] Add version/update strategy documentation, including how desktop releases will be published and upgraded

### Main/preload/renderer boundaries
- [ ] Convert remaining desktop main runtime modules from JavaScript to TypeScript for stronger contracts and safer refactoring
- [ ] Remove the `sync-main-runtime.mjs` compatibility copy step by making the Electron main runtime fully `electron-vite` friendly
- [ ] Audit preload surface area and keep only the minimum IPC API needed by renderer
- [ ] Review IPC request/response contracts for naming consistency, type safety, and error payload shape

### File system and workspace UX
- [ ] Improve content root onboarding flow for first-time users opening the app without a workspace
- [ ] Clarify differences between opening a folder and opening a single markdown file, including fallback behaviors
- [ ] Strengthen invalid path, missing file, and permission-denied handling across desktop launch flows
- [ ] Add better recovery UX when a previously opened recent workspace is no longer available

### Reliability and state restoration
- [ ] Expand session restore behavior for last opened document, navigation state, and reader panel state after relaunch
- [ ] Define watcher failure/reconnect behavior when files are changed, removed, or moved externally
- [ ] Add explicit offline/local-only assumptions to avoid desktop UX ambiguity around network expectations
- [ ] Ensure single-instance handoff behavior is reliable when opening files/directories via Finder or CLI while the app is already running

### Error handling and observability
- [ ] Add structured logging strategy for main process, preload bridge failures, and renderer query errors
- [ ] Define user-visible desktop error states for file read failure, search failure, asset load failure, and IPC failure
- [ ] Add crash/debug guidance for development and packaged builds, including where logs are stored

### Desktop-native UX polish
- [ ] Review app menu roles, keyboard shortcuts, and platform conventions from a real macOS desktop app perspective
- [ ] Improve empty states, loading states, and fallback screens so the app feels native rather than web-wrapped
- [ ] Revisit drag-and-drop support for folders, markdown files, and attachments into the desktop app
- [ ] Consider deeper OS integration such as "Open with MarkDeck", dock behavior, and file association strategy

### Search and performance
- [ ] Measure search/indexing performance on large markdown vaults and document practical limits
- [ ] Add incremental refresh/performance safeguards when many files change at once
- [ ] Review renderer performance for large markdown documents, heavy annotation overlays, and mermaid/code block rendering

### Annotation persistence on desktop
- [ ] Save `.memo` sidecar files from the desktop app
- [ ] Load `.memo` sidecar files when opening a markdown document
- [ ] Connect annotation draft state to real desktop file persistence
- [ ] Define conflict handling when markdown content and memo anchors diverge after external edits

### Testing strategy for desktop product quality
- [ ] Keep main-process regression tests expanding alongside runtime refactors
- [ ] Add renderer integration tests for route restore, content root switching, and IPC-backed query flows
- [ ] Add smoke tests for packaged-app critical paths: launch, open folder, open file, browse, read, search, and annotation draft
- [ ] Define a lightweight manual QA checklist for every desktop release
