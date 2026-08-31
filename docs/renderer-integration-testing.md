# Renderer integration testing

## Goal

Renderer tests should protect the desktop client flows that are most likely to regress while MarkDeck keeps moving filesystem behavior into Electron main.

Near-term smoke coverage should focus on:

1. **Route state**: `HashRouter` path/search helpers, browse/document/search route parsing, and route reset behavior after content root changes.
2. **Content root switching**: renderer mutations should reset the route to `/`, update the content root cache, and invalidate content/search/asset query groups.
3. **IPC-backed query flows**: document pages should fetch document content, known document paths, and sidebar tree data through the desktop renderer adapter rather than touching filesystem code directly.

## Current lightweight harness

The project currently uses Node's built-in test runner via:

```bash
pnpm --filter @markdeck/desktop test
```

For pure renderer helpers, add colocated `*.test.ts` files and import the helper with a relative `.ts` extension. Node 22 can execute these tests directly. TypeScript app typechecking excludes `*.test.ts` files because the app build does not enable `allowImportingTsExtensions`.

Example currently covered:

- `apps/desktop/src/renderer/src/shared/lib/app-routes.test.ts`
  - verifies desktop app href normalization
  - verifies `/desktop#...` HashRouter link generation
  - verifies browse/document/search route parsing and decoding

## Next harness step

For React Query + mutation smoke tests, add a small renderer test harness that can provide:

- a fake `window.markdeckDesktop` preload bridge
- a `QueryClient` instance
- route/hash assertions around content root changes

Candidate tests:

- `useChooseDesktopContentRootMutation` resets `window.location.hash` to `/` and invalidates desktop content query groups.
- `useDesktopDocumentPageQuery` composes `readDesktopMarkdownDocument`, `collectDesktopMarkdownRelativePaths`, and `buildDesktopDocumentTree` for the selected relative path.
- search queries stay disabled for blank search text.

If the project adds a DOM test runner later, prefer Vitest + jsdom or Playwright component-level smoke tests. Until then, keep renderer tests pure and close to shared/adapter helpers.
