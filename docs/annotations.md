# MarkDeck annotations draft

## Goal
MarkDeck adds a lightweight feedback layer on top of markdown documents.
The minimum supported annotation kinds are:

- `highlight`: keep this passage, but call it out visually
- `comment`: attach reviewer feedback to a text selection
- `deletion`: mark a paragraph/block as a removal candidate

## Anchor model

### 1. Text range anchor
Used by `highlight` and `comment`.

```ts
{
  kind: 'text-range',
  blockId: string,
  quote: string,
  occurrence: number,
  prefix?: string,
  suffix?: string,
}
```

Design notes:
- `blockId` narrows the search scope to one rendered markdown block.
- `quote` is the normalized selected text.
- `occurrence` disambiguates repeated phrases inside the same block.
- `prefix` / `suffix` are optional recovery hints when the source shifts slightly.

### 2. Block anchor
Used by `deletion`.

```ts
{
  kind: 'block',
  blockId: string,
}
```

Design notes:
- delete-mark UX is naturally block-first in markdown preview.
- paragraph / list item / blockquote / code block can all map to a stable preview block id.

## Annotation model

```ts
highlight  -> { kind: 'highlight', color: 'yellow' }
comment    -> { kind: 'comment', color: 'yellow', comment: string }
delete     -> { kind: 'deletion', reason?: string }
```

Shared fields:
- `id`
- `createdAt`
- `updatedAt`
- `anchor`

## Rendering rules
- highlight/comment may coexist on the same block.
- comment reuses highlight visuals plus a comment summary in side panel/share view.
- deletion is block-level and should visually overpower highlight because it signals removal intent.

## Why this shape
- small enough for localStorage + side-panel draft UI
- serializable into a separate `.memo` sidecar
- tolerant to markdown re-rendering because anchors depend on block + quote, not fragile DOM node indices
