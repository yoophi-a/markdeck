# `.파일명.memo` draft

## Naming
For a markdown document:

- source: `docs/guide.md`
- sidecar memo: `guide.md.memo`

This keeps the memo adjacent to the source while avoiding markdown parser confusion.

## File shape
The memo stores annotation additions as a diff-like operation list.

```json
{
  "version": 1,
  "documentPath": "docs/guide.md",
  "sourceUpdatedAt": "2026-03-13T02:40:00.000Z",
  "strategy": "annotation-diff",
  "operations": [
    {
      "op": "add",
      "annotation": {
        "id": "...",
        "kind": "comment",
        "createdAt": "...",
        "updatedAt": "...",
        "anchor": {
          "kind": "text-range",
          "blockId": "block-12",
          "quote": "이 문단은 더 짧게 줄여도 됩니다",
          "occurrence": 0,
          "prefix": "설계 초안에서는 ",
          "suffix": " 같은 톤으로 정리"
        },
        "color": "yellow",
        "comment": "핵심만 남기고 축약해 주세요."
      }
    }
  ]
}
```

## Why operation list instead of full rewritten markdown
- source markdown stays untouched
- annotations can be tracked, merged, or squashed independently
- future save logic can append operations first, then compact them later

## Mapping rules
- `highlight` → `text-range` anchor + color metadata
- `comment` → `text-range` anchor + reviewer text
- `deletion` → `block` anchor + optional reason

## Source drift handling
Current minimal strategy:
- first match by `blockId`
- then resolve by `quote + occurrence`
- if block content changed, `prefix/suffix` can help recover in future revisions

This is intentionally small but already implementable in MarkDeck UI + future desktop save/load flow.
