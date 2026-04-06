# TODO.md

## Next Likely Priorities

### Annotation persistence
- [ ] Save `.memo` sidecar files from desktop app
- [ ] Load `.memo` sidecar files when opening a markdown document
- [ ] Connect annotation draft state to real file persistence

### Anchor resilience
- [ ] Implement anchor drift recovery when source markdown changes
- [ ] Improve text-range reattachment logic using quote/prefix/suffix heuristics
- [ ] Define fallback behavior when an annotation can no longer be anchored

### Feedback workflow
- [ ] Improve feedback export/share view
- [ ] Add richer metadata to annotations (author, createdAt, updatedAt)
- [ ] Decide whether comments need thread/reply structure

### UX polish
- [ ] Improve annotation selection UX for edge cases across complex markdown structures
- [ ] Add smoother navigation from panel item -> annotated position
- [ ] Improve delete mark discoverability and reversibility

### Desktop runtime architecture
- [ ] Convert `apps/desktop/src/main/app`, `application`, `core`, and `infrastructure` runtime modules from JavaScript to TypeScript
- [ ] Remove the `sync-main-runtime.mjs` compatibility copy step by making the Electron main runtime fully TypeScript/ESM-friendly for `electron-vite`
- [ ] Revisit main-process module boundaries after TypeScript migration and simplify any remaining legacy `desktop-main-*` naming
