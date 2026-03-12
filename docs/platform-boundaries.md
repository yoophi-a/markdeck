# Platform boundaries

MarkDeck currently keeps a **web-first UI** and a **desktop wrapper**, but the file access boundary is now being made explicit.

## Layers

### Shared

Location examples:

- `apps/web/src/shared/lib/content-types.ts`
- `apps/web/src/shared/lib/content-links.ts`
- `apps/web/src/shared/lib/markdown.ts`
- `apps/web/src/shared/lib/assets.ts`

Rules:

- pure data shapes and pure string/markdown/path helpers only
- no `window`, Electron IPC, `fs`, or Next route handlers here
- safe to use from both server and client components

### Web-only adapter

Location:

- `apps/web/src/platform/web/server/content-fs.ts`

Rules:

- server-only filesystem access for the web/Next runtime
- wraps the existing `fs`-backed content loader
- should stay as the SSR/fallback path while desktop migration continues

### Desktop-only adapter

Location:

- `apps/web/src/platform/desktop/renderer/desktop-api.ts`
- `apps/desktop/main.js`
- `apps/desktop/preload.js`

Rules:

- renderer never touches Node/fs directly
- renderer calls preload API
- Electron main owns content root persistence and local filesystem reads

## Current flow

### Web

- Next server reads filesystem through the web adapter
- pages render from server data directly

### Desktop

- initial render still uses the Next server path
- after hydration, desktop-aware client code may refresh through Electron IPC
- this keeps the current Electron-wraps-web model while gradually moving file reads into Electron main

## Migration guideline

When adding new content access behavior:

1. put reusable shapes/helpers in **shared**
2. put Next/fs access in **web/server adapter**
3. put Electron IPC access in **desktop/renderer adapter + main**
4. avoid importing server-only code into client components

## Near-term follow-up

- move search/indexing behind the same adapter split
- consider asset reads and config reads under the same boundary
- if desktop eventually becomes fully client-driven, the web adapter can remain for SSR/web mode only
