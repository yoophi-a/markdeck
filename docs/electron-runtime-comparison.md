# Electron Runtime Comparison

## Scope

This document compares the current MarkDeck desktop Electron runtime with the Electron runtime used in `/Users/yoophi/private/fluffy-comics/fluffy-comics`.

The focus is limited to:

- Electron boot flow
- `electron-vite` loading model
- main / preload / renderer entry structure
- hexagonal architecture boundaries in the main process

## Common Ground

Both projects now share the same high-level Electron loading model.

1. Both use `electron-vite` as the single build and dev entrypoint.
2. Both use the standard three-part Electron layout:
   - `src/main`
   - `src/preload`
   - `src/renderer`
3. Both use `electron-vite --watch` for development.
4. Both load `process.env.ELECTRON_RENDERER_URL` in development and `../renderer/index.html` in production.
5. Both expose renderer-safe APIs through `contextBridge` in preload.
6. Both initialize `react-grab` only in renderer development mode.

## Current MarkDeck Structure

MarkDeck now places the Electron main runtime under `apps/desktop/src/main`:

- app bootstrap:
  - `apps/desktop/src/main/app/create-markdeck-desktop-runtime.js`
- application services / use cases:
  - `apps/desktop/src/main/application/*`
- core rules and contracts:
  - `apps/desktop/src/main/core/*`
- port validation:
  - `apps/desktop/src/main/core/ports/create-desktop-main-ports.js`
- infrastructure adapters:
  - `apps/desktop/src/main/infrastructure/electron/*`
  - `apps/desktop/src/main/infrastructure/node/*`

This is materially closer to a hexagonal layout than the previous `apps/desktop/main/*` arrangement.

## fluffy-comics Structure

`fluffy-comics` uses a cleaner and more explicit `src/main` layout:

- main entry:
  - `src/main/index.ts`
- core ports:
  - `src/main/core/ports/*`
- infrastructure adapters:
  - `src/main/infrastructure/filesystem/*`
- domain/application code:
  - feature-oriented modules such as `src/main/comics/*`

Its main process organization is more compact and more obviously centered around the `src/main` tree.

## Key Differences

### 1. Bootstrap location and runtime style

MarkDeck:

- keeps a dedicated runtime factory in:
  - `apps/desktop/src/main/app/create-markdeck-desktop-runtime.js`
- uses a composed service object (`createMarkdeckDesktopService`) plus a runtime wrapper

fluffy-comics:

- keeps most boot behavior directly in:
  - `src/main/index.ts`
- uses a thinner top-level boot file with direct wiring of Electron events and IPC

Impact:

- MarkDeck is more layered at startup.
- fluffy-comics is easier to scan from the single main entrypoint.

### 2. Naming and boundary clarity

MarkDeck:

- still contains legacy-oriented naming such as:
  - `desktop-main-*`
  - `markdeck:*` IPC channels
- separates `application`, `core`, and `infrastructure`, but some names still reflect the older layout

fluffy-comics:

- uses names aligned to features and ports from the start
- has less “migration residue” in naming

Impact:

- MarkDeck’s structure is now sound, but naming is not fully normalized yet.

### 3. Use-case organization

MarkDeck:

- organizes main-process behavior around desktop shell operations:
  - content root selection
  - document browsing/search
  - refresh orchestration
  - launch-target routing

fluffy-comics:

- organizes main-process behavior around domain features:
  - comic listing
  - episode download
  - archive store access
  - viewer settings

Impact:

- MarkDeck is app-shell oriented.
- fluffy-comics is domain-feature oriented.

### 4. Port placement

MarkDeck:

- now has ports at:
  - `apps/desktop/src/main/core/ports/create-desktop-main-ports.js`
- uses a port normalization layer to validate adapter contracts before use

fluffy-comics:

- uses explicit port interfaces such as:
  - `src/main/core/ports/AppPathResolver.ts`
  - `src/main/core/ports/ComicHtmlArchiveStore.ts`

Impact:

- MarkDeck currently has one aggregated port boundary around desktop runtime collaborators.
- fluffy-comics defines narrower, more domain-specific ports.

### 5. Infrastructure shape

MarkDeck:

- infrastructure is split by platform dependency:
  - `infrastructure/electron`
  - `infrastructure/node`

fluffy-comics:

- infrastructure is grouped more by technical responsibility, for example:
  - `infrastructure/filesystem`

Impact:

- MarkDeck’s structure is valid, but less domain-oriented than fluffy-comics.

### 6. Entry implementation language

MarkDeck:

- main and preload entries are still JavaScript:
  - `apps/desktop/src/main/index.js`
  - `apps/desktop/src/preload/index.js`

fluffy-comics:

- main and preload entries are TypeScript:
  - `src/main/index.ts`
  - `src/preload/index.ts`

Impact:

- MarkDeck still has weaker type guarantees at the runtime edges.

### 7. Electron toolkit usage

MarkDeck:

- uses plain Electron APIs and custom wrappers
- does not depend on `@electron-toolkit/utils` or `@electron-toolkit/preload`

fluffy-comics:

- uses `@electron-toolkit/utils`
- uses `@electron-toolkit/preload`

Impact:

- MarkDeck has fewer framework dependencies.
- fluffy-comics gets more standardized utility behavior out of the box.

## What Has Already Been Aligned

Compared with the earlier MarkDeck desktop code, the following has already been aligned toward the fluffy-comics model:

1. Electron now boots from `apps/desktop/src/main/index.js`.
2. Preload now lives under `apps/desktop/src/preload/index.js`.
3. Renderer now lives under `apps/desktop/src/renderer/*`.
4. `electron-vite` is the single dev/build entrypoint.
5. Main-process architecture now lives under `src/main` instead of a legacy top-level `main` folder.
6. The old `apps/web` app has been absorbed into `apps/desktop`.

## Remaining Gaps To Reach fluffy-comics More Closely

If MarkDeck should move even closer to the fluffy-comics style, these are the next candidates:

1. Convert `apps/desktop/src/main/index.js` and `apps/desktop/src/preload/index.js` to TypeScript.
2. Rename the aggregated `desktop-main-*` modules into simpler feature or service names.
3. Replace the single aggregated port factory with narrower domain-specific ports.
4. Move tests closer to `src/main` modules instead of keeping them at the package root.
5. Optionally flatten some runtime wiring from `create-markdeck-desktop-runtime.js` into `src/main/index.ts` if a thinner boot layer is preferred.

## Recommendation

The current MarkDeck structure is now close enough to the fluffy-comics direction to be considered an Electron-first hexagonal baseline.

The biggest remaining differences are not the loading model anymore. They are:

1. JavaScript vs TypeScript at the runtime boundary
2. aggregated desktop service naming vs feature/domain naming
3. broad runtime ports vs narrower domain-specific ports

Those changes can be done incrementally without changing the renderer architecture again.
