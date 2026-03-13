# Desktop cache strategy

## Current cache layers

MarkDeck desktop now keeps cache ownership in **Electron main** so renderer/query cache only handles view state.

### 1. Search index cache

- built from markdown documents under the configured content root
- stores normalized search haystack + document metadata
- invalidated when the content root changes or watcher reports markdown-affecting changes
- search query results are memoized separately on top of the index

### 2. Document cache

- keyed by markdown relative path
- reuses parsed payload while `mtimeMs` and `size` match
- invalidated on watcher updates for the path or on root switch

### 3. Asset cache

- keyed by relative asset path
- reuses base64 payload while `mtimeMs` and `size` match
- invalidated on watcher updates for the path or on root switch

## Invalidation rules

- **content root change** → clear every main-process cache and restart watcher
- **watcher event with file path** → drop matching document/asset entries and clear search result memoization
- **watcher event without reliable path** → full cache reset for correctness
- **renderer query cache** follows main invalidation events via the desktop event bridge

## Why this split

- main process owns filesystem truth and invalidation
- renderer keeps React Query for UX/loading reuse only
- web compatibility remains intact without reintroducing server-first cache ownership

## Follow-up candidates

- bound total memory usage for large binary asset caches
- add selective directory/tree cache if browse cost becomes noticeable
- persist search index snapshots between launches if cold-start time becomes meaningful
