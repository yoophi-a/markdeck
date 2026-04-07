# Markdown Source to Render Mapping

## Goal

MarkDeck에서 markdown 원문과 렌더링된 HTML 결과를 안정적으로 연결해서, 이후 annotation, edit suggestion, source patch generation, re-anchoring에 활용할 수 있도록 하는 설계 메모입니다.

핵심 목표는 다음과 같습니다.

- markdown 원문의 line 번호와 text range를 추적한다
- 현재 렌더링된 HTML 요소와 source span을 연결한다
- block annotation과 text selection annotation을 모두 지원한다
- 이후 원문 변경이 생겨도 annotation을 최대한 다시 붙일 수 있게 한다

---

## Recommendation

가장 권장하는 방식은 **markdown AST의 position 정보를 기반으로 source span이 포함된 중간 document model을 만들고**, 그 정보를 DOM의 `data-*` attribute와 selection mapping에 연결하는 것입니다.

즉, 단순히 렌더된 DOM에서 line 번호를 추론하는 방식보다,

1. markdown parse 단계에서 source 위치를 확보하고
2. render 단계에서 source metadata를 유지하고
3. annotation/edit 단계에서 DOM -> source 역참조를 수행하는 구조

가 훨씬 안정적입니다.

---

## Why line numbers alone are not enough

line 번호만 저장하는 방식은 구현은 쉽지만 다음 문제가 있습니다.

- 한 줄 안에 여러 inline element가 존재할 수 있음
- 공백/줄바꿈 변경에 매우 취약함
- 같은 줄에서 동일 텍스트가 여러 번 등장할 수 있음
- edit suggestion이나 patch generation에 필요한 정확도가 부족함

그래서 최소한 다음 정보를 함께 가져가는 것이 좋습니다.

- line range
- character offset range
- selected quote text
- 가능하면 prefix / suffix context

---

## Core data model

### Source span

```ts
type SourceSpan = {
  startLine: number
  endLine: number
  startOffset: number
  endOffset: number
}
```

### Render anchor

```ts
type RenderAnchor = {
  nodeId: string
  sourceSpan: SourceSpan
  textQuote?: string
  path?: number[]
}
```

렌더된 HTML 요소에는 다음과 같은 metadata를 넣는 방향을 권장합니다.

```html
<div
  data-node-id="paragraph-12"
  data-source-start-line="42"
  data-source-end-line="45"
></div>
```

---

## Block vs text annotations

이 둘은 분리해서 설계하는 것이 좋습니다.

### Block annotation

대상 예시:

- heading
- paragraph
- list item
- code block
- blockquote

권장 anchor:

```ts
type BlockAnchor = {
  blockId: string
  startLine: number
  endLine: number
}
```

block annotation은 stable block id 중심으로 가는 편이 좋습니다.

### Text annotation

대상 예시:

- highlight
- inline comment
- strike

권장 anchor:

```ts
type TextAnchor = {
  blockId: string
  startOffset: number
  endOffset: number
  quote: string
  prefix?: string
  suffix?: string
}
```

이 방식은 원문이 조금 바뀌어도 quote/prefix/suffix 기반 재부착이 가능해서 더 강합니다.

---

## Recommended pipeline

### 1. Parse markdown and keep AST position data

`remark` 계열 parser를 사용할 경우 각 노드의 `position` 정보를 활용할 수 있습니다.

예:

- `node.position.start.line`
- `node.position.end.line`
- `node.position.start.offset`
- `node.position.end.offset`

이 정보를 잃지 말고 다음 단계로 전달해야 합니다.

### 2. Build a renderable intermediate model

렌더링 전에 source span이 포함된 중간 document model을 두는 것을 권장합니다.

예:

```ts
type RenderableBlock = {
  id: string
  type: 'paragraph' | 'heading' | 'code' | 'blockquote' | 'list-item'
  sourceSpan: SourceSpan
  children: RenderableInline[]
}
```

이 중간층이 있으면 이후 다음 작업이 쉬워집니다.

- annotation anchor 생성
- selection 역매핑
- source patch generation
- scroll sync
- document diff/re-anchoring

### 3. Preserve source metadata in rendered DOM

render 시 block 또는 text segment 수준으로 `data-*` 속성을 심습니다.

예:

- `data-node-id`
- `data-block-id`
- `data-source-start-line`
- `data-source-end-line`

필요하다면 text segment 단위로 더 세밀한 metadata를 둘 수 있습니다.

### 4. Map DOM selection back to source anchors

사용자 selection은 DOM Range로 들어오기 때문에, 이를 source 기준 anchor로 바꾸는 로직이 필요합니다.

