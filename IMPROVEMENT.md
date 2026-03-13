# IMPROVEMENT.md

## Improvement Notes

### Annotation / review experience
- Consider a more explicit review mode toggle for document preview
- Consider resolved/unresolved state for comments and deletion marks
- Consider color variants or severity levels for highlights
- Consider keyboard-first annotation flow for desktop reviewers

### Sharing
- Consider shareable feedback text templates
- Consider export formats beyond raw `.memo` preview
- Consider generating reviewer-friendly summaries from annotations

### Persistence model
- Current `.memo` direction is promising, but needs validation against real document changes
- Diff-based sidecar design should stay human-readable where possible
- File IO should live in Electron main and not renderer

### Technical follow-up
- Continue reducing renderer assumptions about source loading
- Keep IPC contracts explicit and typed
- Keep React Query as the main async state layer for desktop data flows