---

## DOM selection mapping strategies

### Option A. Render text segment map (recommended long term)

렌더링 시 텍스트 fragment마다 source 범위를 저장합니다.

```ts
type RenderTextSegment = {
  nodeId: string
  domPath: string
  sourceStart: number
  sourceEnd: number
  renderedText: string
}
```

selection이 발생하면:

1. selection이 걸친 text node를 찾고
2. 해당 segment를 조회하고
3. source offset range를 합산해서 계산합니다.

장점:

- 가장 정밀함
- inline formatting이 많아도 견고함
- edit suggestion으로 확장하기 좋음

단점:

- 구현 복잡도가 더 높음

### Option B. Block-level text alignment (recommended short term)

block 단위 source text와 rendered plain text를 비교해서 selection을 역매핑합니다.

장점:

- 구현이 단순함
- 빠르게 첫 버전을 만들기 좋음

단점:

- emphasis/link/code/soft break 등 edge case에서 약할 수 있음

실전적으로는:

- 먼저 block-level map으로 시작하고
- 이후 text segment map으로 확장

하는 접근을 추천합니다.

---

## Annotation and edit unified model

annotation뿐 아니라 edit suggestion까지 고려하면 source anchor를 조금 더 일반화하는 편이 좋습니다.

```ts
type SourceAnchor =
  | {
      kind: 'block'
      blockId: string
      startLine: number
      endLine: number
    }
  | {
      kind: 'text'
      blockId: string
      startOffset: number
      endOffset: number
      quote: string
      prefix?: string
      suffix?: string
    }
```

edit suggestion은 다음처럼 확장할 수 있습니다.

```ts
type SuggestedEdit = {
  anchor: SourceAnchor
  operation: 'replace' | 'insert-before' | 'insert-after' | 'delete'
  proposedText: string
}
```

이렇게 해두면:

- annotation
- review comment
- suggested patch
- source rewrite

를 하나의 anchor 모델 위에서 다룰 수 있습니다.

---

## Re-anchoring strategy

원문 markdown가 바뀌면 기존 annotation이 정확히 같은 위치를 잃을 수 있습니다.

권장 순서는 다음과 같습니다.

1. blockId 기반 매칭 시도
2. offset range 기반 매칭 시도
3. quote match 시도
4. prefix/suffix heuristic 시도
5. 실패 시 orphan annotation으로 보관

이 전략은 이후 `.memo` persistence나 external edit 대응에 중요합니다.

---

## Suggested implementation phases

### Phase 1. Block source map

먼저 다음 block에 대해 source map을 붙입니다.

- heading
- paragraph
- list item
- code block
- blockquote

각 block에 대해:

- `blockId`
- `startLine`, `endLine`
- source excerpt

를 관리하고 DOM에 `data-block-id`를 심습니다.

이 단계만으로도 다음이 가능해집니다.

- block comment
- block delete mark
- block-level edit
- block navigation

### Phase 2. Text selection anchor

그 다음 text selection용 anchor를 추가합니다.

- `quote`
- `prefix`
- `suffix`
- block 내부 offset

이 단계에서 다음 기능의 정확도가 올라갑니다.

- highlight
- inline comment
- strike
- precise edit suggestions

### Phase 3. Re-anchoring and conflict handling

원문 수정 이후 다시 annotation을 붙이는 로직을 넣습니다.

이 단계에서:

- external file edit
- watcher refresh
- stale memo recovery

까지 대응할 수 있게 됩니다.

---

## Where this likely fits in MarkDeck

현재 구조 기준으로는 다음 위치가 유력합니다.

- parser / mapping logic: `shared/lib/markdown.ts` 주변 또는 별도 parsing module
- render integration: `widgets/document` 및 markdown rendering layer
- annotation anchor model: `shared/lib` 또는 별도 domain-oriented module

중요한 점은 parser 결과를 바로 React element로만 소비하지 말고,
**source metadata를 유지하는 intermediate model**을 두는 것입니다.

---

## Practical conclusion

가장 좋은 방향은 다음과 같습니다.

- markdown AST의 `position` 정보를 기반으로 source span 확보
- block id + source span + quote metadata 유지
- 렌더된 DOM에 `data-*` attribute로 anchor 연결
- selection은 DOM Range에서 source anchor로 역매핑
- 이후 annotation, edit, persistence, re-anchoring까지 같은 모델 위에서 처리

즉,

**line 번호만으로 처리하지 말고, block id + offset range + text quote 조합으로 설계하는 것이 가장 현실적이고 확장성이 좋습니다.**
